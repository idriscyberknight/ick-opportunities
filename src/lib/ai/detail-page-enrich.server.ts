/**
 * Stage 2 of deterministic discovery: read an opportunity's own page and
 * pull description, deadline, eligibility and benefits. No AI involved.
 */
import {
  extractBenefits,
  extractEligibility,
  extractMetaDescription,
  findDeadlineFromText,
  stripCookieAndPrivacyNotices,
} from "./deterministic-enrichment.server";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function decodeEntities(s: string): string {
  const decodeCodePoint = (value: string, radix: number) => {
    const codePoint = Number.parseInt(value, radix);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : " ";
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => decodeCodePoint(h, 16))
    .replace(/&#(\d+);/g, (_m, n: string) => decodeCodePoint(n, 10))
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&apos;|&rsquo;|&lsquo;|&#0?39;/gi, "'").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

/** Readable main-body text: drops scripts, nav, header, footer, forms, and every tag. */
export function htmlToMainText(html: string): string {
  let body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|head|nav|header|footer|form|aside|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  const main = body.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (main?.[2] && main[2].length > 300) body = main[2];
  const text = body
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<[^>]*>?/g, " ")
    .replace(/<[a-z!/][^>]*$/i, " ");
  return decodeEntities(text).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function iso(y: string, mon: string, d: string): string | null {
  const m = MONTHS[mon.slice(0, 3).toLowerCase()];
  const day = Number(d);
  const year = Number(y);
  if (!m || !Number.isInteger(year) || day < 1 || day > 31) return null;
  const candidate = new Date(Date.UTC(year, m - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== m - 1 || candidate.getUTCDate() !== day) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function validIsoDate(value: string): string | null {
  const match = /^(20\d{2})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
    ? value
    : null;
}

/** Deadline incl. ranges like "Application Dates: 10 January – 20 February 2026" (end date wins). */
export function findDeadlineExtended(text: string): string | null {
  const direct = findDeadlineFromText(text);
  if (direct) {
    const checked = validIsoDate(direct);
    if (checked) return checked;
  }
  const ctx = /(application\s+(?:dates?|period|window)|applications?\s+(?:open|close|run)|apply\s+between|closing\s+date|deadline)[^\n]{0,220}/gi;
  for (const m of text.matchAll(ctx)) {
    const seg = m[0];
    const dates = [...seg.matchAll(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s*(20\d{2})?|([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})?|(20\d{2}-\d{2}-\d{2})|(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})/gi)];
    const yearM = seg.match(/20\d{2}(?![\s\S]*20\d{2})/);
    const year = yearM?.[0];
    const last = dates.at(-1);
    if (!last) continue;
    if (last[7]) {
      const checked = validIsoDate(last[7]);
      if (checked) return checked;
    }
    if (last[8] && last[9] && last[10]) {
      const day = Number(last[8]);
      const month = Number(last[9]);
      const numericYear = Number(last[10]);
      const date = new Date(Date.UTC(numericYear, month - 1, day));
      if (date.getUTCFullYear() === numericYear && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
        return `${last[10]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
    const chosenYear = last[3] ?? last[6] ?? year;
    if (!chosenYear) continue;
    const result = last[1] && last[2] ? iso(chosenYear, last[2], last[1]) : last[4] && last[5] ? iso(chosenYear, last[4], last[5]) : null;
    if (result) return result;
  }
  return null;
}

const BENEFIT_RX = /\b(covers?|covering|stipend|tuition|allowance|accommodation|airfare|air\s*ticket|health\s+insurance|fully[-\s]funded|salary|grant\s+of|award\s+of|benefits?\s+include)\b/i;
const ELIG_RX = /\b(open\s+to|eligible|eligibility|applicants?\s+must|candidates?\s+must|must\s+be|must\s+have|who\s+can\s+apply|citizens?\s+of|nationals?\s+of|member\s+countries|aims?\s+to\s+(?:support|enable))\b/i;

const BAD_TITLE = /^(find\s+out\s+more|learn\s+more|read\s+more|apply\s+now|click\s+here|view\s+all|see\s+all|explore\s+more|discover\s+more|get\s+started|start\s+here|find\s+more|know\s+more|details|full\s+details|read\s+story|read\s+full\s+story|career\s+outcomes|student\s+life|campus\s+life|global\s+community|educational\s+excellence|short\s+courses|our\s+campus|leading\s+faculty|fully\s+funded|admissions?\s+timelines?|take\s+a\s+virtual\s+tour|see\s+upcoming\s+events[^\n]*|home|about|about\s+us|contact|contact\s+us|login|sign\s+in|register|privacy|terms|faq|faqs|search|menu|more|next|previous|back)$/i;

export function isWeakTitle(title: string): boolean {
  const normalized = title.trim().replace(/[>→»…\.]+/g, "").trim();
  return normalized.length < 8 || BAD_TITLE.test(normalized);
}

function cleanTitleBranding(title: string): string {
  return title
    .replace(/\s*[|\-–—:]\s*(?:KAUST|King Abdullah University[^|–—]*|Chevening|Commonwealth[^|–—]*|African Union|Home|Official Portal|Website|University|Admissions)[\s\S]*$/i, "")
    .replace(/^(?:KAUST|Welcome to)\s*[-–—:|]\s*/i, "")
    .trim();
}

export function extractPageTitle(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const metaTag = html.match(/<meta\s+[^>]*?(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*?content=["']([^"']+)["']/i)
    ?? html.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["'](?:og:title|twitter:title)["']/i);
  const candidates = [h1?.[1] ? htmlToMainText(h1[1]) : null, metaTag?.[1] ? decodeEntities(metaTag[1]) : null, titleTag?.[1] ? decodeEntities(titleTag[1]) : null];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const clean = cleanTitleBranding(candidate.replace(/\s+/g, " ").trim());
    if (clean.length >= 8 && clean.length <= 150 && !isWeakTitle(clean)) return clean;
  }
  return null;
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.replace(/^•\s*/, "").trim()).filter((s) => s.length >= 25 && s.length <= 500);
}

function pick(text: string, rx: RegExp, max = 600): string | null {
  const out: string[] = [];
  for (const s of sentences(text)) {
    if (rx.test(s) && !out.includes(s)) out.push(s);
    if (out.join(" ").length >= max || out.length >= 4) break;
  }
  const joined = out.join(" ").slice(0, max).trim();
  return joined.length >= 25 ? joined : null;
}

export interface DetailEnrichment {
  title: string | null;
  description: string | null;
  deadline: string | null;
  eligibility: string | null;
  benefits: string | null;
}

export function enrichFromDetailHtml(html: string): DetailEnrichment {
  const text = htmlToMainText(html);
  const meta = extractMetaDescription(html);
  const firstPara = sentences(text).find((s) => s.length >= 60) ?? null;
  const bodyStart = text.slice(0, 1500).replace(/\s+/g, " ").trim();
  const rawDesc = (meta && meta.length >= 60 ? decodeEntities(meta) : null) ?? (bodyStart.length >= 80 ? bodyStart : firstPara);
  const description = rawDesc ? stripCookieAndPrivacyNotices(rawDesc).slice(0, 2000) : null;
  return {
    title: extractPageTitle(html),
    description,
    deadline: findDeadlineExtended(text),
    eligibility: pick(text, ELIG_RX) ?? extractEligibility(text),
    benefits: pick(text, BENEFIT_RX) ?? extractBenefits(text),
  };
}

const GENERIC_DESC = /Discovered (?:from|via) official|Check the official portal for full|Visit the official portal for full|<\w|&#x?\w+;/i;

export function needsEnrichment(it: { description: string | null; deadline: string | null; eligibility: string | null; benefits: string | null }): boolean {
  return !it.deadline || !it.eligibility || !it.benefits || !it.description || it.description.length < 120 || GENERIC_DESC.test(it.description);
}

/** Fetch and enrich one detail page; never throws (returns null on failure). */
export async function fetchDetailEnrichment(url: string, timeoutMs = 8000): Promise<DetailEnrichment | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ICKOpportunitiesBot/1.0 (+opportunity discovery)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok || !/html/i.test(res.headers.get("content-type") ?? "html")) return null;
    const html = (await res.text()).slice(0, 600_000);
    return enrichFromDetailHtml(html);
  } catch {
    return null;
  }
                                                              }
