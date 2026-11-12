import { describe, expect, test } from "bun:test";
import { extractFallback } from "../../src/lib/ai/fallback-extract.server";

describe("deterministic HTML fallback extraction", () => {
  test("keeps an opportunity CTA link when its destination identifies the programme", () => {
    const html = `<html><body><main><a href="/study/internships">Find Out More</a></main></body></html>`;
    const result = extractFallback(html, "https://admissions.example.edu", 10);
    expect(result).toHaveLength(1);
    expect(result[0]?.link).toBe("https://admissions.example.edu/study/internships");
  });

  test("does not treat non-opportunity campus and alumni navigation as listings", () => {
    const html = `<html><body><main><a href="/alumni">Alumni scholarships and careers</a><a href="/campus-life">Campus life internships</a></main></body></html>`;
    expect(extractFallback(html, "https://admissions.example.edu", 10)).toHaveLength(0);
  });
});