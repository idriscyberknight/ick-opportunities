import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTrackingMap,
  trackOpportunity,
  updateTrackingStatus,
  TRACKING_STATUSES,
  statusLabel,
  type ApplicationStatus,
} from "@/lib/tracking";

export function TrackOpportunityButton({
  opportunityId,
  className,
}: {
  opportunityId: string;
  className?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trackingMap } = useQuery({
    queryKey: ["tracking-map", user?.id],
    queryFn: () => fetchTrackingMap(user!.id),
    enabled: !!user,
  });

  const existing = trackingMap?.get(opportunityId);

  const mutation = useMutation({
    mutationFn: async (status: ApplicationStatus) => {
      if (!user) throw new Error("Not signed in");
      if (existing) {
        await updateTrackingStatus(existing.id, user.id, status);
      } else {
        await trackOpportunity(user.id, opportunityId, status);
      }
    },
    onSuccess: (_d, status) => {
      queryClient.invalidateQueries({ queryKey: ["tracking-map"] });
      queryClient.invalidateQueries({ queryKey: ["tracked-opportunities"] });
      toast.success(
        existing ? `Status updated to ${statusLabel(status)}` : `Tracking as ${statusLabel(status)}`,
      );
    },
    onError: () => {
      toast.error("Could not update your tracker. Please try again.");
    },
  });

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const status = e.target.value as ApplicationStatus | "";
    if (!status) return;
    if (!isAuthenticated) {
      toast.info("Sign in to track opportunities");
      navigate({ to: "/signin" });
      return;
    }
    mutation.mutate(status);
  }

  return (
    <label
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-ring",
        existing
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
        mutation.isPending && "opacity-60",
        className,
      )}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ClipboardList className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">Track this opportunity</span>
      <select
        value={existing?.status ?? ""}
        onChange={handleSelect}
        disabled={mutation.isPending}
        className="cursor-pointer appearance-none bg-transparent text-xs font-semibold outline-none"
      >
        {!existing && (
          <option value="" disabled>
            Track
          </option>
        )}
        {TRACKING_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {existing?.status === s.value ? `● ${s.label}` : s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
