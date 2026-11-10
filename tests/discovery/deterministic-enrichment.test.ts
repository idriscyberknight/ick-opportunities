import { describe, it, expect } from "bun:test";
import {
  extractMetaDescription,
  findDeadlineFromText,
  extractEligibility,
  extractBenefits,
  cleanSitemapFallbackDescription,
} from "../../src/lib/ai/deterministic-enrichment.server";

describe("Deterministic Enrichment Unit Tests", () => {
  it("extracts meta description from HTML tags", () => {
    const html1 = '<meta name="description" content="Commonwealth Master scholarship for eligible low and middle income countries.">';
    expect(extractMetaDescription(html1)).toBe("Commonwealth Master scholarship for eligible low and middle income countries.");

    const html2 = '<meta property="og:description" content="African Union Research Grant 2026 offering seed funding for innovations.">';
    expect(extractMetaDescription(html2)).toBe("African Union Research Grant 2026 offering seed funding for innovations.");
  });

  it("extracts diverse international deadline formats deterministically", () => {
    expect(findDeadlineFromText("Application closing date: 17 October 2026")).toBe("2026-10-17");
    expect(findDeadlineFromText("Deadline is November 30, 2026 for all candidates")).toBe("2026-11-30");
    expect(findDeadlineFromText("Closes: 2027-02-28")).toBe("2027-02-28");
    expect(findDeadlineFromText("Apply by: 15/12/2026")).toBe("2026-12-15");
    expect(findDeadlineFromText("Apply before 31st December 2026")).toBe("2026-12-31");
  });

  it("extracts eligibility criteria section cleanly", () => {
    const text = `
    Chevening Fellowships Overview
    Who can apply:
    - Must be a citizen of Nigeria or an eligible country.
    - Hold an undergraduate degree.
    - Have at least 5 years work experience.
    Benefits:
    - Full tuition fees covered.
    `;
    const elig = extractEligibility(text);
    expect(elig).not.toBeNull();
    expect(elig).toContain("citizen of Nigeria");
    expect(elig).toContain("undergraduate degree");
  });

  it("extracts benefits and funding section cleanly", () => {
    const text = `
    Eligibility:
    Open to all African youth.
    Benefits and funding:
    - Full tuition fees paid.
    - Return flight tickets to London.
    - Monthly living allowance of £1,300.
    How to apply:
    Visit portal.
    `;
    const ben = extractBenefits(text);
    expect(ben).not.toBeNull();
    expect(ben).toContain("Full tuition fees paid");
    expect(ben).toContain("Return flight tickets");
  });

  it("formats informative sitemap fallback description", () => {
    const desc = cleanSitemapFallbackDescription("Chevening Fellowship", "Foreign Office");
    expect(desc).toContain("Chevening Fellowship");
    expect(desc).toContain("Foreign Office");
    expect(desc).toContain("Visit the official portal");
  });
});
