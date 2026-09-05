import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchSavedOpportunityIds,
  saveOpportunity,
  unsaveOpportunity,
} from "@/lib/saved";

export function SaveOpportunityButton({
  opportunityId,
  className,
}: {
  opportunityId: string;
  className?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: savedIds } = useQuery({
    queryKey: ["saved-opportunity-ids", user?.id],
    queryFn: () => fetchSavedOpportunityIds(user!.id),
    enabled: !!user,
  });

  const saved = !!savedIds?.includes(opportunityId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (saved) {
        await unsaveOpportunity(user.id, opportunityId);
      } else {
        await saveOpportunity(user.id, opportunityId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-opportunity-ids"] });
      queryClient.invalidateQueries({ queryKey: ["saved-opportunities"] });
      toast.success(saved ? "Removed from saved" : "Opportunity saved");
    },
    onError: () => {
      toast.error("Could not update your saved opportunities. Please try again.");
    },
  });

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Sign in to save opportunities");
      navigate({ to: "/signin" });
      return;
    }
    mutation.mutate();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved opportunities" : "Save this opportunity"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        saved
          ? "border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/15"
          : "border-border bg-background text-muted-foreground hover:border-secondary/40 hover:text-secondary",
        className,
      )}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="h-3.5 w-3.5" />
      ) : (
        <Bookmark className="h-3.5 w-3.5" />
      )}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
