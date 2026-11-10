import { describe, it, expect } from "bun:test";
import {
  isXmlFeedOrSitemap,
  cleanXmlText,
  findDeadlineFromText,
  parseRssFeed,
  parseAtomFeed,
  parseSitemap,
} from "../../src/lib/ai/rss-sitemap-extract.server";

describe("RSS, Atom & Sitemap Extraction Engine", () => {
  it("detects RSS, Atom and Sitemap XML documents properly", () => {
    expect(isXmlFeedOrSitemap('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>')).toBe(true);
    expect(isXmlFeedOrSitemap('<feed xmlns="http://www.w3.org/2005/Atom"><title>UN</title></feed>')).toBe(true);
    expect(isXmlFeedOrSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')).toBe(true);
    expect(isXmlFeedOrSitemap('<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>')).toBe(false);
  });

  it("extracts opportunities, deadlines and links from RSS feed with CDATA", () => {
    const rssSample = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Islamic Development Bank</title>
    <item>
      <title><![CDATA[IsDB Scholarship Programme 2026/2027]]></title>
      <link>https://www.isdb.org/scholarships/call-2026</link>
      <description><![CDATA[Fully funded scholarship. Application deadline: 30 April 2026 for all candidates.]]></description>
      <pubDate>Mon, 10 Jan 2026 08:00:00 GMT</pubDate>
      <category>Scholarship</category>
    </item>
  </channel>
</rss>`;

    const items = parseRssFeed(rssSample);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("IsDB Scholarship Programme 2026/2027");
    expect(items[0]?.link).toBe("https://www.isdb.org/scholarships/call-2026");
    expect(items[0]?.deadline).toBe("2026-04-30");
    expect(items[0]?.categoryHint).toBe("Scholarship");
  });

  it("extracts opportunities, deadlines and links from Atom feed", () => {
    const atomSample = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>UN Careers</title>
  <entry>
    <title>Associate Information Officer</title>
    <link href="https://careers.un.org/jobOpening/12345" />
    <summary>UN Secretariat is hiring. Closing date: 28 February 2027.</summary>
    <updated>2026-01-15T12:00:00Z</updated>
    <category term="Job" />
  </entry>
</feed>`;

    const items = parseAtomFeed(atomSample);
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("Associate Information Officer");
    expect(items[0]?.link).toBe("https://careers.un.org/jobOpening/12345");
    expect(items[0]?.deadline).toBe("2027-02-28");
    expect(items[0]?.categoryHint).toBe("Job");
  });

  it("extracts and filters opportunities from XML sitemap", () => {
    const sitemapSample = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.chevening.org/scholarships/nigeria-awards-2026/</loc>
    <lastmod>2026-01-10</lastmod>
  </url>
  <url>
    <loc>https://www.chevening.org/privacy-policy/</loc>
    <lastmod>2025-10-01</lastmod>
  </url>
</urlset>`;

    const items = parseSitemap(sitemapSample);
    expect(items.length).toBe(1);
    expect(items[0]?.link).toBe("https://www.chevening.org/scholarships/nigeria-awards-2026/");
    expect(items[0]?.title).toContain("Nigeria Awards 2026");
  });

  it("cleans dangerous HTML tags and scripts from XML content safely", () => {
    const dirty = "<script>alert('bad')</script><![CDATA[<strong>Safe Scholarship</strong>]]>&amp; Free Grant";
    const cleaned = cleanXmlText(dirty);
    expect(cleaned).toBe("Safe Scholarship & Free Grant");
    expect(cleaned).not.toContain("script");
    expect(cleaned).not.toContain("alert");
  });
});
  
