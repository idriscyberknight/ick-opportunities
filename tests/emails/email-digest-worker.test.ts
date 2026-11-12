import { expect, test, describe } from "bun:test";
import {
  buildDigestPayload,
  processEmailDigestQueue,
  SUPPORT_EMAIL,
  type EmailWorkerStore,
  type EmailRecipientPref,
  type EmailTransport,
} from "@/lib/email-digest-worker.server";
import type { Opportunity } from "@/lib/opportunities";
import type { ProfileData } from "@/lib/profile";

describe("Email Digest Worker Server Logic", () => {
  const mockNow = new Date("2026-11-09T08:00:00Z");
  const today = "2026-11-09";

  const sampleOpportunities: Opportunity[] = [
    {
      id: "opp-verified-1",
      title: "PTDF Overseas Masters Scholarship",
      category: "scholarship",
      organization: "PTDF Nigeria",
      country: "Nigeria",
      state: "Abuja",
      deadline: "2026-12-31",
      status: "active",
      verified_status: "verified",
      reviewed_at: "2026-11-01T00:00:00Z",
      reviewed_by: "admin-user",
      published_at: "2026-11-02T00:00:00Z",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-02T00:00:00Z",
      description: "Scholarship for engineering graduates in Nigeria",
      eligibility: "B.Sc first class or second class upper",
      benefits: "Full tuition and stipend",
      link: "https://example.com/apply",
      source_id: null,
      verification_notes: null,
    },
    {
      id: "opp-draft-2",
      title: "Unreviewed Fake Scholarship",
      category: "scholarship",
      organization: "Unknown Org",
      country: "Nigeria",
      state: null,
      deadline: "2026-12-31",
      status: "draft", // DRAFT: Must never be included
      verified_status: "pending_review",
      reviewed_at: null,
      reviewed_by: null,
      published_at: null,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-02T00:00:00Z",
      description: "Draft opportunity",
      eligibility: null,
      benefits: null,
      link: "https://example.com/draft",
      source_id: null,
      verification_notes: null,
    },
  ];

  const sampleRecipient: EmailRecipientPref = {
    user_id: "user-100",
    email: "applicant@example.com",
    name: "Amina Lawal",
    email_enabled: true,
    categories: ["scholarship"],
  };

  const sampleProfile: ProfileData = {
    full_name: "Amina Lawal",
    country: "Nigeria",
    state: "Kano",
    education_level: "undergraduate",
    field_of_study: "Computer Engineering",
    career_field: "Technology",
    skills: ["Python", "Engineering"],
    interests: ["Scholarships", "Coding"],
    opportunityTypes: ["scholarships"],
    remote_preference: "any",
  };

  test("uses ickopportunity@gmail.com as canonical support and replyTo address", () => {
    expect(SUPPORT_EMAIL).toBe("ickopportunity@gmail.com");
  });

  test("filters out unreviewed/draft opportunities strictly", () => {
    const payload = buildDigestPayload(
      sampleRecipient,
      sampleProfile,
      sampleOpportunities,
      today
    );

    expect(payload).not.toBeNull();
    expect(payload?.opportunities.length).toBe(1);
    expect(payload?.opportunities[0]?.id).toBe("opp-verified-1");
    expect(payload?.opportunities.some((o) => o.id === "opp-draft-2")).toBe(false);
  });

  test("returns null if recipient has disabled email notifications", () => {
    const disabledRecipient = { ...sampleRecipient, email_enabled: false };
    const payload = buildDigestPayload(
      disabledRecipient,
      sampleProfile,
      sampleOpportunities,
      today
    );
    expect(payload).toBeNull();
  });

  test("limits personalized results to the recipient's selected categories", () => {
    const job = {
      ...sampleOpportunities[0],
      id: "opp-job-3",
      title: "Engineering graduate job",
      category: "job" as const,
    };
    const payload = buildDigestPayload(
      { ...sampleRecipient, minimum_match_score: 0 },
      sampleProfile,
      [...sampleOpportunities, job],
      today,
      0,
    );
    expect(payload?.opportunities.map((item) => item.id)).toEqual(["opp-verified-1"]);
  });

  test("does not generate a digest without explicitly selected categories", () => {
    const payload = buildDigestPayload(
      { ...sampleRecipient, categories: [] },
      sampleProfile,
      sampleOpportunities,
      today,
    );
    expect(payload).toBeNull();
  });

  test("enforces the recipient's minimum match score with no category-only bypass", () => {
    const payload = buildDigestPayload(
      { ...sampleRecipient, minimum_match_score: 100 },
      sampleProfile,
      sampleOpportunities,
      today,
      0,
    );
    expect(payload).toBeNull();
  });

  test("does not invent match scores for users without a matching-ready profile", () => {
    const payload = buildDigestPayload(
      sampleRecipient,
      null,
      sampleOpportunities,
      today,
    );
    expect(payload).toBeNull();
  });

  test("excludes opportunities that are not yet published at the trusted send time", () => {
    const futurePublished = {
      ...sampleOpportunities[0],
      id: "opp-future",
      published_at: "2026-11-09T12:00:00Z",
    };
    const payload = buildDigestPayload(
      { ...sampleRecipient, minimum_match_score: 0 },
      sampleProfile,
      [...sampleOpportunities, futurePublished],
      today,
      0,
      5,
      "2026-11-09T08:00:00Z",
    );
    expect(payload?.opportunities.map((item) => item.id)).toEqual(["opp-verified-1"]);
  });

  test("processes email queue and dispatches email with replyTo ickopportunity@gmail.com", async () => {
    const sentCalls: any[] = [];
    const recordedRecords: any[] = [];

    const mockStore: EmailWorkerStore = {
      async listEligibleRecipients() {
        return [sampleRecipient];
      },
      async getProfile() {
        return sampleProfile;
      },
      async getLatestRecipient() {
        return sampleRecipient;
      },
      async listPublishedOpportunities() {
        return sampleOpportunities;
      },
      async recordDigestSent(userId, dateStr, ids) {
        recordedRecords.push({ userId, dateStr, ids });
      },
    };

    const mockTransport: EmailTransport = async (params) => {
      sentCalls.push(params);
      return { success: true, messageId: "msg-123" };
    };

    const result = await processEmailDigestQueue(mockStore, mockTransport, mockNow);

    expect(result.considered).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    expect(sentCalls.length).toBe(1);
    expect(sentCalls[0].to).toBe("applicant@example.com");
    expect(sentCalls[0].replyTo).toBe("ickopportunity@gmail.com");
    expect(sentCalls[0].subject).toContain("Scholarship");
    expect(sentCalls[0].html).toContain("PTDF Overseas Masters Scholarship");
    expect(sentCalls[0].html).toContain("Amina Lawal");

    expect(recordedRecords.length).toBe(1);
    expect(recordedRecords[0].userId).toBe("user-100");
  });
  test("fresh opt-out prevents a send even when the initial queue snapshot was enabled", async () => {
    let sends = 0;
    const store: EmailWorkerStore = {
      async listEligibleRecipients() {
        return [sampleRecipient];
      },
      async getProfile() {
        return sampleProfile;
      },
      async getLatestRecipient() {
        return { ...sampleRecipient, email_enabled: false };
      },
      async listPublishedOpportunities() {
        return sampleOpportunities;
      },
      async recordDigestSent() {
        throw new Error("must not record after opt-out");
      },
    };
    const result = await processEmailDigestQueue(
      store,
      async () => {
        sends++;
        return { success: true };
      },
      mockNow,
    );
    expect(result.sent).toBe(0);
    expect(result.skippedOptOut).toBe(1);
    expect(sends).toBe(0);
  });

  test("changed categories and score are applied immediately before email dispatch", async () => {
    const store: EmailWorkerStore = {
      async listEligibleRecipients() {
        return [sampleRecipient];
      },
      async getProfile() {
        return sampleProfile;
      },
      async getLatestRecipient() {
        return { ...sampleRecipient, categories: ["job"], minimum_match_score: 100 };
      },
      async listPublishedOpportunities() {
        return sampleOpportunities;
      },
      async recordDigestSent() {
        throw new Error("must not record if no live match");
      },
    };
    let sends = 0;
    const result = await processEmailDigestQueue(
      store,
      async () => {
        sends++;
        return { success: true };
      },
      mockNow,
    );
    expect(result.skippedNoMatches).toBe(1);
    expect(result.sent).toBe(0);
    expect(sends).toBe(0);
  });

  test("cross-account latest recipient response is rejected without sending", async () => {
    const store: EmailWorkerStore = {
      async listEligibleRecipients() {
        return [sampleRecipient];
      },
      async getProfile() {
        return sampleProfile;
      },
      async getLatestRecipient() {
        return { ...sampleRecipient, user_id: "different-user" };
      },
      async listPublishedOpportunities() {
        return sampleOpportunities;
      },
      async recordDigestSent() {
        throw new Error("no delivery should be recorded");
      },
    };
    let sends = 0;
    const result = await processEmailDigestQueue(
      store,
      async () => {
        sends++;
        return { success: true };
      },
      mockNow,
    );
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(sends).toBe(0);
  });

  test("a failed recipient read does not block later opted-in accounts", async () => {
    const second = { ...sampleRecipient, user_id: "user-200", email: "other@example.com" };
    const destinations: string[] = [];
    const store: EmailWorkerStore = {
      async listEligibleRecipients() {
        return [sampleRecipient, second];
      },
      async getProfile() {
        return sampleProfile;
      },
      async getLatestRecipient(userId) {
        if (userId === sampleRecipient.user_id) throw new Error("temporary read failure");
        return second;
      },
      async listPublishedOpportunities() {
        return sampleOpportunities;
      },
      async recordDigestSent() {},
    };
    const result = await processEmailDigestQueue(
      store,
      async ({ to }) => {
        destinations.push(to);
        return { success: true };
      },
      mockNow,
    );
    expect(result.considered).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(1);
    expect(destinations).toEqual(["other@example.com"]);
  });

});
