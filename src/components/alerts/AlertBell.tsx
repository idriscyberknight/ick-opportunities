import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyAlertNotifications,
  isProductionAlertPilotEnabled,
} from "@/lib/alert-production-client";

/** Header bell with unread count. Renders nothing until alerts are activated. */
export function AlertBell() {
  const { user } = useAuth();
  const active = isProductionAlertPilotEnabled() && !!user;
  const { data } = useQuery({
    queryKey: ["a18-production-pilot-alert-notifications", user?.id],
    queryFn: fetchMyAlertNotifications,
    enabled: active,
    staleTime: 60_000,
  });
  if (!active) return null;
  const unread = (data ?? []).filter((n) => !n.readAt && !n.dismissedAt && n.visibleOpportunity).length;
  return (
    <Link
      to="/alerts"
      aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground hover:bg-muted"
    >
      <Bell aria-hidden="true" className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] font-bold leading-5 text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
