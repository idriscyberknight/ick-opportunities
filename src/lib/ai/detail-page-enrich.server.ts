/**
 * Stage 2 of deterministic discovery: read an opportunity's own page and
 * pull description, deadline, eligibility and benefits. No AI involved.
 */
import { extractBenefits, extractEligibility, extractMetaDescription, findDeadlineFromText } from "./deterministic-enrichment.server";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&apos;|&rsquo;|&lsquo;/gi, "'").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

/** Readable main-body text: drops scripts, nav, header, footer, forms, and every tag. */
export function htmlToMainText(html: string): string {
  let body = html.replace(/<(script|style|noscript|svg|head|nav|header|footer|form|aside|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  const main = body.match(/<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (main?.[2] && main[2].length > 300) body = main[2];
  const text = body
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<[^>]*>?/g, " ");
  return decodeEntities(text).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function iso(y: string, mon: string, d: string): string | null {
  const m = MONTHS[mon.slice(0, 3).toLowerCase()];
  const day = Number(d);
  if (!m || day < 1 || day > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Deadline incl. ranges like "Application Dates: 10 January – 20 February 2026" (end date wins). */
export function findDeadlineExtended(text: string): string | null {
  const direct = findDeadlineFromText(text);
  if (direct) return direct;
  const ctx = /(application\s+(?:dates?|period|window)|applications?\s+(?:open|close|run)|apply\s+between)[^\n]{0,120}/gi;
  for (const m of text.matchAll(ctx)) {
    const seg = m[0];
    const dates = [...seg.matchAll(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s*(20\d{2})?|([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d{2})?/gi)];
    const yearM = seg.match(/20\d{2}(?![\s\S]*20\d{2})/);
    const year = yearM?.[0];
    const last = dates.at(-1);
    if (!last || !year) continue;
    const r = last[1] ? iso(last[3] ?? year, last[2]!, last[1]) : iso(last[6] ?? year, last[4]!, last[5]!);
    if (r) return r;
  }
  return null;
}

const BENEFIT_RX = /\b(covers?|covering|stipend|tuition|allowance|accommodation|airfare|air\s*ticket|health\s+insurance|fully[-\s]funded|salary|grant\s+of|award\s+of|benefits?\s+include)\b/i;
const ELIG_RX = /\b(open\s+to|eligible|eligibility|applicants?\s+must|candidates?\s+must|must\s+be|must\s+have|who\s+can\s+apply|citizens?\s+of|nationals?\s+of|member\s+countries|aims?\s+to\s+(?:support|enable))\b/i;

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
  const description = (meta && meta.length >= 60 ? decodeEntities(meta) : null) ?? (bodyStart.length >= 80 ? bodyStart : firstPara);
  return {
    description: description ? description.slice(0, 2000) : null,
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
