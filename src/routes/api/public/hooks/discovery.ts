import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Scheduled discovery (06:00 and 18:00 Lagos). Called by the database scheduler. */
export const Route = createFileRoute("/api/public/hooks/discovery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-discovery-token") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "Unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: settings } = await supabaseAdmin
          .from("discovery_settings")
          .select("scheduled_enabled, cron_token")
          .eq("id", true)
          .single();
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const d = (v: string) => createHash("sha256").update(v.toLowerCase()).digest();
        if (!settings || !timingSafeEqual(d(token), d(settings.cron_token))) return json({ error: "Unauthorized" }, 401);
        if (!settings.scheduled_enabled) return json({ skipped: "disabled" });

        // Guard against duplicate triggers: at most one scheduled run per 3 hours.
        const since = new Date(Date.now() - 3 * 3600_000).toISOString();
        const { count } = await supabaseAdmin
          .from("discovery_runs")
          .select("id", { count: "exact", head: true })
          .eq("trigger", "scheduled")
          .gte("started_at", since);
        if ((count ?? 0) > 0) return json({ skipped: "recent run" });

        // Single-flight lock.
        const nowIso = new Date().toISOString();
        const { data: locked } = await supabaseAdmin
          .from("discovery_settings")
          .update({ lock_until: new Date(Date.now() + 15 * 60_000).toISOString() })
          .eq("id", true)
          .or(`lock_until.is.null,lock_until.lt.${nowIso}`)
          .select("id");
        if (!locked?.length) return json({ skipped: "already running" });

        try {
          const { runDiscoveryCore } = await import("@/lib/discovery-core.server");
          const r = await runDiscoveryCore(supabaseAdmin, { actorId: null, trigger: "scheduled" });
          return json({ ok: true, runId: r.runId, sources: r.sources.length, stopped: r.stoppedReason });
        } catch (e) {
          console.error("Scheduled discovery failed", e);
          return json({ error: "Discovery failed" }, 500);
        } finally {
          await supabaseAdmin.from("discovery_settings").update({ lock_until: null }).eq("id", true);
        }
      },
    },
  },
});
