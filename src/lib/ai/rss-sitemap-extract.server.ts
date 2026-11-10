/**
 * International Corporate RSS, Atom & Sitemap Extraction Engine.
 * 
 * Deterministically parses structured feeds and sitemaps from official
 * international institutions (e.g. IsDB, Commonwealth, UN, African Union, DAAD)
 * with zero AI credit consumption and zero hallucinations.
 */

export type ExtractedFeedItem = {
  title: string;
  link: string;
  description: string;
  deadline: string | null;
  pubDate: string | null;
  categoryHint: string | null;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Wanke rubutun CDATA da alamomin HTML domin samun tsattsarkan rubutu.
 */
export function cleanXmlText(s: string): string {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Zakulo ranar ƙarewar aiki daga rubutu (misali: 30 November 2026 ko 2026-12-15).
 */
export function findDeadlineFromText(text: string): string | null {
  const m = text.match(/(?:deadline|closing date|closes|apply by|end date)[^0-9a-z]{0,12}(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*,?\s+(20\d{2})/i);
  if (m) {
    const mo = MONTHS[m[2]!.toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  const iso = text.match(/(?:deadline|closing date|closes|apply by|end date)[^0-9]{0,12}(20\d{2}-\d{2}-\d{2})/i);
  return iso ? iso[1]! : null;
}

/**
 * Tabbatar da cewa shafin da aka sauko XML Feed ne ko Sitemap.
 */
export function isXmlFeedOrSitemap(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 1500).toLowerCase();
  return (
    sample.includes("<rss") ||
    sample.includes("<feed") ||
    sample.includes("<urlset") ||
    sample.includes("<sitemapindex") ||
    (sample.includes("<?xml") && (sample.includes("<channel") || sample.includes("<entry") || sample.includes("<url")))
  );
}

/**
 * Tace RSS 2.0 Feeds.
 */
export function parseRssFeed(xml: string, max = 25): ExtractedFeedItem[] {
  const out: ExtractedFeedItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    if (out.length >= max) break;
    const block = match[1]!;

    const titleM = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const linkM = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
    const descM = block.match(/<(?:content:encoded|description)\b[^>]*>([\s\S]*?)<\/(?:content:encoded|description)>/i);
    const pubDateM = block.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i);
    const catM = block.match(/<category\b[^>]*>([\s\S]*?)<\/category>/i);

    const title = cleanXmlText(titleM ? titleM[1]! : "").slice(0, 300);
    let link = (linkM ? linkM[1]! : "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
    if (!link.startsWith("http://") && !link.startsWith("https://")) continue;

    const rawDesc = descM ? descM[1]! : "";
    const description = cleanXmlText(rawDesc).slice(0, 2000);
    const deadline = findDeadlineFromText(description) || findDeadlineFromText(title);
    const pubDate = pubDateM ? cleanXmlText(pubDateM[1]!) : null;
    const categoryHint = catM ? cleanXmlText(catM[1]!) : null;

    if (title.length >= 8 && link) {
      out.push({ title, link, description, deadline, pubDate, categoryHint });
    }
  }
  return out;
}

/**
 * Tace Atom 1.0 Feeds (wanda Majalisar Dinkin Duniya da hukumomin Turai ke yawan amfani da shi).
 */
export function parseAtomFeed(xml: string, max = 25): ExtractedFeedItem[] {
  const out: ExtractedFeedItem[] = [];
  const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    if (out.length >= max) break;
    const block = match[1]!;

    const titleM = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const linkHrefM = block.match(/<link\b[^>]*href=["']([^"']+)["']/i);
    const linkTagM = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
    const descM = block.match(/<(?:summary|content)\b[^>]*>([\s\S]*?)<\/(?:summary|content)>/i);
    const updatedM = block.match(/<(?:updated|published)\b[^>]*>([\s\S]*?)<\/(?:updated|published)>/i);
    const catM = block.match(/<category\b[^>]*term=["']([^"']+)["']/i);

    const title = cleanXmlText(titleM ? titleM[1]! : "").slice(0, 300);
    let link = (linkHrefM ? linkHrefM[1]! : (linkTagM ? linkTagM[1]! : "")).trim();
    link = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
    if (!link.startsWith("http://") && !link.startsWith("https://")) continue;

    const rawDesc = descM ? descM[1]! : "";
    const description = cleanXmlText(rawDesc).slice(0, 2000);
    const deadline = findDeadlineFromText(description) || findDeadlineFromText(title);
    const pubDate = updatedM ? cleanXmlText(updatedM[1]!) : null;
    const categoryHint = catM ? cleanXmlText(catM[1]!) : null;

    if (title.length >= 8 && link) {
      out.push({ title, link, description, deadline, pubDate, categoryHint });
    }
  }
  return out;
}

/**
 * Tace XML Sitemaps domin samun sabbin URLs na damammaki.
 */
export function parseSitemap(xml: string, max = 25): ExtractedFeedItem[] {
  const out: ExtractedFeedItem[] = [];
  const OPP_REGEX = /scholarship|fellowship|grant|internship|intern\b|vacanc|job|career|position|programme|award|bursary/i;
  const urlRegex = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
  let match;

  while ((match = urlRegex.exec(xml)) !== null) {
    if (out.length >= max) break;
    const block = match[1]!;

    const locM = block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i);
    const lastModM = block.match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i);

    let link = (locM ? locM[1]! : "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
    if (!link.startsWith("http://") && !link.startsWith("https://")) continue;

    if (!OPP_REGEX.test(link)) continue;

    // Fitar da sunan damar daga karshen URL slug
    const urlParts = link.replace(/\/$/, "").split("/");
    const slug = urlParts[urlParts.length - 1] || "";
    const title = slug
      .replace(/[-_]+/g, " ")
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .slice(0, 300);

    if (title.length >= 8) {
      out.push({
        title,
        link,
        description: `Discovered from official XML sitemap: ${link}`,
        deadline: null,
        pubDate: lastModM ? cleanXmlText(lastModM[1]!) : null,
        categoryHint: null,
      });
    }
  }
  return out;
}

/**
 * Babban injiniya mai tace kowane irin XML Feed ko Sitemap.
 */
export function extractFeedOrSitemap(xml: string, max = 25): ExtractedFeedItem[] {
  const sample = xml.slice(0, 1500).toLowerCase();

  if (sample.includes("<feed") || (sample.includes("<?xml") && sample.includes("<entry"))) {
    return parseAtomFeed(xml, max);
  }
  if (sample.includes("<urlset") || sample.includes("<sitemapindex")) {
    return parseSitemap(xml, max);
  }
  return parseRssFeed(xml, max);
}
