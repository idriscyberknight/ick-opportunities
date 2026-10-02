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
  let q = supabase
    .from("opportunity_sources")
    .select("id, source_name, source_url, source_type")
    .eq("active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SOURCES_PER_RUN);
  if (opts.sourceId) q = q.eq("id", opts.sourceId);
  const { data: sources, error } = await q;
  if (error) throw error;

  const { data: run } = await supabase
    .from("discovery_runs")
    .insert({ trigger: opts.trigger, actor_id: opts.actorId })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  const { data: existing } = await supabase.from("opportunities").select("title, organization, official_link");
  const keys = new Set((existing ?? []).map((o) => `${norm(o.title)}|${norm(o.organization)}`));
  const links = new Set((existing ?? []).map((o) => normLink(o.official_link)).filter(Boolean));

  const result: DiscoveryResult = { runId, sources: [], stoppedReason: null };

  for (const src of sources ?? []) {
    const t0 = Date.now();
    const entry = { name: src.source_name, found: 0, added: 0, duplicates: 0, health: "healthy" as Health, error: null as string | null };
    result.sources.push(entry);
    let stop = false;
    try {
      const text = await fetchPageText(src.source_url);
      let items;
      try {
        items = await extractOpportunities(text, src.source_url, src.source_type);
      } catch (e) {
        if (e instanceof GatewayError) throw e;
        const st = statusOf(e);
        if (st && [401, 402, 403, 429].includes(st)) throw new GatewayError(st === 402 ? "AI credits are used up — add credits to continue discovery." : `AI request failed (${st})`, st);
        console.error("Extraction failed", src.source_name, e);
        throw new SourceFetchError(`Extraction failed: ${e instanceof Error ? e.message.slice(0, 200) : "unknown"}`, "error");
      }
      entry.found = items.length;
      let incomplete = 0;
      const now = new Date().toISOString();
      for (const it of items) {
        const title = it.title?.trim();
        const organization = it.organization?.trim();
        const description = it.description?.trim();
        if (!title || !organization || !description) {
          incomplete++;
          continue;
        }
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
        const s = {
          nigeria_score: clamp(it.nigeria_score),
          africa_score: clamp(it.africa_score),
          remote_score: clamp(it.remote_score),
          global_score: clamp(it.global_score),
        };
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
            ...s,
            relevance_score: overallRelevance({
              nigeria: s.nigeria_score,
              africa: s.africa_score,
              remote: s.remote_score,
              global: s.global_score,
            }),
            status: "draft",
            verified_status: "pending_review",
            source_id: src.id,
            discovered_at: now,
            created_by: opts.actorId,
          })
          .select("id")
          .single();
        if (insErr) {
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
          details: opts.trigger === "scheduled" ? "Scheduled discovery" : null,
        });
      }
      entry.health = items.length === 0 || incomplete > 0 ? "partial" : "healthy";
      if (items.length === 0) entry.error = "Page reachable but no opportunities extracted";
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
      // AI-side failures (credits, rate limits) are not the source's fault: leave its health untouched.
      if (!(e instanceof GatewayError)) {
        await supabase
          .from("opportunity_sources")
          .update({ last_checked_at: new Date().toISOString(), last_error: msg.slice(0, 500), health: entry.health, last_found_count: 0 })
          .eq("id", src.id);
      }
      if (e instanceof GatewayError && [401, 402, 403].includes(e.status)) {
        result.stoppedReason = msg;
        stop = true;
      } else if (e instanceof GatewayError && e.status === 429) {
        result.stoppedReason = "AI is busy right now. Try again in a few minutes.";
        stop = true;
      }
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
      });
    }
    if (stop) break;
  }

  if (runId) {
    const errors = result.sources.filter((s) => s.health === "error" || s.health === "blocked").length;
    const sum = (k: "found" | "added" | "duplicates") => result.sources.reduce((a, s) => a + s[k], 0);
    await supabase
      .from("discovery_runs")
      .update({
        status: result.stoppedReason ? "failed" : errors > 0 ? "partial" : "completed",
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
