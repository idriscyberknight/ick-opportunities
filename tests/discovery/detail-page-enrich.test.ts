import { describe, expect, test } from "bun:test";
import { decodeEntities, enrichFromDetailHtml, findDeadlineExtended, needsEnrichment } from "../../src/lib/ai/detail-page-enrich.server";

const html = `<html><head><title>x</title></head><body><nav>Home About</nav><main>
<h1>YTB &#x2013; IsDB Joint Scholarship Program 2026</h1>
<p>The program aims to enable high-achieving students from IsDB member countries and Muslim communities living in other countries to study in T&#xFC;rkiye.</p>
<p>The scholarship covers a monthly stipend, accommodation support, tuition fees, health insurance, a one-year Turkish language course, and a one-time round-trip airfare.</p>
<p>Application Dates: 10 January &#x2013; 20 February 2026</p>
</main><footer>Copyright</footer></body></html>`;

describe("detail page enrichment", () => {
  test("decodes hex entities", () => {
    expect(decodeEntities("T&#xFC;rkiye &#x2013; 2026")).toBe("Türkiye – 2026");
  });
  test("takes end date of an application date range", () => {
    expect(findDeadlineExtended("Application Dates: 10 January – 20 February 2026")).toBe("2026-02-20");
  });
  test("extracts benefits, eligibility, deadline and clean description", () => {
    const r = enrichFromDetailHtml(html);
    expect(r.deadline).toBe("2026-02-20");
    expect(r.benefits).toContain("monthly stipend");
    expect(r.eligibility).toContain("IsDB member countries");
    expect(r.description).toContain("Türkiye");
    expect(r.description).not.toContain("<");
    expect(r.description).not.toContain("Copyright");
  });
  test("generic sitemap placeholder needs enrichment", () => {
    expect(needsEnrichment({ description: "Discovered from official XML sitemap: https://x", deadline: null, eligibility: null, benefits: null })).toBe(true);
  });
});
