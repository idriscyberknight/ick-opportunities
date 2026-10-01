import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Loader2, Pencil, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClass, labelClass } from "@/components/AuthShell";
import {
  CATEGORIES,
  categoryLabel,
  categoryStyles,
  formatDeadline,
  isCurrentUserAdmin,
  type OpportunityCategory,
} from "@/lib/opportunities";
import {
  fetchRecentAudit,
  fetchReviewQueue,
  reviewOpportunity,
  type ReviewAction,
  type ReviewItem,
} from "@/lib/review";

export const Route = createFileRoute("/_authenticated/admin/review")({
  head: () => ({
    meta: [
      { title: "Review Queue — ICK Opportunities" },
      { name: "description", content: "Review discovered opportunities before publication." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-GB") : "—");

function ReviewPage() {
  const qc = useQueryClient();
  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: isCurrentUserAdmin });
  const isAdmin = adminQuery.data === true;
  const queue = useQuery({ queryKey: ["review-queue"], queryFn: fetchReviewQueue, enabled: isAdmin });
  const audit = useQuery({ queryKey: ["audit-log"], queryFn: () => fetchRecentAudit(), enabled: isAdmin });
  const [editing, setEditing] = useState<string | null>(null);

  const act = useMutation({
    mutationFn: (v: { item: ReviewItem; action: ReviewAction; edits?: Parameters<typeof reviewOpportunity>[2] }) =>
      reviewOpportunity(v.item, v.action, v.edits),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      qc.invalidateQueries({ queryKey: ["audit-log"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  if (adminQuery.isLoading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (!isAdmin) return <Center>Administrator access required.</Center>;

  const items = queue.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">Review queue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} draft{items.length === 1 ? "" : "s"} awaiting review. Check every detail against the official source before publishing.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/sources" className={btn}>Sources</Link>
          <Link to="/admin/opportunities" className={btn}>All opportunities</Link>
        </div>
      </div>

      {act.isError && <p className="mt-6 text-sm text-destructive">{(act.error as Error).message}</p>}

      <div className="mt-8 space-y-4">
        {queue.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            The queue is empty. Run discovery from the Sources page to find new opportunities.
          </p>
        ) : (
          items.map((o) =>
            editing === o.id ? (
              <EditForm
                key={o.id}
                item={o}
                busy={act.isPending}
                onCancel={() => setEditing(null)}
                onSave={(edits) => act.mutate({ item: o, action: "edited", edits })}
              />
            ) : (
              <article key={o.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className={cn("rounded-md px-2 py-0.5", categoryStyles[o.category])}>{categoryLabel(o.category)}</span>
                  <span className={cn("rounded-md px-2 py-0.5", o.verified_status === "verified" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                    {o.verified_status === "verified" ? "Approved" : "Pending review"}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-bold text-foreground">{o.title}</h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {o.organization} · {o.country ?? "Country not stated"} · Deadline: {formatDeadline(o.deadline)}
                </p>
                <p className="mt-2 text-sm text-foreground">{o.description}</p>
                {o.eligibility && <p className="mt-2 text-sm text-muted-foreground"><b className="text-foreground">Eligibility:</b> {o.eligibility}</p>}
                {o.benefits && <p className="mt-1 text-sm text-muted-foreground"><b className="text-foreground">Benefits:</b> {o.benefits}</p>}
                {o.official_link && (
                  <a href={o.official_link} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 break-all text-sm text-secondary">
                    {o.official_link} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Source: {o.opportunity_sources?.source_name ?? "Manual entry"} · Discovered {fmt(o.discovered_at)}
                  {o.reviewed_at ? ` · Last reviewed ${fmt(o.reviewed_at)}` : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {o.verified_status !== "verified" && (
                    <button className={btn} disabled={act.isPending} onClick={() => act.mutate({ item: o, action: "approved" })}>
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  )}
                  <button className={btn} onClick={() => setEditing(o.id)}><Pencil className="h-4 w-4" /> Edit</button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    disabled={act.isPending}
                    onClick={() => confirm("Publish this opportunity publicly?") && act.mutate({ item: o, action: "published" })}
                  >
                    <Send className="h-4 w-4" /> Publish
                  </button>
                  <button
                    className={cn(btn, "text-destructive")}
                    disabled={act.isPending}
                    onClick={() => confirm("Reject this opportunity?") && act.mutate({ item: o, action: "rejected" })}
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </article>
            ),
          )
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-foreground">Audit log</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Opportunity</th><th className="p-3">Source</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(audit.data ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(a.created_at)}</td>
                  <td className="p-3 font-medium capitalize text-foreground">{a.action}</td>
                  <td className="p-3 text-foreground">{a.opportunity_title ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{a.opportunity_sources?.source_name ?? "—"}</td>
                </tr>
              ))}
              {(audit.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function EditForm({
  item,
  busy,
  onSave,
  onCancel,
}: {
  item: ReviewItem;
  busy: boolean;
  onSave: (e: Record<string, string | null>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    title: item.title,
    organization: item.organization,
    category: item.category as OpportunityCategory,
    country: item.country ?? "",
    deadline: item.deadline ?? "",
    description: item.description,
    eligibility: item.eligibility ?? "",
    benefits: item.benefits ?? "",
    official_link: item.official_link ?? "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const valid = f.title.trim() && f.organization.trim() && f.description.trim();
  return (
    <form
      className="grid gap-4 rounded-xl border border-secondary/40 bg-card p-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave({
          ...f,
          title: f.title.trim(),
          organization: f.organization.trim(),
          description: f.description.trim(),
          country: f.country.trim() || null,
          deadline: f.deadline || null,
          eligibility: f.eligibility.trim() || null,
          benefits: f.benefits.trim() || null,
          official_link: f.official_link.trim() || null,
        });
      }}
    >
      <Field label="Title"><input className={fieldClass} value={f.title} onChange={set("title")} /></Field>
      <Field label="Organisation"><input className={fieldClass} value={f.organization} onChange={set("organization")} /></Field>
      <Field label="Category">
        <select className={fieldClass} value={f.category} onChange={set("category")}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Country"><input className={fieldClass} value={f.country} onChange={set("country")} /></Field>
      <Field label="Deadline"><input type="date" className={fieldClass} value={f.deadline} onChange={set("deadline")} /></Field>
      <Field label="Official link"><input className={fieldClass} value={f.official_link} onChange={set("official_link")} /></Field>
      <div className="sm:col-span-2"><Field label="Description"><textarea rows={3} className={fieldClass} value={f.description} onChange={set("description")} /></Field></div>
      <Field label="Eligibility"><textarea rows={3} className={fieldClass} value={f.eligibility} onChange={set("eligibility")} /></Field>
      <Field label="Benefits"><textarea rows={3} className={fieldClass} value={f.benefits} onChange={set("benefits")} /></Field>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy || !valid} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Save changes</button>
        <button type="button" onClick={onCancel} className={btn}>Cancel</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">{children}</div>;
}
