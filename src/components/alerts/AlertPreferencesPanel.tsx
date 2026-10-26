import type { OpportunityCategory } from "@/lib/opportunities";
import {
  DEFAULT_IN_APP_ALERT_PREFERENCES,
  type InAppAlertPreferences,
} from "@/lib/opportunity-alerts";
import { Bell, CalendarClock, LockKeyhole, SlidersHorizontal } from "lucide-react";

const CATEGORY_OPTIONS: ReadonlyArray<{ value: OpportunityCategory; label: string }> = [
  { value: "scholarship", label: "Scholarships" },
  { value: "job", label: "Jobs" },
  { value: "internship", label: "Internships" },
  { value: "grant", label: "Grants" },
];

const LEAD_DAYS = [7, 3, 1] as const;

/**
 * Purely presentational until a trusted, RLS-verified persistence adapter exists.
 *
 * `readOnly` MUST remain true on the design preview. An interactive form
 * is NOT a database write and never constitutes notification consent.
 */
export function AlertPreferencesPanel({
  value = DEFAULT_IN_APP_ALERT_PREFERENCES,
  readOnly,
  onChange,
}: {
  value?: Readonly<InAppAlertPreferences>;
  readOnly: boolean;
  onChange?: (next: InAppAlertPreferences) => void;
}) {
  const disabled = readOnly || !onChange;
  const assign = (patch: Partial<InAppAlertPreferences>) => {
    if (disabled) return;
    onChange?.({ ...value, ...patch });
  };

  const card = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
  const row = "flex min-h-11 items-start gap-3 rounded-xl border border-border px-4 py-3";
  const checkbox = "mt-1 h-4 w-4 shrink-0 accent-primary";
  return (
    <section aria-labelledby="alert-settings-heading" className={card}>
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary" aria-hidden="true">
          <SlidersHorizontal className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="alert-settings-heading" className="font-display text-xl font-bold text-foreground">
            Your alert preferences
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Choose the opportunity alerts you want to receive. Alerts are off unless you
            explicitly turn them on after this feature is launched.
          </p>
        </div>
      </div>

      {disabled ? (
        <p role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-relaxed text-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          UI preview only — settings are disabled and cannot be saved. No alerts are being sent.
        </p>
      ) : (
        <p className="mt-5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground" role="status">
          Editing a setting does not save it. A secure Save action with confirmed server response
          must be provided before this feature is released.
        </p>
      )}

      <fieldset disabled={disabled} className="mt-6 space-y-6">
        <legend className="sr-only">In-app alerts preferences</legend>
        <label className={row}>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) => assign({ enabled: event.currentTarget.checked })}
            className={checkbox}
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Enable in-app opportunity alerts
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
              Explicit opt-in required. No email, SMS or push notifications.
            </span>
          </span>
        </label>

        <div>
          <h3 className="text-sm font-bold text-foreground">Alert types</h3>
          <div className="mt-3 space-y-3">
            <label className={row}>
              <input
                type="checkbox"
                checked={value.newMatchesEnabled}
                onChange={(event) => assign({ newMatchesEnabled: event.currentTarget.checked })}
                className={checkbox}
              />
              <span className="text-sm text-foreground">New opportunities matching your profile</span>
            </label>
            <label className={row}>
              <input
                type="checkbox"
                checked={value.savedDeadlineRemindersEnabled}
                onChange={(event) =>
                  assign({ savedDeadlineRemindersEnabled: event.currentTarget.checked })
                }
                className={checkbox}
              />
              <span className="flex items-center gap-2 text-sm text-foreground">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                Reminders for opportunities you saved
              </span>
            </label>
          </div>
        </div>

        <div>
          <h3 id="alert-categories-label" className="text-sm font-bold text-foreground">
            Opportunity categories
          </h3>
          <div aria-labelledby="alert-categories-label" className="mt-3 grid gap-3 sm:grid-cols-2">
            {CATEGORY_OPTIONS.map(({ value: category, label }) => (
              <label key={category} className={row}>
                <input
                  type="checkbox"
                  className={checkbox}
                  checked={value.categories.includes(category)}
                  onChange={(event) =>
                    assign({
                      categories: event.currentTarget.checked
                        ? [...value.categories, category]
                        : value.categories.filter((item) => item !== category),
                    })
                  }
                />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border px-4 py-4">
          <label className="block text-sm font-bold text-foreground" htmlFor="a18-minimum-score">
            Minimum relevance score: {value.minimumMatchScore}/100
          </label>
          <input
            id="a18-minimum-score"
            type="range"
            min={0}
            max={100}
            step={5}
            value={value.minimumMatchScore}
            disabled={disabled}
            onChange={(event) => assign({ minimumMatchScore: Number(event.currentTarget.value) })}
            className="mt-4 w-full accent-primary"
            aria-describedby="a18-score-explainer"
          />
          <p id="a18-score-explainer" className="mt-2 text-xs leading-relaxed text-muted-foreground">
            This is matching relevance, not a guarantee of eligibility or acceptance.
          </p>
        </div>

        <div>
          <h3 id="alert-reminders-label" className="text-sm font-bold text-foreground">
            Saved deadline reminders
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Select the time windows before a listed application deadline.
          </p>
          <div aria-labelledby="alert-reminders-label" className="mt-3 flex flex-wrap gap-3">
            {LEAD_DAYS.map((day) => (
              <label key={day} className={row}>
                <input
                  type="checkbox"
                  className={checkbox}
                  checked={value.deadlineLeadDays.includes(day)}
                  onChange={(event) =>
                    assign({
                      deadlineLeadDays: event.currentTarget.checked
                        ? [...value.deadlineLeadDays, day].sort((a, b) => a - b)
                        : value.deadlineLeadDays.filter((x) => x !== day),
                    })
                  }
                />
                <span className="text-sm font-medium text-foreground">
                  {day} {day === 1 ? "day" : "days"} before
                </span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>
    </section>
  );
}
