import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DiscoveryResult } from "@/lib/discovery-core.server";

export type { DiscoveryResult };

/** Admin-only manual discovery run. Results are always saved as drafts. */
export const runDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sourceId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }): Promise<DiscoveryResult> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { runDiscoveryCore } = await import("@/lib/discovery-core.server");
    return runDiscoveryCore(supabase, { actorId: userId, trigger: "manual", sourceId: data.sourceId });
  });
