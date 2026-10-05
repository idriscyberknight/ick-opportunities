/**
 * Deterministic (no-AI) opportunity extraction used when AI is unavailable.
 * Uses structured data (JSON-LD JobPosting), heading/list/card selectors, and
 * keyword-filtered link extraction. Only returns what is literally on the page.
 */
export type FallbackItem = { title: string; link: string; deadline: string | null };

const KEYWORDS =
  /scholarship|fellowship|grant|internship|intern\b|vacanc|job|position|career opening|programme|program\b|award|bursary|funding|call for (applications|proposals)|apply|opportunit|recruit|hiring|officer|manager|analyst|engineer|assistant|consultant|specialist|coordinator/i;
const NAV =
  /^(home|about|about us|contact|contact us|login|log in|sign in|sign up|register|privacy|terms|faq|faqs|blog|news|search|menu|more|read more|learn more|apply now|apply|click here|view all|see all|next|previous|back|careers|jobs|opportunities|scholarships|grants|internships|fellowships)$/i;
const BAD_HREF = /^(mailto:|tel:|javascript:)|\.(pdf|jpg|jpeg|png|gif|zip|docx?)(\?|$)|\/(login|signin|signup|register|privacy|terms|contact|about|tag|category|author|search|feed)(\/|\?|$)|facebook\.com|twitter\.com|x\.com\/|linkedin\.com\/(share|company)|instagram\.com|youtube\.com|wa\.me|whatsapp/i;

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function findDeadline(text: string): string | null {
  const m = text.match(/(?:deadline|closing date|closes|apply by)[^0-9a-z]{0,10}(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*,?\s+(20\d{2})/i);
  if (m) {
    const mo = MONTHS[m[2]!.toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  const iso = text.match(/(?:deadline|closing date|closes|apply by)[^0-9]{0,10}(20\d{2}-\d{2}-\d{2})/i);
  return iso ? iso[1]! : null;
}

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
  const out: FallbackItem[] = [];
  const seen = new Set<string>();
  const srcNorm = absolute(sourceUrl, sourceUrl);
  const push = (title: string, link: string | null, deadline: string | null = null) => {
    title = decode(title).slice(0, 300);
    if (!link || link === srcNorm || out.length >= max) return;
    if (title.length < 12 || title.length > 200 || title.split(" ").length < 2 || NAV.test(title)) return;
    const k = link.toLowerCase().replace(/\/$/, "");
    if (seen.has(k) || seen.has(title.toLowerCase())) return;
    seen.add(k);
    seen.add(title.toLowerCase());
    out.push({ title, link, deadline });
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
          push(title, link, vt && /^\d{4}-\d{2}-\d{2}$/.test(vt) ? vt : null);
        }
        Object.values(o).forEach(walk);
      };
      walk(JSON.parse(m[1]!));
    } catch {
      /* invalid JSON-LD */
    }
  }

  // Remove noise regions (CSS-selector equivalent of excluding nav/header/footer/aside).
  const body = html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");

  // 2. Links inside headings (h1–h4) or elements with title/job/post/card/listing classes.
  for (const m of body.matchAll(/<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const a = m[2]!.match(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (a && !BAD_HREF.test(a[1]!)) {
      const ctx = body.slice(m.index!, m.index! + 1500);
      push(a[2]!, absolute(a[1]!, sourceUrl), findDeadline(decode(ctx)));
    }
  }

  // 3. Keyword-filtered anchor extraction for the remaining links.
  for (const m of body.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (out.length >= max) break;
    const href = m[1]!;
    if (BAD_HREF.test(href)) continue;
    const text = decode(m[2]!);
    if (!KEYWORDS.test(text) && !KEYWORDS.test(href)) continue;
    const ctx = body.slice(m.index!, m.index! + 800);
    push(text, absolute(href, sourceUrl), findDeadline(decode(ctx)));
  }
  return out;
}
