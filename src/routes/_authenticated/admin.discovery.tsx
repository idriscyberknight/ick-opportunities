import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCurrentUserAdmin } from "@/lib/opportunities";
import { runDiscovery } from "@/lib/discovery.functions";
import { DiscoveryNotice } from "@/components/DiscoveryNotice";
import {
  HEALTH,
  fetchDiscoveryAnalytics,
  fetchDiscoverySettings,
  fetchRunSources,
  fetchRuns,
  fmtDuration,
  fmtTime,
  setScheduledEnabled,
  type DiscoveryRun,
} from "@/lib/discovery-admin";

export const Route = createFileRoute("/_authenticated/admin/discovery")({
  head: () => ({
    meta: [
      { title: "Discovery Analytics — ICK Opportunities" },
      { name: "description", content: "Discovery schedules, analytics and run history for administrators." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiscoveryPage,
});

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60";

const STATUS_CLS: Record<string, string> = {
  completed: "bg-success/10 text-success",
  partial: "bg-secondary/10 text-secondary",
  failed: "bg-destructive/10 text-destructive",
  running: "bg-muted text-muted-foreground",
};

function DiscoveryPage() {
  const qc = useQueryClient();
  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: isCurrentUserAdmin });
  const isAdmin = adminQuery.data === true;
  const settings = useQuery({ queryKey: ["discovery-settings"], queryFn: fetchDiscoverySettings, enabled: isAdmin });
  const analytics = useQuery({ queryKey: ["discovery-analytics"], queryFn: fetchDiscoveryAnalytics, enabled: isAdmin });
  const runs = useQuery({ queryKey: ["discovery-runs"], queryFn: () => fetchRuns(), enabled: isAdmin });
  const discover = useServerFn(runDiscovery);

  const toggle = useMutation({
    mutationFn: setScheduledEnabled,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discovery-settings"] }),
  });
  const run = useMutation({
    mutationFn: () => discover({ data: {} }),
    onSettled: () => {
      for (const k of ["discovery-runs", "discovery-analytics", "sources", "review-queue"]) qc.invalidateQueries({ queryKey: [k] });
    },
  });

  if (adminQuery.isLoading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (!isAdmin) return <Center>Administrator access required.</Center>;

  const a = analytics.data;
  const enabled = settings.data?.scheduled_enabled ?? false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">Discovery</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Automated schedules, source health and run history. Discovered opportunities are always saved as drafts — nothing is published automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/sources" className={btn}>Sources</Link>
          <Link to="/admin/review" className={btn}>Review queue</Link>
          <button
            type="button"
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {run.isPending ? "Discovering…" : "Run discovery now"}
          </button>
        </div>
      </div>

      {run.isError && <p className="mt-4 text-sm text-destructive">{(run.error as Error).message}</p>}
      <DiscoveryNotice />

      <section className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Scheduled discovery</h2>
          <p className="text-sm text-muted-foreground">Runs daily at 06:00 and 18:00 (Lagos time) on active sources only.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={enabled}
            disabled={settings.isLoading || toggle.isPending}
            onChange={(e) => toggle.mutate(e.target.checked)}
          />
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-foreground">Overview</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total sources" value={a?.sources.total} />
          <Stat label="Active sources" value={a?.sources.active} />
          <Stat label={`${HEALTH.healthy.icon} Healthy`} value={a?.sources.healthy} />
          <Stat label={`${HEALTH.blocked.icon} Blocked`} value={a?.sources.blocked} />
          <Stat label="Draft opportunities" value={a?.opportunities.drafts} />
          <Stat label="Published" value={a?.opportunities.published} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-foreground">Discovery statistics</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Metric</th><th className="p-3">Today</th><th className="p-3">This week</th><th className="p-3">This month</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {([
                ["discovered", "Opportunities discovered"],
                ["approved", "Opportunities approved"],
                ["published", "Opportunities published"],
                ["rejected", "Opportunities rejected"],
                ["duplicates", "Duplicates skipped"],
              ] as const).map(([k, label]) => (
                <tr key={k}>
                  <td className="p-3 font-medium text-foreground">{label}</td>
                  <td className="p-3 tabular-nums">{a ? a.periods.today[k] : "…"}</td>
                  <td className="p-3 tabular-nums">{a ? a.periods.week[k] : "…"}</td>
                  <td className="p-3 tabular-nums">{a ? a.periods.month[k] : "…"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {analytics.isError && <p className="mt-2 text-sm text-destructive">{(analytics.error as Error).message}</p>}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-foreground">Run history</h2>
        <div className="mt-3 space-y-2">
          {runs.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (runs.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No discovery runs yet.</p>
          ) : (
            runs.data!.map((r) => <RunRow key={r.id} run={r} />)
          )}
        </div>
      </section>
    </div>
  );
}

function RunRow({ run }: { run: DiscoveryRun }) {
  const [open, setOpen] = useState(false);
  const details = useQuery({ queryKey: ["run-sources", run.id], queryFn: () => fetchRunSources(run.id), enabled: open });
  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-4 text-left text-sm">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-semibold text-foreground">{fmtTime(run.started_at)}</span>
        <span className="capitalize text-muted-foreground">{run.trigger}</span>
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold capitalize", STATUS_CLS[run.status])}>{run.status}</span>
        <span className="text-muted-foreground">
          {run.sources_checked} sources · {run.found} found · {run.added} new · {run.duplicates} duplicates · {run.errors} errors · {fmtDuration(run.duration_ms)}
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-4">
          {run.stopped_reason && <p className="mb-2 text-sm text-destructive">Note: {run.stopped_reason}</p>}
          {details.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-2">Source</th><th className="p-2">Mode</th><th className="p-2">Run time</th><th className="p-2">Duration</th><th className="p-2">Found</th><th className="p-2">Duplicates</th><th className="p-2">Status</th><th className="p-2">Errors</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(details.data ?? []).map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 font-medium text-foreground">{s.source_name}</td>
                      <td className="whitespace-nowrap p-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", s.mode === "fallback" ? "bg-muted text-foreground" : "bg-primary/10 text-primary")}>
                          {s.mode === "fallback" ? "Fallback Mode" : "AI Mode"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-2 text-muted-foreground">{fmtTime(s.started_at)}</td>
                      <td className="p-2">{fmtDuration(s.duration_ms)}</td>
                      <td className="p-2">{s.found}</td>
                      <td className="p-2">{s.duplicates}</td>
                      <td className={cn("whitespace-nowrap p-2", HEALTH[s.health].cls)}>{HEALTH[s.health].icon} {HEALTH[s.health].label}</td>
                      <td className="p-2 text-muted-foreground">{s.error ?? "—"}</td>
                    </tr>
                  ))}
                  {(details.data ?? []).length === 0 && <tr><td colSpan={8} className="p-2 text-muted-foreground">No sources were checked.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-foreground">{value ?? "…"}</p>
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">{children}</div>;
}
