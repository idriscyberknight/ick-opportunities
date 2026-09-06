import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTrackedOpportunities,
  removeTracking,
  updateTrackingStatus,
  TRACKING_STATUSES,
  statusLabel,
  statusStyles,
  type ApplicationStatus,
  type TrackedOpportunity,
} from "@/lib/tracking";
import {
  categoryLabel,
  categoryStyles,
  formatDeadline,
  locationLabel,
} from "@/lib/opportunities";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({
    meta: [
      { title: "Application Tracker — ICK Opportunities" },
      {
        name: "description",
        content:
          "Track every opportunity from interested to accepted, grouped by application status.",
      },
    ],
  }),
  component: TrackerPage,
});

function TrackerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tracked-opportunities", user?.id],
    queryFn: () => fetchTrackedOpportunities(user!.id),
    enabled: !!user,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      updateTrackingStatus(id, user!.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Could not update status. Please try again."),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeTracking(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
      toast.success("Removed from tracker");
    },
    onError: () => toast.error("Could not remove this entry. Please try again."),
  });

  const grouped = TRACKING_STATUSES.map((s) => ({
    ...s,
    items: (data ?? []).filter((t) => t.status === s.value),
  }));
  const total = data?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
          Application tracker
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Follow every opportunity from first interest to the final decision.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your tracker…
        </div>
      ) : isError ? (
        <p className="mt-12 text-sm text-destructive">
          We could not load your tracker right now. Please try again shortly.
        </p>
      ) : total === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-display text-lg font-bold text-foreground">
            Nothing tracked yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Use the Track button on any opportunity to mark it as Interested,
            Applied, Interview, Accepted or Rejected — it will appear here.
          </p>
          <Link
            to="/opportunities"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse opportunities
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {grouped.map((g) => (
              <div
                key={g.value}
                className="rounded-xl border border-border bg-card p-4"
              >
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    statusStyles[g.value],
                  )}
                >
                  {g.label}
                </span>
                <p className="mt-2 font-display text-2xl font-extrabold text-foreground">
                  {g.items.length}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-10">
            {grouped.map((g) => (
              <section key={g.value}>
                <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.01em] text-foreground">
                  {g.label}
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {g.items.length}
                  </span>
                </h2>

                {g.items.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No opportunities with this status yet.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((t) => (
                      <TrackedCard
                        key={t.id}
                        item={t}
                        pending={
                          (statusMutation.isPending &&
                            statusMutation.variables?.id === t.id) ||
                          (removeMutation.isPending &&
                            removeMutation.variables === t.id)
                        }
                        onStatusChange={(status) =>
                          statusMutation.mutate({ id: t.id, status })
                        }
                        onRemove={() => removeMutation.mutate(t.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TrackedCard({
  item,
  pending,
  onStatusChange,
  onRemove,
}: {
  item: TrackedOpportunity;
  pending: boolean;
  onStatusChange: (status: ApplicationStatus) => void;
  onRemove: () => void;
}) {
  const o = item.opportunities;
  if (!o) return null;

  return (
    <article className="group flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_18px_40px_-28px_rgba(16,24,40,0.45)]">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
            categoryStyles[o.category],
          )}
        >
          {categoryLabel(o.category)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label="Remove from tracker"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Remove
        </button>
      </div>

      <h3 className="mt-3 font-display text-[17px] font-bold leading-snug tracking-[-0.01em] text-foreground">
        {o.title}
      </h3>
      <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
        {o.organization}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {locationLabel(o)}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDeadline(o.deadline)}
        </span>
      </div>

      <div className="mt-4">
        <label
          htmlFor={`status-${item.id}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Status
        </label>
        <select
          id={`status-${item.id}`}
          value={item.status}
          disabled={pending}
          onChange={(e) => onStatusChange(e.target.value as ApplicationStatus)}
          className="mt-1.5 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors focus:border-ring focus:ring-4 focus:ring-ring/15 disabled:opacity-60"
        >
          {TRACKING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <Link
          to="/opportunities/$id"
          params={{ id: o.id }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View details
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <span
          className={cn(
            "ml-3 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
            statusStyles[item.status],
          )}
        >
          {statusLabel(item.status)}
        </span>
      </div>
    </article>
  );
}
