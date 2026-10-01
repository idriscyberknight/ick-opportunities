import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_SOURCES_PER_RUN = 5;
const VALID_CATS = ["scholarship", "job", "internship", "grant"] as const;

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normLink = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#]+$/, "").trim();

export type DiscoveryResult = {
  sources: { name: string; found: number; added: number; duplicates: number; error: string | null }[];
  stoppedReason: string | null;
};

/**
 * Admin-only: checks active sources (oldest first, bounded per run), extracts
 * opportunities with AI and stores new ones as draft / pending_review.
 */
export const runDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sourceId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<DiscoveryResult> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { fetchPageText, extractOpportunities, GatewayError } = await import(
      "@/lib/ai/discovery.server"
    );

    let q = supabase
      .from("opportunity_sources")
      .select("id, source_name, source_url, source_type")
      .eq("active", true)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(MAX_SOURCES_PER_RUN);
    if (data.sourceId) q = q.eq("id", data.sourceId);
    const { data: sources, error } = await q;
    if (error) throw error;

    // Existing records for duplicate detection (title+organization, or official link).
    const { data: existing } = await supabase
      .from("opportunities")
      .select("title, organization, official_link");
    const keys = new Set((existing ?? []).map((o) => `${norm(o.title)}|${norm(o.organization)}`));
    const links = new Set((existing ?? []).map((o) => normLink(o.official_link)).filter(Boolean));

    const result: DiscoveryResult = { sources: [], stoppedReason: null };

    for (const src of sources ?? []) {
      const entry = { name: src.source_name, found: 0, added: 0, duplicates: 0, error: null as string | null };
      result.sources.push(entry);
      try {
        const text = await fetchPageText(src.source_url);
        const items = await extractOpportunities(text, src.source_url, src.source_type);
        entry.found = items.length;
        const now = new Date().toISOString();
        for (const it of items) {
          const title = it.title?.trim();
          const organization = it.organization?.trim();
          const description = it.description?.trim();
          if (!title || !organization || !description) continue;
          const key = `${norm(title)}|${norm(organization)}`;
          let link: string | null = null;
          try {
            if (it.official_link) link = new URL(it.official_link).toString();
          } catch {
            link = null;
          }
          if (link && !/^https?:/.test(link)) link = null;
          const nl = normLink(link);
          if (keys.has(key) || (nl && links.has(nl))) {
            entry.duplicates++;
            continue;
          }
          const deadline = it.deadline && /^\d{4}-\d{2}-\d{2}$/.test(it.deadline) ? it.deadline : null;
          const category = (VALID_CATS as readonly string[]).includes(it.category) ? it.category : "scholarship";
          const { data: inserted, error: insErr } = await supabase
            .from("opportunities")
            .insert({
              title: title.slice(0, 300),
              organization: organization.slice(0, 200),
              category,
              country: it.country?.trim() || null,
              deadline,
              description: description.slice(0, 2000),
              eligibility: it.eligibility?.trim() || null,
              benefits: it.benefits?.trim() || null,
              official_link: link ?? src.source_url,
              status: "draft",
              verified_status: "pending_review",
              source_id: src.id,
              discovered_at: now,
              created_by: userId,
            })
            .select("id")
            .single();
          if (insErr) continue;
          keys.add(key);
          if (nl) links.add(nl);
          entry.added++;
          await supabase.from("opportunity_audit_logs").insert({
            opportunity_id: inserted.id,
            opportunity_title: title,
            source_id: src.id,
            action: "discovered",
            actor_id: userId,
          });
        }
        await supabase
          .from("opportunity_sources")
          .update({ last_checked_at: now, last_error: null })
          .eq("id", src.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        entry.error = msg;
        await supabase
          .from("opportunity_sources")
          .update({ last_checked_at: new Date().toISOString(), last_error: msg.slice(0, 500) })
          .eq("id", src.id);
        // Credits / access problems affect every source: stop the run.
        if (e instanceof GatewayError && [401, 402, 403].includes(e.status)) {
          result.stoppedReason = msg;
          break;
        }
        if (e instanceof GatewayError && e.status === 429) {
          result.stoppedReason = "AI is busy right now. Try again in a few minutes.";
          break;
        }
      }
    }
    return result;
  });
