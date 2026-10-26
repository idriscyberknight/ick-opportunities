import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

export type InboxNotification = {
  id: string;
  kind: "new_match" | "saved_deadline";
  createdAt: string;
  readAt: string | null;
  dismissedAt: string | null;
  /**
   * This must be populated ONLY from a fresh query that passes the existing
   * public opportunities RLS gate. A revoked listing MUST result in null.
   * Never copy protected opportunity fields into notification rows.
   */
  visibleOpportunity: { id: string; title: string } | null;
};

export type NotificationCenterState =
  | { status: "unavailable" | "loading" | "error" | "disabled" }
  | { status: "ready"; items: readonly InboxNotification[] };

const kindLabel = (kind: InboxNotification["kind"]) =>
  kind === "new_match" ? "New matching opportunity" : "Saved deadline reminder";

const statusText = {
  unavailable: {
    title: "Notification Center is not live yet",
    description: "This is a design preview. No user alerts are being generated or delivered.",
  },
  loading: {
    title: "Loading notifications",
    description: "Your notification list is loading.",
  },
  error: {
    title: "We couldn't load notifications",
    description: "Your alerts may be temporarily unavailable. Try again when the service is ready.",
  },
  disabled: {
    title: "Opportunity alerts are turned off",
    description: "No notifications will be generated unless you explicitly enable alerts.",
  },
} as const;

/**
 * UI-only component. It never fetches, sends, schedules, or persists notifications.
 * In production a trusted backend must recheck opt-in and opportunity visibility
 * before providing the view-model or acting on a mark-read/dismiss request.
 */
export function NotificationCenterPanel({
  state,
  readOnly,
  onMarkRead,
  onDismiss,
}: {
  state: NotificationCenterState;
  readOnly: boolean;
  onMarkRead?: (notificationId: string) => void;
  onDismiss?: (notificationId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const items = state.status === "ready" ? state.items : [];
  const available = items.filter((item) => item.dismissedAt === null);
  const unread = available.filter((item) => item.readAt === null);
  const shown = filter === "unread" ? unread : available;

  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <section
      aria-labelledby="a18-notification-center-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="a18-notification-center-title"
            className="font-display text-xl font-bold text-foreground"
          >
            Notification Center
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Reminders and newly published opportunities relevant to you. Alerts do not guarantee
            eligibility.
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
          {state.status === "ready" ? `${unread.length} unread` : "Inactive"}
        </span>
      </div>

      {state.status !== "ready" ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center"
        >
          {state.status === "loading" ? (
            <Loader2
              aria-hidden="true"
              className="mx-auto h-8 w-8 animate-spin text-muted-foreground"
            />
          ) : state.status === "disabled" ? (
            <BellOff aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
          ) : state.status === "error" ? (
            <ShieldAlert aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
          ) : (
            <Inbox aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
          )}
          <h3 className="mt-4 font-display text-lg font-bold text-foreground">
            {statusText[state.status].title}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {statusText[state.status].description}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${focus} ${
                  filter === key
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                {key === "all" ? "All" : `Unread (${unread.length})`}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div
              role="status"
              className="mt-6 rounded-xl border border-dashed border-border px-6 py-10 text-center"
            >
              <Bell aria-hidden="true" className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 font-semibold text-foreground">
                {filter === "unread" ? "You're all caught up" : "No notifications yet"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                New updates will appear here only after alerts are enabled and the service is
                launched.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {shown.map((item) => (
                <li key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
                      {item.kind === "saved_deadline" ? (
                        <CalendarClock className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{kindLabel(item.kind)}</h3>
                        {item.readAt === null ? (
                          <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
                            Unread
                          </span>
                        ) : null}
                      </div>

                      {item.visibleOpportunity ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {item.kind === "saved_deadline"
                              ? "Check the official deadline before applying."
                              : "Check eligibility and the original announcement before applying."}
                          </p>
                          <Link
                            to="/opportunities/$id"
                            params={{ id: item.visibleOpportunity.id }}
                            className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline ${focus}`}
                          >
                            {item.visibleOpportunity.title}{" "}
                            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                          </Link>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground" role="status">
                          This opportunity is no longer publicly available. Its details are hidden.
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.readAt === null ? (
                          <button
                            type="button"
                            disabled={readOnly || !onMarkRead}
                            onClick={() => onMarkRead?.(item.id)}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
                          >
                            <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark read
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={readOnly || !onDismiss}
                          onClick={() => onDismiss?.(item.id)}
                          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
