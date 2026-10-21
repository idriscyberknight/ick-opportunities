import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { absoluteUrl } from "@/lib/site";

/**
 * Dynamic sitemap, built from the database on request and cached at the edge
 * for an hour, so a newly published opportunity appears without a deploy.
 * The public RLS policy only exposes active, non-expired rows, so only pages
 * that are actually visible are listed.
 */

const STATIC_PATHS = [
  "/",
  "/opportunities",
  "/scholarships",
  "/jobs",
  "/internships",
  "/grants",
  "/privacy",
  "/terms",
] as const;

const PAGE_SIZE = 1000; // API row cap per request
const MAX_OPPORTUNITIES = 45_000; // sitemap limit is 50,000 URLs

type Row = { id: string; updated_at: string };

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function fetchPublicRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; rows.length < MAX_OPPORTUNITIES; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

function buildSitemap(rows: Row[]): string {
  const entries = [
    ...STATIC_PATHS.map((path) => `  <url><loc>${escapeXml(absoluteUrl(path))}</loc></url>`),
    ...rows.map(
      (row) =>
        `  <url><loc>${escapeXml(absoluteUrl(`/opportunities/${row.id}`))}</loc>` +
        `<lastmod>${new Date(row.updated_at).toISOString()}</lastmod></url>`,
    ),
  ];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`
  );
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const rows = await fetchPublicRows();
          return new Response(buildSitemap(rows), {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
            },
          });
        } catch (error) {
          console.error("Sitemap generation failed", error);
          // 503 (not a partial sitemap) so crawlers retry instead of dropping URLs.
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Retry-After": "3600",
              "Cache-Control": "no-store",
            },
          });
        }
      },
    },
  },
});
