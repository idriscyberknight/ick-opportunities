import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { acknowledgeRuns, fetchUnacknowledgedRuns, fmtTime } from "@/lib/discovery-admin";

/** Admin notification shown after scheduled discovery runs complete. */
export function DiscoveryNotice() {
  const qc = useQueryClient();
  const runs = useQuery({ queryKey: ["discovery-unack"], queryFn: fetchUnacknowledgedRuns });
  const dismiss = useMutation({
    mutationFn: (ids: string[]) => acknowledgeRuns(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discovery-unack"] }),
  });
  const list = runs.data ?? [];
  if (!list.length) return null;
  return (
    <div className="mt-6 space-y-2">
      {list.map((r) => (
        <div key={r.id} role="status" className="flex items-start gap-3 rounded-xl border border-secondary/40 bg-secondary/5 p-4 text-sm">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-foreground">Discovery completed</p>
            <p className="text-muted-foreground">
              Scheduled run · {fmtTime(r.finished_at ?? r.started_at)} — {r.sources_checked} sources checked ·{" "}
              {r.found} opportunities found · {r.duplicates} duplicates skipped ·{" "}
              <span className={r.errors ? "text-destructive" : ""}>{r.errors} errors detected</span>
              {r.stopped_reason ? ` · Stopped: ${r.stopped_reason}` : ""}
            </p>
          </div>
          <button type="button" aria-label="Dismiss" className="rounded p-1 hover:bg-muted" onClick={() => dismiss.mutate([r.id])}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
