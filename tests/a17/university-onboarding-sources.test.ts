import { describe, expect, it } from "bun:test";
import { STARTER_UNIVERSITIES } from "../../src/lib/university-directory";
import {
  UNIVERSITY_SOURCE_CANDIDATES,
  starterSourceCandidates,
} from "../../src/lib/university-onboarding-sources";

describe("A1.7.2B curated official-source research candidates", () => {
  it("covers the existing eight canonical slugs exactly once", () => {
    const expected = STARTER_UNIVERSITIES.map((item) => item.slug).sort();
    const actual = Object.keys(UNIVERSITY_SOURCE_CANDIDATES).sort();
    expect(expected).toEqual(actual);
    expect(actual).toHaveLength(8);
  });

  it("has HTTPS source candidate links, clear cautions and NO trusted-by-default review state", () => {
    for (const record of STARTER_UNIVERSITIES) {
      const entries = starterSourceCandidates(record.slug);
      expect(entries.length).toBeGreaterThanOrEqual(2);
      expect(new Set(entries.map((item) => item.url)).size).toBe(entries.length);
      for (const source of entries) {
        const url = new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(url.username).toBe("");
        expect(url.password).toBe("");
        expect(source.claim).toBe("identity");
        expect(["institution", "official_authority"]).toContain(source.sourceKind);
        expect(source.title.length).toBeGreaterThan(6);
        expect(source.reviewerCaution.length).toBeGreaterThan(20);
        expect("review_status" in source).toBe(false);
        expect("verified" in source).toBe(false);
      }
    }
  });

  it("keeps Niger's unconfirmed university web domain out of suggested links", () => {
    const items = starterSourceCandidates("islamic-university-in-niger");
    expect(items.map((item) => item.sourceKind)).toEqual([
      "official_authority",
      "official_authority",
    ]);
    const urls = items.map((item) => item.url);
    expect(urls.some((url) => url.includes("universite-say.com"))).toBe(false);
    expect(urls.some((url) => url.includes("uin-ne.org"))).toBe(false);
  });

  it("points to country-specific independent institutions, not application/payment pages", () => {
    const anchors = [
      ["islamic-university-of-madinah", "moe.gov.sa"],
      ["international-islamic-university-malaysia", "mohe.gov.my"],
      ["islamic-university-in-uganda", "unche.or.ug"],
      ["international-islamic-university-islamabad", "hec.gov.pk"],
      ["uin-syarif-hidayatullah-jakarta", "kemenag.go.id"],
      ["islamic-university-of-technology", "oic-oci.org"],
    ] as const;
    for (const [slug, hostname] of anchors) {
      expect(starterSourceCandidates(slug).some((item) => new URL(item.url).hostname.endsWith(hostname))).toBe(true);
    }
  });

  it("returns no suggestion for unrelated private drafts or unknown slugs", () => {
    expect(starterSourceCandidates("ick")).toEqual([]);
    expect(starterSourceCandidates("not-real")).toEqual([]);
  });
});
