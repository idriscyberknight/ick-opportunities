/**
 * Deterministic (no-AI) opportunity extraction used when AI is unavailable.
 * Uses structured data (JSON-LD JobPosting), heading/list/card selectors, and
 * keyword-filtered link extraction. Also natively supports RSS, Atom and XML Sitemaps.
 */
import { isXmlFeedOrSitemap, extractFeedOrSitemap } from "./rss-sitemap-extract.server";
import {
  cleanText as decode,
  findDeadlineFromText as findDeadline,
  extractEligibility,
  extractBenefits,
  extractMetaDescription,
} from "./deterministic-enrichment.server";

export type FallbackItem = {
  title: string;
  link: string;
  deadline: string | null;
  description?: string | undefined;
  categoryHint?: string | null;
  eligibility?: string | null;
  benefits?: string | null;
};

const KEYWORDS =
  /scholarship|fellowship|grant|internship|intern\b|vacanc|job|position|career opening|programme|program\b|award|bursary|funding|call for (applications|proposals)|apply|opportunit|recruit|hiring|officer|manager|analyst|engineer|assistant|consultant|specialist|coordinator|phd|master/i;
const NAV =
  /^(home|about|about us|contact|contact us|login|log in|sign in|sign up|register|privacy|terms|faq|faqs|blog|news|search|menu|more|read more|learn more|apply now|apply|click here|view all|see all|explore more|discover more|get started|start here|find out more|find more|know more|details|full details|read story|read full story|next|previous|back|career outcomes|student life|campus life|global community|educational excellence|short courses|our campus|leading faculty|fully funded|admissions? timelines?|careers|jobs|opportunities|scholarships|grants|internships|fellowships)$/i;
const BAD_HREF = /^(mailto:|tel:|javascript:)|\.(pdf|jpg|jpeg|png|gif|zip|docx?)(\?|$)|\/(login|signin|signup|register|privacy|terms|contact|about(?:-[^/]+)?|tag|category|author|search|feed|publications?|news|blog|events?|press|media|page\/\d+|alumni|faculty|staff|life-at[^/]*|campus-life|campus|timelines?|career-outcomes|community|leadership|giving|donate|how-to-apply|fees-funding|virtual-tour)(\/|\?|$)|alumni\.|facebook\.com|twitter\.com|x\.com\/|linkedin\.com\/(share|company)|instagram\.com|youtube\.com|wa\.me|whatsapp/i;

function absolute(href: string, base: string): string | null {
  try {
    const u = new URL(href.trim(), base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function extractFallback(html: string, sourceUrl: string, max = 15): FallbackItem[] {
  // 0. Check if the page is an RSS / Atom feed or XML Sitemap
  if (isXmlFeedOrSitemap(html)) {
    const feedItems = extractFeedOrSitemap(html, max);
    if (feedItems.length > 0) {
      return feedItems.map((fi) => ({
        title: fi.title,
        link: fi.link,
        deadline: fi.deadline,
        description: fi.description,
        categoryHint: fi.categoryHint,
        eligibility: fi.eligibility ?? null,
        benefits: fi.benefits ?? null,
      }));
    }
  }

  const out: FallbackItem[] = [];
  const seen = new Set<string>();
  const srcNorm = absolute(sourceUrl, sourceUrl);
  const pageMetaDesc = extractMetaDescription(html);

  const push = (
    title: string,
    link: string | null,
    deadline: string | null = null,
    contextText = ""
  ) => {
    title = decode(title).slice(0, 300);
    if (!link || link === srcNorm || out.length >= max) return;
    const genericAnchorForOpportunityPath = NAV.test(title) && KEYWORDS.test(link);
    if (title.length < 12 || title.length > 200 || title.split(" ").length < 2 || (NAV.test(title) && !genericAnchorForOpportunityPath)) return;
    const k = link.toLowerCase().replace(/\/$/, "");
    if (seen.has(k) || seen.has(title.toLowerCase())) return;
    seen.add(k);
    seen.add(title.toLowerCase());

    const description = contextText.length > 30 ? contextText.slice(0, 1500) : (pageMetaDesc ?? undefined);
    const eligibility = extractEligibility(contextText);
    const benefits = extractBenefits(contextText);

    out.push({
      title,
      link,
      deadline,
      description,
      eligibility,
      benefits,
    });
  };

  // 1. Structured data: JSON-LD JobPosting / Event / Course items.
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: unknown): void => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) return n.forEach(walk);
        const o = n as Record<string, unknown>;
        const t = String(o["@type"] ?? "");
        if (/JobPosting|Scholarship|Grant|EducationalOccupationalProgram/i.test(t)) {
          const title = String(o["title"] ?? o["name"] ?? "");
          const link = absolute(String(o["url"] ?? ""), sourceUrl);
          const vt = typeof o["validThrough"] === "string" ? o["validThrough"].slice(0, 10) : null;
          const dl = vt && /^\d{4}-\d{2}-\d{2}$/.test(vt) ? vt : null;
          const desc = String(o["description"] ?? "");
          push(title, link, dl, decode(desc));
        }
        Object.values(o).forEach(walk);
      };
      walk(JSON.parse(m[1]!));
    } catch {
      /* invalid JSON-LD */
    }
  }

  // Remove noise regions
  const body = html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");

  // 2. Links inside headings (h1–h4)
  for (const m of body.matchAll(/<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const a = m[2]!.match(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (a && !BAD_HREF.test(a[1]!)) {
      const ctx = decode(body.slice(m.index!, m.index! + 1500));
      push(a[2]!, absolute(a[1]!, sourceUrl), findDeadline(ctx), ctx);
    }
  }

  // 3. Keyword-filtered anchor extraction
  for (const m of body.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (out.length >= max) break;
    const href = m[1]!;
    if (BAD_HREF.test(href)) continue;
    const text = decode(m[2]!);
    if (!KEYWORDS.test(text) && !KEYWORDS.test(href)) continue;
    const ctx = decode(body.slice(m.index!, m.index! + 1000));
    push(text, absolute(href, sourceUrl), findDeadline(ctx), ctx);
  }

  return out;
      }
