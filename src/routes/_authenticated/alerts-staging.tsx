import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AlertPreferencesPanel } from "@/components/alerts/AlertPreferencesPanel";
import {
  NotificationCenterPanel,
  type NotificationCenterState,
} from "@/components/alerts/NotificationCenterPanel";
import {
  fetchMyAlertNotifications,
  fetchMyAlertPreferences,
  isVerifiedAlertStagingBackend,
  saveMyAlertPreferences,
  updateMyAlertNotification,
} from "@/lib/alert-staging-client";
import type { InAppAlertPreferences } from "@/lib/opportunity-alerts";

/**
 * Hidden STAGING-ONLY preview:
 *  - never enters main navigation;
 *  - keeps all writes blocked unless actual build-time Supabase host matches
 *    exact ICK Security Staging backend host;
 *  - no delivery worker, email, SMS, push, cron, or fake alert data.
 *
 * Real signed-session RLS tests are still required before any production route.
 */
export const Route = createFileRoute("/_authenticated/alerts-staging")({
  head: () => ({
    meta: [
      { title: "Security Staging Alerts Test — ICK Opportunities" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AlertsStagingPage,
});

function AlertsStagingPage() {
  const { user, loading } = useAuth();
  const staging = isVerifiedAlertStagingBackend();

  if (!staging) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-14" role="status">
        <h1 className="font-display text-2xl font-bold">Alerts test is not available here</h1>
        <p className="mt-4 text-muted-foreground">
          This restricted preview works only on the separate Security Staging database.
          No preferences or notifications were changed.
        </p>
      </div>
    );
  }

  if (loading || !user) {
    return <p className="mx-auto max-w-3xl px-5 py-14" role="status">Checking your session…</p>;
  }

  // Tear down all local state when the signed-in account changes.
  return <AlertsStagingForAccount key={user.id} userId={user.id} />;
}

function AlertsStagingForAccount({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const prefsKey = ["a18-staging-alert-preferences", userId];
  const notificationsKey = ["a18-staging-alert-notifications", userId];

  const prefsQuery = useQuery({
    queryKey: prefsKey,
    queryFn: fetchMyAlertPreferences,
    staleTime: 0,
  });
  const [draft, setDraft] = useState<InAppAlertPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (prefsQuery.data) setDraft(prefsQuery.data);
  }, [prefsQuery.data]);

  const enabled = !!prefsQuery.data?.enabled;
  const notificationsQuery = useQuery({
    queryKey: notificationsKey,
    queryFn: fetchMyAlertNotifications,
    enabled,
    staleTime: 0,
  });

  const inbox: NotificationCenterState = prefsQuery.isLoading
    ? { status: "loading" }
    : prefsQuery.isError
      ? { status: "error" }
      : !enabled
        ? { status: "disabled" }
        : notificationsQuery.isLoading
          ? { status: "loading" }
          : notificationsQuery.isError
            ? { status: "error" }
            : { status: "ready", items: notificationsQuery.data ?? [] };

  async function handleSave() {
    if (!draft || saving) return;
    setMessage(null);
    setProblem(null);
    setSaving(true);
    try {
      const confirmed = await saveMyAlertPreferences(draft);
      setDraft(confirmed);
      await queryClient.invalidateQueries({ queryKey: prefsKey });
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
      setMessage(
        confirmed.enabled
          ? "Your in-app alert preference was saved and confirmed by Staging. No delivery worker is running."
          : "Alerts remain OFF. Your choice was confirmed by Staging.",
      );
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not save alert preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNotificationAction(id: string, action: "read" | "dismiss") {
    if (actionInFlight) return;
    setProblem(null);
    setActionInFlight(true);
    try {
      await updateMyAlertNotification(id, action);
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not update notification.");
    } finally {
      setActionInFlight(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <span className="rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-xs font-bold text-foreground">
          Security Staging only — not a public release
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Opportunity alerts — staging verification</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          You can test your own in-app preferences against the separate Staging database.
          Enabling this setting saves consent only; no scheduled notifications, emails,
          messages or push delivery are enabled.
        </p>
      </header>

      {problem && (
        <p role="alert" className="mt-5 rounded-xl border border-destructive p-4 text-sm text-destructive">
          {problem}
        </p>
      )}
      {message && (
        <p role="status" className="mt-5 rounded-xl border border-border p-4 text-sm text-foreground">
          {message}
        </p>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <div>
          <AlertPreferencesPanel
            {...(draft ? { value: draft } : {})}
            readOnly={!draft || saving || prefsQuery.isError}
            onChange={(next) => {
              setDraft(next);
              setMessage(null);
            }}
          />
          <button
            type="button"
            disabled={!draft || saving || prefsQuery.isError}
            onClick={() => void handleSave()}
            className="mt-4 min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save preferences in Staging"}
          </button>
        </div>
        <NotificationCenterPanel
          state={inbox}
          readOnly={actionInFlight || inbox.status !== "ready"}
          onMarkRead={(id) => void handleNotificationAction(id, "read")}
          onDismiss={(id) => void handleNotificationAction(id, "dismiss")}
        />
      </div>
    </div>
  );
}
