import type { Opportunity, OpportunityCategory } from "@/lib/opportunities";
import { EDUCATION_LEVELS, labelFor, type ProfileData } from "@/lib/profile";

export type Recommendation = {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
};

/** Weights sum to 100. */
const W = {
  category: 25,
  skills: 25,
  interests: 20,
  education: 15,
  location: 10,
  urgency: 5,
};

const TYPE_TO_CATEGORY: Record<string, OpportunityCategory> = {
  scholarships: "scholarship",
  jobs: "job",
  internships: "internship",
  grants: "grant",
};

const EDUCATION_KEYWORDS: Record<string, string[]> = {
  secondary_school: [
    "secondary",
    "ssce",
    "waec",
    "neco",
    "high school",
    "o'level",
    "olevel",
    "secondary school",
  ],
  undergraduate: [
    "undergraduate",
    "bachelor",
    "bachelors",
    "b.sc",
    "bsc",
    "b.eng",
    "beng",
    "b.a",
    "ba",
    "student",
    "university",
    "college",
    "tertiary",
  ],
  graduate: [
    "graduate",
    "graduates",
    "degree",
    "fresh graduate",
    "entry level",
    "b.sc",
    "bsc",
    "hnd",
    "ond",
    "nysc",
    "intern",
    "trainee",
  ],
  postgraduate: [
    "postgraduate",
    "post graduate",
    "master",
    "masters",
    "msc",
    "m.sc",
    "mba",
    "m.eng",
    "meng",
    "pgd",
  ],
  phd: [
    "phd",
    "ph.d",
    "doctoral",
    "doctorate",
    "fellowship",
    "postdoctoral",
    "postdoc",
    "research fellow",
  ],
  other: [],
};

const AFRICA_KEYWORDS = [
  "nigeria",
  "nigerian",
  "west africa",
  "africa",
  "african",
  "sub-saharan",
  "developing countries",
  "oic",
];

const GLOBAL_KEYWORDS = [
  "global",
  "worldwide",
  "international",
  "all nationalities",
  "open to all",
  "any country",
];

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
    .filter((t) => t.length > 2 && !["and", "the", "for", "with", "from"].includes(t));
}

function termMatches(text: string, term: string) {
  const t = term.toLowerCase().trim();
  if (!t) return false;
  if (text.includes(t)) return true;
  const parts = tokens(t);
  return parts.length > 0 && parts.some((p) => text.includes(p));
}

function scoreOne(o: Opportunity, p: ProfileData, today: string): Recommendation {
  const text = [o.title, o.description, o.eligibility, o.benefits, o.organization, o.country]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // 1. Category Match (25 pts)
  const wanted = p.opportunityTypes.map((t) => TYPE_TO_CATEGORY[t]).filter(Boolean);
  if (wanted.includes(o.category)) {
    score += W.category;
    reasons.push(`Matches your interest in ${o.category}s`);
  }

  // 2. Skills & Career Field (25 pts)
  const skillTerms = [...p.skills, ...(p.career_field ? [p.career_field] : [])];
  const skillHits = skillTerms.filter((s) => termMatches(text, s));
  if (skillTerms.length && skillHits.length) {
    const ratio = Math.min(1, skillHits.length / Math.min(3, skillTerms.length));
    score += Math.round(W.skills * ratio);
    reasons.push(`Relevant to your skills: ${skillHits.slice(0, 3).join(", ")}`);
  }

  // 3. Interests & Field of Study (20 pts)
  const interestTerms = [...p.interests, ...(p.field_of_study ? [p.field_of_study] : [])];
  const interestHits = interestTerms.filter((s) => termMatches(text, s));
  if (interestTerms.length && interestHits.length) {
    const ratio = Math.min(1, interestHits.length / Math.min(2, interestTerms.length));
    score += Math.round(W.interests * ratio);
    reasons.push(`Aligns with ${interestHits.slice(0, 2).join(", ")}`);
  }

  // 4. Education Level Gatekeeping (15 pts)
  const eduKeys = p.education_level ? (EDUCATION_KEYWORDS[p.education_level] ?? []) : [];
  if (eduKeys.some((k) => text.includes(k))) {
    score += W.education;
    reasons.push(`Suits your ${labelFor(EDUCATION_LEVELS, p.education_level).toLowerCase()} level`);
  } else if (!o.eligibility) {
    score += Math.round(W.education / 3); // open eligibility
  }

  // 5. Location & Remote Readiness (10 pts)
  const userCountry = p.country?.toLowerCase().trim();
  const oppCountry = o.country?.toLowerCase().trim();
  const isRemoteOpp = /remote|virtual|work from home|work from anywhere|hybrid/.test(text);

  if (userCountry && oppCountry === userCountry) {
    const sameState =
      p.state && o.state && p.state.toLowerCase().trim() === o.state.toLowerCase().trim();
    score += W.location;
    reasons.push(sameState ? `Located in ${o.state}` : `Available in ${o.country}`);
  } else if (isRemoteOpp && (p.remote_preference === "remote" || p.remote_preference === "any")) {
    score += W.location;
    reasons.push("100% Remote / Work from anywhere");
  } else if (userCountry === "nigeria" && AFRICA_KEYWORDS.some((k) => text.includes(k))) {
    score += Math.round(W.location * 0.8);
    reasons.push("Open to applicants from Nigeria & Africa");
  } else if (!oppCountry || GLOBAL_KEYWORDS.some((k) => text.includes(k))) {
    score += Math.round(W.location * 0.6);
    reasons.push("Global / International opportunity");
  }

  // 6. Deadline Urgency Bonus (5 pts)
  if (o.deadline && o.deadline >= today) {
    const diffDays = Math.round(
      (new Date(o.deadline).getTime() - new Date(today).getTime()) / 86_400_000,
    );
    if (diffDays >= 7 && diffDays <= 45) {
      score += W.urgency;
      reasons.push(`Closing in ${diffDays} days (optimal window to apply)`);
    } else if (diffDays > 0 && diffDays < 7) {
      score += Math.round(W.urgency / 2);
      reasons.push(`Urgent: closing in ${diffDays} days`);
    }
  }

  return { opportunity: o, score: Math.min(100, Math.max(0, score)), reasons };
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
    .map((o) => scoreOne(o, profile, today))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
