/**
 * ICK Opportunities: Server-side Email Digest Worker.
 * Generates personalized opportunity digests for opted-in users using
 * the multi-factor recommendation engine and English email template.
 *
 * Support/Reply-To: ickopportunity@gmail.com
 */
import type { Opportunity, OpportunityCategory } from "@/lib/opportunities";
import type { ProfileData } from "@/lib/profile";
import { isProfileReadyForMatching, rankOpportunities } from "@/lib/matching";
import {
  renderOpportunityDigestHtml,
  renderOpportunityDigestText,
  getDigestSubject,
  type DigestEmailPayload,
  type DigestOpportunityItem,
} from "@/lib/emails/opportunity-digest";

export const SUPPORT_EMAIL = "ickopportunity@gmail.com";
export const DEFAULT_MAX_DIGEST_ITEMS = 5;
export const DEFAULT_MIN_MATCH_SCORE = 50;

export interface EmailRecipientPref {
  user_id: string;
  email: string;
  name?: string | null;
  email_enabled: boolean;
  categories?: OpportunityCategory[];
  minimum_match_score?: number;
  last_digest_sent_at?: string | null;
}

export interface EmailWorkerStore {
  listEligibleRecipients(limit: number): Promise<EmailRecipientPref[]>;
  getProfile(userId: string): Promise<ProfileData | null>;
  /** Fresh read from authoritative consent store, never a stale queue snapshot. */
  getLatestRecipient(userId: string): Promise<EmailRecipientPref | null>;
  listPublishedOpportunities(nowIso: string, today: string): Promise<Opportunity[]>;
  recordDigestSent(userId: string, dateStr: string, opportunityIds: string[]): Promise<void>;
}

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type EmailTransport = (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo: string;
}) => Promise<EmailSendResult>;

export interface DigestWorkerRunResult {
  considered: number;
  sent: number;
  skippedNoMatches: number;
  skippedOptOut: number;
  failed: number;
}

const ALLOWED_EMAIL_CATEGORIES = new Set<OpportunityCategory>([
  "scholarship",
  "job",
  "internship",
  "grant",
]);

/**
 * A personalized digest requires an explicit email opt-in, selected categories,
 * and a match-ready profile. Never bypass the recipient's score threshold or
 * substitute a made-up match score when ranking finds no matches.
 *
 * The calling server supplies its trusted current timestamp as `asOfIso`
 * so same-day future publications cannot appear in scheduled emails.
 */
export function buildDigestPayload(
  recipient: EmailRecipientPref,
  profile: ProfileData | null,
  opportunities: Opportunity[],
  today: string,
  minScore = DEFAULT_MIN_MATCH_SCORE,
  maxItems = DEFAULT_MAX_DIGEST_ITEMS,
  asOfIso = `${today}T00:00:00.000Z`,
): DigestEmailPayload | null {
  const categories = recipient.categories;
  if (
    !recipient.email_enabled ||
    !recipient.email?.trim() ||
    !Array.isArray(categories) ||
    categories.length === 0 ||
    categories.length > 4 ||
    categories.some((category) => !ALLOWED_EMAIL_CATEGORIES.has(category))
  ) {
    return null;
  }
  const threshold = recipient.minimum_match_score ?? minScore;
  if (
    !Number.isInteger(threshold) ||
    threshold < 0 ||
    threshold > 100 ||
    !Number.isInteger(maxItems) ||
    maxItems < 1 ||
    maxItems > 50 ||
    !profile ||
    !isProfileReadyForMatching(profile) ||
    !Number.isFinite(Date.parse(asOfIso))
  ) {
    return null;
  }

  const selectedCategories = new Set(categories);
  const asOfMs = Date.parse(asOfIso);
  const safeOpportunities = opportunities.filter((o) => {
    return (
      selectedCategories.has(o.category) &&
      o.status === "active" &&
      o.verified_status === "verified" &&
      Boolean(o.reviewed_at && o.reviewed_by) &&
      Boolean(o.published_at && Date.parse(o.published_at) <= asOfMs) &&
      (!o.deadline || o.deadline >= today)
    );
  });
  if (safeOpportunities.length === 0) return null;

  const matchedItems: DigestOpportunityItem[] = rankOpportunities(
    safeOpportunities,
    profile,
    threshold,
    today,
  )
    .slice(0, maxItems)
    .map((rec) => ({
      id: rec.opportunity.id,
      title: rec.opportunity.title,
      category: rec.opportunity.category,
      organization: rec.opportunity.organization,
      country: rec.opportunity.country,
      state: rec.opportunity.state,
      deadline: rec.opportunity.deadline,
      matchScore: rec.score,
      matchReasons: rec.reasons,
    }));

  if (!matchedItems.length) return null;
  return {
    recipient: {
      name: recipient.name || profile.full_name || null,
      email: recipient.email,
    },
    opportunities: matchedItems,
  };
}

export async function processEmailDigestQueue(
  store: EmailWorkerStore,
  transport: EmailTransport,
  now: Date,
  options: { batchLimit?: number; minScore?: number; maxItems?: number } = {},
): Promise<DigestWorkerRunResult> {
  const batchLimit = options.batchLimit ?? 50;
  const minScore = options.minScore ?? DEFAULT_MIN_MATCH_SCORE;
  const maxItems = options.maxItems ?? DEFAULT_MAX_DIGEST_ITEMS;

  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);

  const [recipients, opportunities] = await Promise.all([
    store.listEligibleRecipients(batchLimit),
    store.listPublishedOpportunities(nowIso, today),
  ]);

  const result: DigestWorkerRunResult = {
    considered: recipients.length,
    sent: 0,
    skippedNoMatches: 0,
    skippedOptOut: 0,
    failed: 0,
  };

  for (const recipient of recipients) {
    if (!recipient.email_enabled) {
      result.skippedOptOut++;
      continue;
    }
    // The initial queue snapshot may be stale; a completed send is not evidence
    // of email-specific consent unless the trusted store re-verifies it.
    if (recipient.last_digest_sent_at?.startsWith(today)) continue;

    try {
      const profile = await store.getProfile(recipient.user_id);
      // Re-read consent, destination email, filters and daily-send state directly
      // before building the outgoing email. Never send from the queue snapshot.
      const latest = await store.getLatestRecipient(recipient.user_id);
      if (latest && latest.user_id !== recipient.user_id) {
        throw new Error("cross-account email recipient mismatch");
      }
      if (!latest || !latest.email_enabled) {
        result.skippedOptOut++;
        continue;
      }
      if (latest.last_digest_sent_at?.startsWith(today)) continue;

      const payload = buildDigestPayload(
        latest,
        profile,
        opportunities,
        today,
        minScore,
        maxItems,
        nowIso,
      );
      if (!payload) {
        result.skippedNoMatches++;
        continue;
      }

      const sendRes = await transport({
        to: latest.email,
        subject: getDigestSubject(payload),
        html: renderOpportunityDigestHtml(payload),
        text: renderOpportunityDigestText(payload),
        replyTo: SUPPORT_EMAIL,
      });
      if (!sendRes.success) {
        result.failed++;
        continue;
      }

      // Still requires a durable delivery claim / provider idempotency before
      // production use: a crash after sending can otherwise trigger a retry.
      await store.recordDigestSent(
        recipient.user_id,
        today,
        payload.opportunities.map((o) => o.id),
      );
      result.sent++;
    } catch {
      // Fail the affected account; never abort all subsequent recipients.
      result.failed++;
    }
  }

  return result;
}
