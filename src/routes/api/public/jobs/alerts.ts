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
          const { runAlertWorker } = await import("@/lib/a18-alert-worker.server");
          const result = await runAlertWorker(supabaseAdmin);
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[a18-worker] run failed:", (e as Error).message);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
