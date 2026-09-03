import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/signin" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    const onboarded = profile?.onboarding_completed === true;
    const onOnboarding = location.pathname.startsWith("/onboarding");

    if (!onboarded && !onOnboarding) throw redirect({ to: "/onboarding" });
    if (onboarded && onOnboarding) throw redirect({ to: "/dashboard" });

    return { user: data.user };
  },
  component: () => <Outlet />,
});
