import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, LockKeyhole, ShieldCheck } from "lucide-react";
import { AlertPreferencesPanel } from "@/components/alerts/AlertPreferencesPanel";
import { NotificationCenterPanel } from "@/components/alerts/NotificationCenterPanel";

/**
 * Authenticated, UNLINKED preview only. No network or persistence adapter.
 * Do not add to primary navigation or claim alerts exist before release gates.
 */
export const Route = createFileRoute("/_authenticated/alerts-preview")({
  head: () => ({
    meta: [
      { title: "Alerts UI Preview (Inactive) — ICK Opportunities" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Design-only preview of an upcoming in-app notification service. No alerts are enabled.",
      },
    ],
  }),
  component: AlertsPreviewPage,
});

function AlertsPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-foreground">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Design preview only — not a live feature
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Opportunity alerts
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          See how in-app alerts could work in ICK Opportunities. This preview does not
          connect to any notification database, store your choices or send notifications.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AlertPreferencesPanel readOnly />
        <NotificationCenterPanel readOnly state={{ status: "unavailable" }} />
      </div>

      <aside className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6" aria-label="Alert privacy and launch notice">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-foreground">Privacy comes first</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Before launch, this feature must pass signed-account authorization tests,
              consent and opt-out checks, publication checks, and duplicate-prevention
              tests. None of those launch gates are bypassed by this preview.
            </p>
            <nav className="flex flex-wrap gap-4 pt-2" aria-label="Browse existing opportunity tools">
              <Link to="/recommended" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
                <BellRing className="h-4 w-4" aria-hidden="true" />
                Current recommendations
              </Link>
              <Link to="/saved" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
                Saved opportunities
              </Link>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}
