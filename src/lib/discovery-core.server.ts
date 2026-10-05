import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { overallRelevance } from "@/lib/relevance";
import {
  extractOpportunities,
  fetchPageText,
  GatewayError,
  SourceFetchError,
} from "@/lib/ai/discovery.server";

const MAX_SOURCES_PER_RUN = 5;
const VALID_CATS = ["scholarship", "job", "internship", "grant"] as const;
type Health = Database["public"]["Enums"]["source_health"];

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normLink = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#]+$/, "").trim();
const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function statusOf(e: unknown, depth = 0): number | null {
  if (!e || typeof e !== "object" || depth > 4) return null;
  const o = e as Record<string, unknown>;
  for (const k of ["statusCode", "status"]) if (typeof o[k] === "number") return o[k] as number;
  for (const k of ["cause", "lastError"]) {
    const s = statusOf(o[k], depth + 1);
    if (s) return s;
  }
  return null;
}

export type DiscoveryResult = {
  runId: string | null;
  sources: { name: string; found: number; added: number; duplicates: number; health: Health; error: string | null }[];
  stoppedReason: string | null;
};

/**
 * Checks active sources (oldest first, bounded per run), extracts opportunities with AI
 * and stores new ones as draft / pending_review. Never publishes. Logs the run.
 */
export async function runDiscoveryCore(
  supabase: SupabaseClient<Database>,
  opts: { actorId: string | null; trigger: "manual" | "scheduled"; sourceId?: string | undefined },
): Promise<DiscoveryResult> {
  const started = Date.now();

  // Close out runs left "running" by a crashed or timed-out worker.
  await supabase
    .from("discovery_runs")
    .update({ status: "failed", finished_at: new Date().toISOString(), stopped_reason: "Run did not finish (interrupted)" })
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - 30 * 60_000).toISOString());

  // Never run two discoveries at once (manual + scheduled could otherwise create duplicate drafts).
  const { count: running, error: runErr } = await supabase
    .from("discovery_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");
  if (runErr) throw runErr;
  if ((running ?? 0) > 0) throw new Error("Another discovery run is in progress. Try again in a few minutes.");
  let q = supabase
    .from("opportunity_sources")
    .select("id, source_name, source_url, source_type")
    .eq("active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SOURCES_PER_RUN);
  if (opts.sourceId) q = q.eq("id", opts.sourceId);
  const { data: sources, error } = await q;
  if (error) throw error;

  // Load every existing record (paged past the 1000-row API limit) for duplicate detection.
  // Fail the run rather than risk inserting duplicates when this read fails.
  const keys = new Set<string>();
  const links = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data: page, error: exErr } = await supabase
      .from("opportunities")
      .select("title, organization, official_link")
      .order("id")
      .range(from, from + 999);
    if (exErr) throw exErr;
    for (const o of page ?? []) {
      keys.add(`${norm(o.title)}|${norm(o.organization)}`);
      const l = normLink(o.official_link);
      if (l) links.add(l);
    }
    if (!page || page.length < 1000) break;
  }

  const { data: run, error: runInsErr } = await supabase
    .from("discovery_runs")
    .insert({ trigger: opts.trigger, actor_id: opts.actorId })
    .select("id")
    .single();
  if (runInsErr || !run) throw runInsErr ?? new Error("Could not start discovery run");
  const runId: string = run.id;

  const result: DiscoveryResult = { runId, sources: [], stoppedReason: null };
  // AI is tried until it fails for credit/access/rate reasons; then the rest of the run uses fallback mode.
  let aiAvailable = true;

  for (const src of sources ?? []) {
    const t0 = Date.now();
    const entry = {
      name: src.source_name,
      found: 0,
      added: 0,
      duplicates: 0,
      health: "healthy" as Health,
      error: null as string | null,
      mode: "ai" as "ai" | "fallback",
    };
    result.sources.push(entry);
    try {
      const { html, text } = await fetchPage(src.source_url);
      let items: Normalized[] | null = null;
      if (aiAvailable && text.length >= 200) {
        try {
          const ai = await extractOpportunities(text, src.source_url, src.source_type);
          items = ai.map((it) => ({
            title: it.title?.trim() ?? "",
            organization: it.organization?.trim() ?? "",
            description: it.description?.trim() ?? "",
            category: (VALID_CATS as readonly string[]).includes(it.category) ? it.category : "scholarship",
            country: it.country?.trim() || null,
            deadline: it.deadline,
            eligibility: it.eligibility?.trim() || null,
            benefits: it.benefits?.trim() || null,
            link: it.official_link,
            scores: {
              nigeria_score: clamp(it.nigeria_score),
              africa_score: clamp(it.africa_score),
              remote_score: clamp(it.remote_score),
              global_score: clamp(it.global_score),
            },
          }));
        } catch (e) {
          const st = e instanceof GatewayError ? e.status : statusOf(e);
          if (st && [401, 402, 403, 429].includes(st)) {
            aiAvailable = false;
            result.stoppedReason =
              st === 402
                ? "AI credits unavailable — remaining sources processed in Fallback Mode."
                : `AI unavailable (${st}) — remaining sources processed in Fallback Mode.`;
          } else {
            console.error("AI extraction failed, using fallback", src.source_name, e);
          }
          items = null;
        }
      }
      if (!items) {
        entry.mode = "fallback";
        items = extractFallback(html, src.source_url).map((f) => ({
          title: f.title,
          organization: src.source_name,
          description: `Found on ${src.source_name} by fallback discovery (no AI). Needs review — verify all details on the official page.`,
          category: guessCategory(f.title, src.source_type),
          country: null,
          deadline: f.deadline,
          eligibility: null,
          benefits: null,
          link: f.link,
          scores: null,
        }));
      }

      entry.found = items.length;
      let incomplete = 0;
      const now = new Date().toISOString();
      for (const it of items) {
        const { title, organization, description } = it;
        if (!title || !organization || !description) {
          incomplete++;
          continue;
        }
        const key = `${norm(title)}|${norm(organization)}`;
        let link: string | null = null;
        try {
          if (it.link) link = new URL(it.link).toString();
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
        const s = it.scores;
        const { data: inserted, error: insErr } = await supabase
          .from("opportunities")
          .insert({
            title: title.slice(0, 300),
            organization: organization.slice(0, 200),
            category: it.category,
            country: it.country,
            deadline,
            description: description.slice(0, 2000),
            eligibility: it.eligibility,
            benefits: it.benefits,
            official_link: link ?? src.source_url,
            ...(s
              ? {
                  ...s,
                  relevance_score: overallRelevance({
                    nigeria: s.nigeria_score,
                    africa: s.africa_score,
                    remote: s.remote_score,
                    global: s.global_score,
                  }),
                }
              : {}),
            status: "draft",
            verified_status: "pending_review",
            source_id: src.id,
            discovered_at: now,
            created_by: opts.actorId,
          })
          .select("id")
          .single();
        if (insErr) {
          console.error("Draft insert failed", src.source_name, insErr.message);
          incomplete++;
          continue;
        }
        keys.add(key);
        if (nl) links.add(nl);
        entry.added++;
        await supabase.from("opportunity_audit_logs").insert({
          opportunity_id: inserted.id,
          opportunity_title: title,
          source_id: src.id,
          action: "discovered",
          actor_id: opts.actorId,
          details: [opts.trigger === "scheduled" ? "Scheduled discovery" : null, entry.mode === "fallback" ? "Fallback Mode (no AI)" : null]
            .filter(Boolean)
            .join(" · ") || null,
        });
      }
      entry.health = items.length === 0 || incomplete > 0 ? "partial" : "healthy";
      if (items.length === 0)
        entry.error =
          entry.mode === "fallback"
            ? text.length < 200
              ? "Page has almost no readable text (likely script-rendered)"
              : "Fallback extraction found no opportunity links"
            : "Page reachable but no opportunities extracted";
      else if (incomplete > 0) entry.error = `${incomplete} item(s) incomplete and skipped`;
      await supabase
        .from("opportunity_sources")
        .update({
          last_checked_at: now,
          last_error: entry.health === "healthy" ? null : entry.error,
          health: entry.health,
          last_found_count: entry.found,
          ...(entry.found > 0 ? { last_success_at: now } : {}),
        })
        .eq("id", src.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      entry.error = msg;
      entry.health = e instanceof SourceFetchError ? e.kind : "error";
      await supabase
        .from("opportunity_sources")
        .update({ last_checked_at: new Date().toISOString(), last_error: msg.slice(0, 500), health: entry.health, last_found_count: 0 })
        .eq("id", src.id);
    }
    if (runId) {
      await supabase.from("discovery_run_sources").insert({
        run_id: runId,
        source_id: src.id,
        source_name: src.source_name,
        started_at: new Date(t0).toISOString(),
        duration_ms: Date.now() - t0,
        found: entry.found,
        added: entry.added,
        duplicates: entry.duplicates,
        health: entry.health,
        error: entry.error?.slice(0, 500) ?? null,
        mode: entry.mode,
      });
    }
  }

  if (runId) {
    const errors = result.sources.filter((s) => s.health === "error" || s.health === "blocked").length;
    const sum = (k: "found" | "added" | "duplicates") => result.sources.reduce((a, s) => a + s[k], 0);
    await supabase
      .from("discovery_runs")
      .update({
        status:
          result.stoppedReason || (result.sources.length > 0 && errors === result.sources.length)
            ? "failed"
            : errors > 0
              ? "partial"
              : "completed",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
        sources_checked: result.sources.length,
        found: sum("found"),
        added: sum("added"),
        duplicates: sum("duplicates"),
        errors,
        stopped_reason: result.stoppedReason,
        acknowledged: opts.trigger === "manual",
      })
      .eq("id", runId);
  }
  return result;
}
