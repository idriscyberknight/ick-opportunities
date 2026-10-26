import type { Opportunity, OpportunityCategory } from "@/lib/opportunities";
import { EDUCATION_LEVELS, labelFor, type ProfileData } from "@/lib/profile";

export type Recommendation = {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
};

/** Weights sum to 100. */
const W = { category: 30, skills: 25, interests: 20, education: 15, location: 10 };

const TYPE_TO_CATEGORY: Record<string, OpportunityCategory> = {
  scholarships: "scholarship",
  jobs: "job",
  internships: "internship",
  grants: "grant",
};

const EDUCATION_KEYWORDS: Record<string, string[]> = {
  secondary_school: ["secondary", "ssce", "waec", "high school", "o'level"],
  undergraduate: ["undergraduate", "bachelor", "b.sc", "bsc", "student", "university"],
  graduate: ["graduate", "graduates", "degree", "b.sc", "bsc", "hnd", "nysc"],
  postgraduate: ["postgraduate", "master", "msc", "m.sc", "mba"],
  phd: ["phd", "doctoral", "doctorate", "research"],
  other: [],
};

/** Minimum data needed for meaningful matching. */
export function isProfileReadyForMatching(p: ProfileData | null): boolean {
  return (
    !!p &&
    p.opportunityTypes.length > 0 &&
    !!p.education_level &&
    !!p.country &&
    p.skills.length + p.interests.length > 0
  );
}

function tokens(term: string): string[] {
  return term
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 2 && !["and", "the", "for"].includes(t));
}

function termMatches(text: string, term: string) {
  const t = term.toLowerCase().trim();
  if (!t) return false;
  if (text.includes(t)) return true;
  const parts = tokens(t);
  return parts.length > 0 && parts.some((p) => text.includes(p));
}

function scoreOne(o: Opportunity, p: ProfileData): Recommendation {
  const text = [o.title, o.description, o.eligibility, o.benefits, o.organization]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Category
  const wanted = p.opportunityTypes.map((t) => TYPE_TO_CATEGORY[t]).filter(Boolean);
  if (wanted.includes(o.category)) {
    score += W.category;
    reasons.push(`Matches your interest in ${o.category}s`);
  }

  // Skills (incl. career field as a skill-like signal)
  const skillTerms = [...p.skills, ...(p.career_field ? [p.career_field] : [])];
  const skillHits = skillTerms.filter((s) => termMatches(text, s));
  if (skillTerms.length && skillHits.length) {
    score += Math.round(W.skills * Math.min(1, skillHits.length / Math.min(3, skillTerms.length)));
    reasons.push(`Relevant to your skills: ${skillHits.slice(0, 3).join(", ")}`);
  }

  // Interests (incl. field of study)
  const interestTerms = [...p.interests, ...(p.field_of_study ? [p.field_of_study] : [])];
  const interestHits = interestTerms.filter((s) => termMatches(text, s));
  if (interestTerms.length && interestHits.length) {
    score += Math.round(
      W.interests * Math.min(1, interestHits.length / Math.min(2, interestTerms.length)),
    );
    reasons.push(`Aligns with ${interestHits.slice(0, 2).join(", ")}`);
  }

  // Education
  const eduKeys = p.education_level ? (EDUCATION_KEYWORDS[p.education_level] ?? []) : [];
  if (eduKeys.some((k) => text.includes(k))) {
    score += W.education;
    reasons.push(`Suits your ${labelFor(EDUCATION_LEVELS, p.education_level).toLowerCase()} level`);
  } else if (!o.eligibility) {
    score += Math.round(W.education / 3); // open eligibility
  }

  // Location
  const country = p.country?.toLowerCase().trim();
  const oCountry = o.country?.toLowerCase().trim();
  if (country && oCountry === country) {
    const sameState =
      p.state && o.state && p.state.toLowerCase().trim() === o.state.toLowerCase().trim();
    score += W.location;
    reasons.push(sameState ? `Located in ${o.state}` : `Available in ${o.country}`);
  } else if (!oCountry || /remote|international|global|worldwide/.test(oCountry)) {
    score += Math.round(W.location / 2);
    if (p.remote_preference === "remote" || p.remote_preference === "any") {
      reasons.push("Open to applicants anywhere");
    }
  }

  return { opportunity: o, score: Math.min(100, score), reasons };
}

/** Pure, client-side ranking over already-fetched active opportunities. */
export function rankOpportunities(
  opportunities: Opportunity[],
  profile: ProfileData,
  minScore = 20,
  today = new Date().toISOString().slice(0, 10),
): Recommendation[] {
  return opportunities
    .filter((o) => o.status === "active" && (!o.deadline || o.deadline >= today))
    .map((o) => scoreOne(o, profile))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
