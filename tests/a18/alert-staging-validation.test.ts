import { describe, expect, it } from "bun:test";
import { validateDraftAlertPreferences } from "../../src/lib/alert-staging-client";
import { DEFAULT_IN_APP_ALERT_PREFERENCES } from "../../src/lib/opportunity-alerts";

describe("A1.8 staging client consent validation (offline, no Cloud access)", () => {
  it("defaults to an explicit OFF consent state", () => {
    expect(DEFAULT_IN_APP_ALERT_PREFERENCES.enabled).toBe(false);
    expect(() => validateDraftAlertPreferences(DEFAULT_IN_APP_ALERT_PREFERENCES)).not.toThrow();
  });
  it("accepts a valid explicit in-app consent with selected categories", () => {
    expect(() =>
      validateDraftAlertPreferences({
        ...DEFAULT_IN_APP_ALERT_PREFERENCES,
        enabled: true,
        categories: ["scholarship", "grant"],
        deadlineLeadDays: [1, 3, 7],
        minimumMatchScore: 65,
      }),
    ).not.toThrow();
  });
  it("rejects invalid score, reminder days and duplicate inputs", () => {
    for (const minimumMatchScore of [-1, 100.5, 101, NaN]) {
      expect(() => validateDraftAlertPreferences({
        ...DEFAULT_IN_APP_ALERT_PREFERENCES, minimumMatchScore,
      })).toThrow();
    }
    for (const deadlineLeadDays of [[], [1, 1], [2], [1, 2, 7]]) {
      expect(() => validateDraftAlertPreferences({
        ...DEFAULT_IN_APP_ALERT_PREFERENCES, deadlineLeadDays,
      })).toThrow();
    }
    expect(() => validateDraftAlertPreferences({
      ...DEFAULT_IN_APP_ALERT_PREFERENCES,
      categories: ["scholarship", "scholarship"],
    })).toThrow();
  });
  it("does not treat a missing or invalid opt-in flag as user consent", () => {
    expect(() => validateDraftAlertPreferences({
      ...DEFAULT_IN_APP_ALERT_PREFERENCES,
      enabled: "true" as unknown as boolean,
    })).toThrow();
  });
});
