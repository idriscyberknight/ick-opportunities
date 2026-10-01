import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClass, labelClass } from "@/components/AuthShell";
import {
  CATEGORIES,
  STATUSES,
  VERIFIED_STATES,
  categoryLabel,
  createOpportunity,
  deleteOpportunity,
  fetchAllOpportunities,
  formatDeadline,
  isCurrentUserAdmin,
  updateOpportunity,
  type Opportunity,
  type OpportunityCategory,
  type OpportunityStatus,
  type VerifiedStatus,
} from "@/lib/opportunities";

export const Route = createFileRoute("/_authenticated/admin/opportunities")({
  head: () => ({
    meta: [
      { title: "Manage Opportunities — ICK Opportunities" },
      {
        name: "description",
        content: "Admin console for creating, publishing and reviewing opportunity listings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOpportunitiesPage,
});

type FormState = {
  title: string;
  category: OpportunityCategory;
  organization: string;
  country: string;
  state: string;
  deadline: string;
  description: string;
  eligibility: string;
  benefits: string;
  official_link: string;
  verified_status: VerifiedStatus;
  status: OpportunityStatus;
};

const emptyForm: FormState = {
  title: "",
  category: "scholarship",
  organization: "",
  country: "Nigeria",
  state: "",
  deadline: "",
  description: "",
  eligibility: "",
  benefits: "",
  official_link: "",
  verified_status: "pending_review",
  status: "draft",
};

const statusStyles: Record<OpportunityStatus, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

function toForm(o: Opportunity): FormState {
  return {
    title: o.title,
    category: o.category,
    organization: o.organization,
    country: o.country ?? "",
    state: o.state ?? "",
    deadline: o.deadline ?? "",
    description: o.description,
    eligibility: o.eligibility ?? "",
    benefits: o.benefits ?? "",
    official_link: o.official_link ?? "",
    verified_status: o.verified_status,
    status: o.status,
  };
}

function AdminOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const adminQuery = useQuery({ queryKey: ["is-admin"], queryFn: isCurrentUserAdmin });
  const isAdmin = adminQuery.data === true;

  const listQuery = useQuery({
    queryKey: ["opportunities", "admin"],
    queryFn: fetchAllOpportunities,
    enabled: isAdmin,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    queryClient.invalidateQueries({ queryKey: ["opportunity"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        organization: form.organization.trim(),
        country: form.country.trim() || null,
        state: form.state.trim() || null,
        deadline: form.deadline || null,
        description: form.description.trim(),
        eligibility: form.eligibility.trim() || null,
        benefits: form.benefits.trim() || null,
        official_link: form.official_link.trim() || null,
        verified_status: form.verified_status,
        status: form.status,
      };
      return editing ? updateOpportunity(editing.id, payload) : createOpportunity(payload);
    },
    onSuccess: () => {
      invalidate();
      setNotice(editing ? "Opportunity updated." : "Opportunity created.");
      setError(null);
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OpportunityStatus }) =>
      updateOpportunity(id, { status }),
    onSuccess: () => {
      invalidate();
      setNotice("Publication status updated.");
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not update."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOpportunity(id),
    onSuccess: () => {
      invalidate();
      setNotice("Opportunity deleted.");
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Could not delete."),
  });

  if (adminQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Administrator access required
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your account does not have permission to manage opportunities.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const items = listQuery.data ?? [];
  const required = form.title.trim() && form.organization.trim() && form.description.trim();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground">
            Manage opportunities
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create, verify, publish and remove listings across all categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setShowForm(true);
            setNotice(null);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90"
        >
          <Plus className="h-4 w-4" /> New opportunity
        </button>
      </div>

      {notice && (
        <p className="mt-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!required) {
              setError("Title, organisation and description are required.");
              return;
            }
            setError(null);
            saveMutation.mutate();
          }}
          className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="title">Title</label>
            <input id="title" className={fieldClass} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div>
            <label className={labelClass} htmlFor="category">Category</label>
            <select id="category" className={fieldClass} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as OpportunityCategory })}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="organization">Organisation</label>
            <input id="organization" className={fieldClass} value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          </div>

          <div>
            <label className={labelClass} htmlFor="country">Country</label>
            <input id="country" className={fieldClass} value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>

          <div>
            <label className={labelClass} htmlFor="state">State / city</label>
            <input id="state" className={fieldClass} value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>

          <div>
            <label className={labelClass} htmlFor="deadline">Deadline</label>
            <input id="deadline" type="date" className={fieldClass} value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>

          <div>
            <label className={labelClass} htmlFor="official_link">Official link</label>
            <input id="official_link" type="url" placeholder="https://" className={fieldClass}
              value={form.official_link}
              onChange={(e) => setForm({ ...form, official_link: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="description">Description</label>
            <textarea id="description" rows={4} className={cn(fieldClass, "h-auto")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="eligibility">Eligibility</label>
            <textarea id="eligibility" rows={3} className={cn(fieldClass, "h-auto")}
              value={form.eligibility}
              onChange={(e) => setForm({ ...form, eligibility: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="benefits">Benefits</label>
            <textarea id="benefits" rows={3} className={cn(fieldClass, "h-auto")}
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
          </div>

          <div>
            <label className={labelClass} htmlFor="verified_status">Verification</label>
            <select id="verified_status" className={fieldClass} value={form.verified_status}
              onChange={(e) => setForm({ ...form, verified_status: e.target.value as VerifiedStatus })}>
              {VERIFIED_STATES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="status">Status</label>
            <select id="status" className={fieldClass} value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as OpportunityStatus })}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create opportunity"}
            </button>
            <button type="button"
              onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-10">
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading listings…
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No opportunities yet. Create the first listing above.
          </p>
        ) : (
          <div className="grid gap-4">
            {items.map((o) => (
              <article key={o.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className={cn("rounded-md px-2 py-0.5", statusStyles[o.status])}>
                    {o.status}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                    {categoryLabel(o.category)}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5",
                      o.verified_status === "verified"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {o.verified_status === "verified" ? "Verified" : "Pending review"}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-bold text-foreground">{o.title}</h2>
                <p className="text-sm text-muted-foreground">{o.organization}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deadline: {formatDeadline(o.deadline)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => {
                      setEditing(o); setForm(toForm(o)); setShowForm(true);
                      setNotice(null); setError(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button type="button"
                    onClick={() =>
                      publishMutation.mutate({
                        id: o.id,
                        status: o.status === "active" ? "draft" : "active",
                      })
                    }
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                    {o.status === "active" ? "Unpublish" : "Publish"}
                  </button>
                  <button type="button"
                    onClick={() => publishMutation.mutate({ id: o.id, status: "expired" })}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted">
                    Mark expired
                  </button>
                  <button type="button"
                    onClick={() => {
                      if (window.confirm("Delete this opportunity permanently?")) {
                        deleteMutation.mutate(o.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
