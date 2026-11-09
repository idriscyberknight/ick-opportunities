import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Scheduled trusted worker for in-app alerts. Only the platform scheduler
// (managed bearer secret) can trigger it; browsers get 401.
export const Route = createFileRoute("/api/public/jobs/alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { runAlertWorker, parseAlertWorkerCursor } = await import("@/lib/a18-alert-worker.server");
          let afterUserId: string | null;
          try {
            const url = new URL(request.url);
            afterUserId = parseAlertWorkerCursor(url.searchParams.get("afterUserId"));
          } catch {
            return Response.json({ ok: false, error: "Invalid continuation cursor" }, { status: 400 });
          }
          const result = await runAlertWorker(supabaseAdmin, new Date(), afterUserId);
          // The authorized scheduler MUST follow nextUserCursor when non-null.
          // Partial user batches are not evidence that all opted-in users were
          // processed. Missing/failed records are surfaced, not hidden.
          return Response.json({
            ok: result.failures === 0 && !result.truncatedOpportunities,
            ...result,
          });
        } catch (e) {
          console.error("[a18-worker] run failed:", (e as Error).message);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
