import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { fieldClass, labelClass } from "@/components/AuthShell";
import { isCurrentUserAdmin } from "@/lib/opportunities";
import {
  SOURCE_TYPES,
  createSource,
  deleteSource,
  fetchSources,
  updateSource,
  type SourceType,
} from "@/lib/review";
import { runDiscovery, type DiscoveryResult } from "@/lib/discovery.functions";
import { HEALTH } from "@/lib/discovery-admin";
import { DiscoveryNotice } from "@/components/DiscoveryNotice";

export const Route = createFileRoute("/_authenticated/admin/sources")({
  head: () => ({
    meta: [
      { title: "Opportunity Sources — ICK Opportunities" },
      { name: "description", content: "Manage the approved sources used for opportunity discovery." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SourcesPage,
});

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60";

function SourcesPage() {
  const qc = useQueryClient();
  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: isCurrentUserAdmin });
  const isAdmin = adminQuery.data === true;
  const sources = useQuery({ queryKey: ["sources"], queryFn: fetchSources, enabled: isAdmin });
  const discover = useServerFn(runDiscovery);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<SourceType>("scholarship");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["sources"] });

  const add = useMutation({
    mutationFn: async () => {
      let parsed: URL;
      try {
        parsed = new URL(url.trim());
      } catch {
        throw new Error("Enter a full web address starting with https://");
      }
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only web addresses are allowed");
      if (!name.trim()) throw new Error("Source name is required");
      await createSource({ source_name: name.trim(), source_url: parsed.toString(), source_type: type });
    },
    onSuccess: () => {
      setName("");
      setUrl("");
      setFormError(null);
      refresh();
    },
    onError: (e: Error) =>
      setFormError(e.message.includes("duplicate") ? "This source is already listed" : e.message),
  });

  const run = useMutation({
    mutationFn: (sourceId?: string) => discover({ data: sourceId ? { sourceId } : {} }),
    onSuccess: (r) => {
      setResult(r);
      refresh();
      qc.invalidateQueries({ queryKey: ["review-queue"] });
    },
  });

  if (adminQuery.isLoading) {
    return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  }
  if (!isAdmin) return <Center>Administrator access required.</Center>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
            Opportunity sources
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Approved websites checked by AI-powered discovery. Everything found is saved as a draft
            for review — nothing is published automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/discovery" className={btn}>Analytics &amp; history</Link>
          <Link to="/admin/review" className={btn}>Review queue</Link>
          <button
            type="button"
            onClick={() => run.mutate(undefined)}
            disabled={run.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {run.isPending ? "Discovering…" : "Run discovery"}
          </button>
        </div>
      </div>

      <DiscoveryNotice />
      {run.isError && (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {(run.error as Error).message}
        </p>
      )}
      {result && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-semibold text-foreground">Last run</p>
          {result.stoppedReason && <p className="mt-1 text-destructive">Note: {result.stoppedReason}</p>}
          {result.sources.length === 0 && <p className="mt-1 text-muted-foreground">No active sources to check.</p>}
          <ul className="mt-2 space-y-1">
            {result.sources.map((s) => (
              <li key={s.name} className="text-muted-foreground">
                <span className="font-medium text-foreground">{s.name}:</span>{" "}
                {HEALTH[s.health].icon} <span className="font-semibold">{s.mode === "fallback" ? "Fallback Mode" : "AI Mode"}</span> · {s.error ? <span className="text-destructive">{s.error}</span> : `${s.found} found, ${s.added} new drafts, ${s.duplicates} duplicates skipped`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_1.5fr_1fr_auto] sm:items-end"
      >
        <div>
          <label className={labelClass} htmlFor="s-name">Source name</label>
          <input id="s-name" className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="s-url">Source URL</label>
          <input id="s-url" className={fieldClass} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="s-type">Type</label>
          <select id="s-type" className={fieldClass} value={type} onChange={(e) => setType(e.target.value as SourceType)}>
            {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button type="submit" disabled={add.isPending} className={btn}>
          <Plus className="h-4 w-4" /> Add
        </button>
        {formError && <p className="text-sm text-destructive sm:col-span-4">{formError}</p>}
      </form>

      <div className="mt-6 space-y-3">
        {sources.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (sources.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No sources yet. Add an official scholarship, grant, fellowship, careers or internship page above.
          </p>
        ) : (
          sources.data!.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{s.source_name}</p>
                <a href={s.source_url} target="_blank" rel="noreferrer noopener" className="block truncate text-sm text-secondary">
                  {s.source_url}
                </a>
                <p className={`mt-1 text-sm font-semibold ${HEALTH[s.health].cls}`}>
                  {HEALTH[s.health].icon} {HEALTH[s.health].label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {SOURCE_TYPES.find((t) => t.value === s.source_type)?.label} · Last checked{" "}
                  {s.last_checked_at ? new Date(s.last_checked_at).toLocaleString("en-GB") : "never"} · Last successful
                  discovery {s.last_success_at ? new Date(s.last_success_at).toLocaleString("en-GB") : "never"} · Found{" "}
                  {s.last_found_count}
                </p>
                {s.last_error && <p className="mt-1 text-xs text-destructive">Last error: {s.last_error}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={s.active}
                    onChange={(e) => updateSource(s.id, { active: e.target.checked }).then(refresh)}
                  />
                  Active
                </label>
                <button type="button" className={btn} disabled={run.isPending || !s.active} onClick={() => run.mutate(s.id)}>
                  Check now
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${s.source_name}`}
                  className={btn}
                  onClick={() => confirm(`Delete ${s.source_name}?`) && deleteSource(s.id).then(refresh)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">{children}</div>;
}
