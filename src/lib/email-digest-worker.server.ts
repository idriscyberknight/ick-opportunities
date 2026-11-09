/**
 * ICK Opportunities: Server-side Email Digest Worker.
 * Generates personalized opportunity digests for opted-in users using
 * the multi-factor recommendation engine and English email template.
 *
 * Support/Reply-To: ickopportunity@gmail.com
 */
import type { Opportunity, OpportunityCategory } from "@/lib/opportunities";
import type { ProfileData } from "@/lib/profile";
import { rankOpportunities, type Recommendation } from "@/lib/matching";
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

export function buildDigestPayload(
  recipient: EmailRecipientPref,
  profile: ProfileData | null,
  opportunities: Opportunity[],
  today: string,
  minScore = DEFAULT_MIN_MATCH_SCORE,
  maxItems = DEFAULT_MAX_DIGEST_ITEMS,
): DigestEmailPayload | null {
  if (!recipient.email_enabled || !recipient.email) {
    return null;
  }

  // Filter opportunities strictly to published & non-expired
  const safeOpportunities = opportunities.filter((o) => {
    return (
      o.status === "active" &&
      o.verified_status === "verified" &&
      Boolean(o.reviewed_at && o.reviewed_by) &&
      Boolean(o.published_at && o.published_at <= `${today}T23:59:59.999Z`) &&
      (!o.deadline || o.deadline >= today)
    );
  });

  if (!safeOpportunities.length) {
    return null;
  }

  // If user has a matching profile, rank them
  let ranked: Recommendation[] = [];
  if (profile) {
    ranked = rankOpportunities(safeOpportunities, profile, minScore, today);
  }

  const matchedItems: DigestOpportunityItem[] = [];

  if (ranked.length > 0) {
    for (const rec of ranked.slice(0, maxItems)) {
      matchedItems.push({
        id: rec.opportunity.id,
        title: rec.opportunity.title,
        category: rec.opportunity.category,
        organization: rec.opportunity.organization,
        country: rec.opportunity.country,
        state: rec.opportunity.state,
        deadline: rec.opportunity.deadline,
        matchScore: rec.score,
        matchReasons: rec.reasons,
      });
    }
  } else if (recipient.categories && recipient.categories.length > 0) {
    const catSet = new Set(recipient.categories);
    const inCategory = safeOpportunities
      .filter((o) => catSet.has(o.category))
      .slice(0, maxItems);

    for (const opp of inCategory) {
      matchedItems.push({
        id: opp.id,
        title: opp.title,
        category: opp.category,
        organization: opp.organization,
        country: opp.country,
        state: opp.state,
        deadline: opp.deadline,
        matchScore: 60,
        matchReasons: [`Matches your subscribed category: ${opp.category}`],
      });
    }
  }

  if (matchedItems.length === 0) {
    return null;
  }

  return {
    recipient: {
      name: recipient.name || profile?.full_name || null,
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

    // Skip if already sent today
    if (recipient.last_digest_sent_at && recipient.last_digest_sent_at.startsWith(today)) {
      continue;
    }

    const profile = await store.getProfile(recipient.user_id);
    const payload = buildDigestPayload(
      recipient,
      profile,
      opportunities,
      today,
      minScore,
      maxItems,
    );

    if (!payload || payload.opportunities.length === 0) {
      result.skippedNoMatches++;
      continue;
    }

    const subject = getDigestSubject(payload);
    const html = renderOpportunityDigestHtml(payload);
    const text = renderOpportunityDigestText(payload);

    try {
      const sendRes = await transport({
        to: recipient.email,
        subject,
        html,
        text,
        replyTo: SUPPORT_EMAIL,
      });

      if (sendRes.success) {
        result.sent++;
        await store.recordDigestSent(
          recipient.user_id,
          today,
          payload.opportunities.map((o) => o.id),
        );
      } else {
        result.failed++;
      }
    } catch {
      result.failed++;
    }
  }

  return result;
}
