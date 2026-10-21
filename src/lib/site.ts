/**
 * Single source of truth for the public site address.
 * Used for canonical URLs, share links, the sitemap and structured data.
 *
 * The default is the address production is served from today. When a custom
 * domain is added, set VITE_SITE_URL at build time (or edit DEFAULT_SITE_ORIGIN)
 * and update the Sitemap line in public/robots.txt to match.
 */
const DEFAULT_SITE_ORIGIN = "https://ick-opportunities.vercel.app";

const fromEnv = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.trim();

export const SITE_ORIGIN: string = (fromEnv || DEFAULT_SITE_ORIGIN).replace(/\/+$/, "");
export const SITE_NAME = "ICK Opportunities";

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
