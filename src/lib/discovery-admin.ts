import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SourceHealth = Tables<"opportunity_sources">["health"];
export type DiscoveryRun = Tables<"discovery_runs">;
export type RunSource = Tables<"discovery_run_sources">;

export const HEALTH: Record<SourceHealth, { icon: string; label: string; cls: string }> = {
  healthy: { icon: "🟢", label: "Healthy", cls: "text-success" },
  partial: { icon: "🟡", label: "Partial", cls: "text-foreground" },
  blocked: { icon: "🔴", label: "Blocked", cls: "text-destructive" },
  error: { icon: "⚫", label: "Error", cls: "text-muted-foreground" },
  unknown: { icon: "⚪", label: "Not checked", cls: "text-muted-foreground" },
};

export async function fetchDiscoverySettings() {
  const { data, error } = await supabase
    .from("discovery_settings")
    .select("scheduled_enabled, lock_until, updated_at")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data;
}

export async function setScheduledEnabled(enabled: boolean) {
  const { error } = await supabase
    .from("discovery_settings")
    .update({ scheduled_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
}

export async function fetchRuns(limit = 30) {
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRunSources(runId: string) {
  const { data, error } = await supabase
    .from("discovery_run_sources")
    .select("*")
    .eq("run_id", runId)
    .order("started_at");
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnacknowledgedRuns() {
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("*")
    .eq("trigger", "scheduled")
    .eq("acknowledged", false)
    .neq("status", "running")
    .order("started_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

export async function acknowledgeRuns(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("discovery_runs").update({ acknowledged: true }).in("id", ids);
  if (error) throw error;
}

type Period = { discovered: number; approved: number; published: number; rejected: number; duplicates: number };

export async function fetchDiscoveryAnalytics() {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(day);
  week.setDate(day.getDate() - ((day.getDay() + 6) % 7)); // Monday
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const since = (week < month ? week : month).toISOString();

  const count = async (build: (q: ReturnType<typeof base>) => unknown) => {
    const r = (await build(base())) as { count: number | null; error: unknown };
    if (r.error) throw r.error;
    return r.count ?? 0;
  };
  const base = () => supabase.from("opportunity_sources").select("id", { count: "exact", head: true });
  const opp = async (status: "draft" | "active") => {
    const { count: c, error } = await supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw error;
    return c ?? 0;
  };

  const [total, active, healthy, blocked, drafts, published, logs, runSrc] = await Promise.all([
    count((q) => q),
    count((q) => q.eq("active", true)),
    count((q) => q.eq("health", "healthy")),
    count((q) => q.eq("health", "blocked")),
    opp("draft"),
    opp("active"),
    supabase
      .from("opportunity_audit_logs")
      .select("action, created_at")
      .in("action", ["discovered", "approved", "published", "rejected"])
      .gte("created_at", since)
      .limit(5000),
    supabase.from("discovery_run_sources").select("duplicates, started_at").gte("started_at", since).limit(5000),
  ]);
  if (logs.error) throw logs.error;
  if (runSrc.error) throw runSrc.error;

  const empty = (): Period => ({ discovered: 0, approved: 0, published: 0, rejected: 0, duplicates: 0 });
  const periods = { today: empty(), week: empty(), month: empty() };
  const bump = (iso: string, fn: (p: Period) => void) => {
    const t = new Date(iso);
    if (t >= day) fn(periods.today);
    if (t >= week) fn(periods.week);
    if (t >= month) fn(periods.month);
  };
  for (const l of logs.data ?? []) {
    const a = l.action as keyof Period;
    bump(l.created_at, (p) => p[a]++);
  }
  for (const r of runSrc.data ?? []) bump(r.started_at, (p) => (p.duplicates += r.duplicates));

  return { sources: { total, active, healthy, blocked }, opportunities: { drafts, published }, periods };
}

export const fmtDuration = (ms: number | null) =>
  ms == null ? "—" : ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 60_000)} min`;
export const fmtTime = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB") : "—");
