import { expect, test, describe } from "bun:test";
import {
  escapeHtml,
  getDigestSubject,
  renderOpportunityDigestHtml,
  renderOpportunityDigestText,
  type DigestEmailPayload,
} from "@/lib/emails/opportunity-digest";

describe("English Opportunity Digest Email Generator", () => {
  const samplePayload: DigestEmailPayload = {
    recipient: {
      name: "Idris Salisu",
      email: "idris@example.com",
    },
    opportunities: [
      {
        id: "opp-123",
        title: "NITDA AI & Cloud Masters Scholarship 2026",
        category: "scholarship",
        organization: "NITDA Nigeria",
        country: "Nigeria",
        state: "Abuja",
        deadline: "2026-12-15",
        matchScore: 95,
        matchReasons: [
          "Matches your interest in scholarships",
          "Relevant to your skills: Python, Cloud",
          "Available in Nigeria",
        ],
      },
      {
        id: "opp-456",
        title: "Remote Full Stack Developer Fellowship",
        category: "internship",
        organization: "Tech Africa",
        country: "Global",
        deadline: "2026-11-30",
        matchScore: 88,
        matchReasons: ["100% Remote / Work from anywhere"],
      },
    ],
    siteOrigin: "https://ick-opportunities.vercel.app",
  };

  test("escapes dangerous HTML characters safely", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
    );
    expect(escapeHtml('Hello "World" & Friends')).toBe(
      "Hello &quot;World&quot; &amp; Friends"
    );
  });

  test("generates English subject line with count and category", () => {
    const subject = getDigestSubject(samplePayload);
    expect(subject).toBe("[ICK Opportunities] 2 New Scholarship & Verified Matches for You");
  });

  test("renders valid English HTML with Gmail-safe inline styles", () => {
    const html = renderOpportunityDigestHtml(samplePayload);
    expect(html).toContain('lang="en"');
    expect(html).toContain("Hello, Idris Salisu! 👋");
    expect(html).toContain("NITDA AI &amp; Cloud Masters Scholarship 2026");
    expect(html).toContain("Match: 95%");
    expect(html).toContain("Why this matches your profile:");
    expect(html).toContain("Matches your interest in scholarships");
    expect(html).toContain("View Details &amp; Apply &rarr;");
    expect(html).toContain("Security Alert:");
    expect(html).toContain("Unsubscribe");
  });

  test("does not promise all provider applications are free or link to a missing settings path", () => {
    const html = renderOpportunityDigestHtml(samplePayload);
    const plainText = renderOpportunityDigestText(samplePayload);
    expect(html).toContain("does not charge to browse listings");
    expect(plainText).toContain("does not charge to browse listings");
    expect(html).toContain("https://ick-opportunities.vercel.app/alerts");
    expect(plainText).toContain("https://ick-opportunities.vercel.app/alerts");
    expect(html).not.toContain("/dashboard/alerts");
    expect(plainText).not.toContain("100% free");
  });

  test("renders English plain text fallback accurately", () => {
    const text = renderOpportunityDigestText(samplePayload);
    expect(text).toContain("HELLO, IDRIS SALISU!");
    expect(text).toContain("SECURITY ALERT:");
    expect(text).toContain("Apply URL: https://ick-opportunities.vercel.app/opportunities/opp-123");
  });
});
