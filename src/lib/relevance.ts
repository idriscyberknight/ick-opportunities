/**
 * Overall relevance for ICK's audience.
 * Priority 1 (Nigeria, worldwide remote, African open to Nigerians) can reach 100.
 * Priority 2 (global, open to all countries) is capped at 65.
 * Priority 3 (country-specific, not international) falls back to a low score.
 */
export function overallRelevance(s: {
  nigeria: number;
  africa: number;
  remote: number;
  global: number;
}): number {
  const c = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));
  const p1 = Math.max(c(s.nigeria), c(s.remote), c(s.africa) * 0.95);
  const p2 = c(s.global) * 0.65;
  const p3 = 10;
  return c(Math.max(p1, p2, p3));
}

export type RelevanceLevel = "high" | "medium" | "low";

export function relevanceLevel(score: number | null | undefined): RelevanceLevel {
  if (score == null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const relevanceLabel: Record<RelevanceLevel, string> = {
  high: "High Relevance",
  medium: "Medium Relevance",
  low: "Low Relevance",
};

export const relevanceStyles: Record<RelevanceLevel, string> = {
  high: "bg-success/10 text-success",
  medium: "bg-secondary/10 text-secondary",
  low: "bg-muted text-muted-foreground",
};
