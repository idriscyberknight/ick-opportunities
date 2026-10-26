import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AlertPreferencesPanel } from "../../src/components/alerts/AlertPreferencesPanel";
import {
  NotificationCenterPanel,
  type InboxNotification,
} from "../../src/components/alerts/NotificationCenterPanel";
import { DEFAULT_IN_APP_ALERT_PREFERENCES } from "../../src/lib/opportunity-alerts";

function markup(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(element);
}

describe("A1.8 Phase 3 inert alerts UI", () => {
  it("shows a nonfunctional opt-in form and explicitly says nothing is saved or sent", () => {
    const html = markup(createElement(AlertPreferencesPanel, { readOnly: true }));
    expect(DEFAULT_IN_APP_ALERT_PREFERENCES.enabled).toBe(false);
    expect(html).toContain("UI preview only");
    expect(html).toContain("No alerts are being sent");
    expect(html).toContain("<fieldset disabled");
    expect(html).toContain("Enable in-app opportunity alerts");
    expect(html).not.toContain("Save preferences");
  });

  it("does not claim a live inbox while the backend is unavailable", () => {
    const html = markup(
      createElement(NotificationCenterPanel, {
        state: { status: "unavailable" },
        readOnly: true,
      }),
    );
    expect(html).toContain("Notification Center is not live yet");
    expect(html).toContain("No user alerts are being generated");
    expect(html).not.toContain("Mark read");
  });

  it("renders loading, errors and disabled states without leaking notification items", () => {
    for (const status of ["loading", "error", "disabled"] as const) {
      const html = markup(createElement(NotificationCenterPanel, { state: { status }, readOnly: true }));
      expect(html).not.toContain("Mark read");
      expect(html).toContain("Inactive");
    }
  });

  it("shows an empty inbox with zero unread and no fabricated opportunity", () => {
    const html = markup(
      createElement(NotificationCenterPanel, {
        state: { status: "ready", items: [] },
        readOnly: true,
      }),
    );
    expect(html).toContain("0 unread");
    expect(html).toContain("No notifications yet");
    expect(html).not.toContain("University of Nowhere");
  });

  it("hides revoked opportunity details and disables state-changing actions in preview", () => {
    const item: InboxNotification = {
      id: "alert-revoked",
      kind: "saved_deadline",
      readAt: null,
      dismissedAt: null,
      createdAt: "2026-10-25T12:00:00Z",
      visibleOpportunity: null,
    };
    const html = markup(
      createElement(NotificationCenterPanel, {
        state: { status: "ready", items: [item] },
        readOnly: true,
      }),
    );
    expect(html).toContain("no longer publicly available");
    expect(html).toContain("Mark read");
    expect(html).toContain("disabled");
    expect(html).not.toContain("/opportunities/alert-revoked");
  });

  it("never exposes dismissed alerts as unread or visible entries", () => {
    const item: InboxNotification = {
      id: "dismissed",
      kind: "new_match",
      readAt: null,
      dismissedAt: "2026-10-26T09:00:00Z",
      createdAt: "2026-10-25T12:00:00Z",
      visibleOpportunity: null,
    };
    const html = markup(
      createElement(NotificationCenterPanel, {
        state: { status: "ready", items: [item] },
        readOnly: true,
      }),
    );
    expect(html).toContain("0 unread");
    expect(html).toContain("No notifications yet");
    expect(html).not.toContain("This opportunity is no longer publicly available");
  });
});
