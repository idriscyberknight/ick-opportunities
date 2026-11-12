/**
 * Deterministic Opportunity Enrichment Engine.
 * 
 * Extracts meta descriptions, deadlines, eligibility criteria, and benefits
 * from HTML and raw text deterministically without consuming AI credits.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function cleanText(s: string): string {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/<[a-z!/][^>]*$/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_m, n: string) => {
      const codePoint = Number(n);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => {
      const codePoint = Number.parseInt(h, 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ciro taƙaitaccen bayani daga meta tags na HTML (og:description, description, twitter:description)
 */
export function extractMetaDescription(html: string): string | null {
  if (!html) return null;
  const m1 = html.match(/<meta\s+[^>]*?(?:name|property)=["'](?:og:description|description|twitter:description)["'][^>]*?content=["']([^"']+)["']/i);
  if (m1 && m1[1] && m1[1].trim().length >= 20) {
    return cleanText(m1[1]).slice(0, 1000);
  }
  const m2 = html.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:name|property)=["'](?:og:description|description|twitter:description)["']/i);
  if (m2 && m2[1] && m2[1].trim().length >= 20) {
    return cleanText(m2[1]).slice(0, 1000);
  }
  return null;
}

/**
 * Zakulo ranar rufe rajista (Deadline) mai gane duk wata kalma da tsarin kwanan wata na duniya.
 */
export function findDeadlineFromText(text: string): string | null {
  if (!text) return null;
  const prefix = "(?:deadline|closing date|closes|apply by|apply before|end date|due date|cutoff)\\s*(?:is|on|by|before|at|:|–|-)?\\s*";

  // 1. Month DD, YYYY (misali: November 30, 2026)
  const mMonthFirst = text.match(new RegExp(prefix + "([a-z]{3})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})", "i"));
  if (mMonthFirst && mMonthFirst[1] && mMonthFirst[2] && mMonthFirst[3]) {
    const mo = MONTHS[mMonthFirst[1].toLowerCase()];
    if (mo) return `${mMonthFirst[3]}-${String(mo).padStart(2, "0")}-${mMonthFirst[2].padStart(2, "0")}`;
  }

  // 2. DD Month YYYY (misali: 17 October 2026 ko 31st December 2026)
  const mDayFirst = text.match(new RegExp(prefix + "(\\d{1,2})(?:st|nd|rd|th)?\\s+([a-z]{3})[a-z]*,?\\s+(20\\d{2})", "i"));
  if (mDayFirst && mDayFirst[1] && mDayFirst[2] && mDayFirst[3]) {
    const mo = MONTHS[mDayFirst[2].toLowerCase()];
    if (mo) return `${mDayFirst[3]}-${String(mo).padStart(2, "0")}-${mDayFirst[1].padStart(2, "0")}`;
  }

  // 3. ISO YYYY-MM-DD
  const mIso = text.match(new RegExp(prefix + "(20\\d{2}-\\d{2}-\\d{2})", "i"));
  if (mIso && mIso[1]) return mIso[1];

  // 4. DD/MM/YYYY ko DD-MM-YYYY
  const mSlash = text.match(new RegExp(prefix + "(\\d{1,2})[\\/\\.-](\\d{1,2})[\\/\\.-](20\\d{2})", "i"));
  if (mSlash && mSlash[1] && mSlash[2] && mSlash[3]) {
    return `${mSlash[3]}-${mSlash[2].padStart(2, "0")}-${mSlash[1].padStart(2, "0")}`;
  }

  return null;
}

/**
 * Ciro sashin cancanta (Eligibility criteria, who can apply, requirements).
 */
export function extractEligibility(text: string, maxLen = 600): string | null {
  if (!text) return null;
  const headerPattern = "applicant\\s+eligibility|eligibility\\s+criteria|who\\s+can\\s+apply|eligibility|requirements|qualifications|entry\\s+requirements";
  const boundaryPattern = "benefits|funding|coverage|what\\s+is\\s+included|stipend|allowance|how\\s+to\\s+apply|deadline|closing\\s+date|selection|terms\\s+and\\s+conditions";
  const pattern = new RegExp("(?:^|[\\r\\n]+|\\b)(?:" + headerPattern + ")\\s*(?::|-|–|\\n)?\\s*([\\s\\S]*?)(?=(?:[\\r\\n]+\\s*(?:" + boundaryPattern + ")\\s*(?::|-|–|\\n))|$)", "i");
  const m = text.match(pattern);
  if (m && m[1]) {
    const cleaned = cleanText(m[1]);
    if (cleaned.length >= 25) {
      return cleaned.slice(0, maxLen);
    }
  }
  return null;
}

/**
 * Ciro sashin fa'ida da tallafi (Benefits, funding, coverage, scholarship value).
 */
export function extractBenefits(text: string, maxLen = 600): string | null {
  if (!text) return null;
  const headerPattern = "benefits\\s+and\\s+funding|benefits|funding|coverage|what\\s+is\\s+included|what\\s+you\\s+get|scholarship\\s+value|award\\s+value|stipend|allowance";
  const boundaryPattern = "eligibility|who\\s+can\\s+apply|requirements|qualifications|how\\s+to\\s+apply|deadline|closing\\s+date|selection|terms\\s+and\\s+conditions";
  const pattern = new RegExp("(?:^|[\\r\\n]+|\\b)(?:" + headerPattern + ")\\s*(?::|-|–|\\n)?\\s*([\\s\\S]*?)(?=(?:[\\r\\n]+\\s*(?:" + boundaryPattern + ")\\s*(?::|-|–|\\n))|$)", "i");
  const m = text.match(pattern);
  if (m && m[1]) {
    const cleaned = cleanText(m[1]);
    if (cleaned.length >= 25) {
      return cleaned.slice(0, maxLen);
    }
  }
  return null;
}

/**
 * Kyakkyawan bayani ga shafukan Sitemap idan ba a samu ciro labari ba.
 */
export function cleanSitemapFallbackDescription(title: string, orgName: string): string {
  return `${title} — Official programme offered by ${orgName}. Discovered via official listing. Visit the official portal for full eligibility criteria, deadlines, and application requirements.`;
}
