import { useState } from "react";
import {
  CheckCircle2,
  Globe2,
  GraduationCap,
  Coins,
  Languages,
  Sparkles,
  CheckSquare,
  Square,
} from "lucide-react";
import { formatDeadline } from "@/lib/opportunities";

interface Props {
  opportunity: {
    category: string;
    country: string | null;
    eligibility: string | null;
    benefits: string | null;
    description: string | null;
    deadline: string | null;
  };
}

function detectCitizenshipFit(text: string, country: string | null) {
  const lower = text.toLowerCase();
  const cLower = (country || "").toLowerCase();

  if (lower.includes("nigerian") || lower.includes("nigeria")) {
    return {
      label: "Nigerians Eligible",
      desc: "Open to Nigerian citizens and permanent residents.",
    };
  }
  if (lower.includes("african") || lower.includes("africa")) {
    return {
      label: "African Nationals",
      desc: "Open to qualified candidates across African countries.",
    };
  }
  if (lower.includes("isdb") || lower.includes("member countries")) {
    return {
      label: "IsDB Member States",
      desc: "Open to citizens of member nations (including Nigeria).",
    };
  }
  if (cLower === "remote" || lower.includes("worldwide") || lower.includes("international") || lower.includes("all countries")) {
    return {
      label: "Global / All Nationalities",
      desc: "Open to candidates worldwide without strict national restrictions.",
    };
  }
  return {
    label: "International Applicants",
    desc: "Check specific country eligibility in the requirements below.",
  };
}

function detectEducationLevel(text: string, category: string) {
  const lower = text.toLowerCase();

  if (lower.includes("phd") || lower.includes("doctorate") || lower.includes("postgraduate") || lower.includes("master")) {
    return {
      label: "Postgraduate (MSc / PhD)",
      desc: "Requires a recognized bachelor's degree or equivalent.",
    };
  }
  if (lower.includes("undergraduate") || lower.includes("high school") || lower.includes("secondary school")) {
    return {
      label: "Undergraduate / School Leavers",
      desc: "Suitable for secondary school leavers or current undergrads.",
    };
  }
  if (category === "job" || category === "internship") {
    return {
      label: "Graduates & Professionals",
      desc: "Requires practical skills or university qualification.",
    };
  }
  if (category === "grant") {
    return {
      label: "Entrepreneurs & Innovators",
      desc: "Open to startup founders and business project owners.",
    };
  }
  return {
    label: "Higher Education / Degree Holders",
    desc: "Review specific academic criteria below.",
  };
}

function detectFundingType(benefits: string | null, category: string) {
  const lower = (benefits || "").toLowerCase();

  if (
    lower.includes("full tuition") ||
    lower.includes("100% tuition") ||
    (lower.includes("tuition") && lower.includes("stipend")) ||
    lower.includes("fully funded")
  ) {
    return {
      label: "100% Fully Funded",
      desc: "Covers tuition fees, monthly living stipend & housing.",
    };
  }
  if (lower.includes("partial") || lower.includes("waiver")) {
    return {
      label: "Partial / Tuition Waiver",
      desc: "Covers academic tuition; personal expenses may apply.",
    };
  }
  if (category === "job" || category === "internship") {
    return {
      label: "Competitive Salary / Stipend",
      desc: "Paid remuneration or international monthly allowance.",
    };
  }
  if (category === "grant") {
    return {
      label: "Non-Refundable Grant",
      desc: "Direct seed funding / capital without equity debt.",
    };
  }
  return {
    label: "Financial Benefits Included",
    desc: "Check financial terms and coverage breakdown below.",
  };
}

function detectLanguageFit(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("ielts") || lower.includes("toefl")) {
    return {
      label: "English Test (IELTS/TOEFL)",
      desc: "Test score required or official proficiency proof requested.",
    };
  }
  if (lower.includes("arabic")) {
    return {
      label: "Arabic Language Track",
      desc: "Basic Arabic knowledge or preparatory language year provided.",
    };
  }
  if (lower.includes("japanese") || lower.includes("turkish")) {
    return {
      label: "Language Course Included",
      desc: "Includes 1-year language preparation at host institution.",
    };
  }
  return {
    label: "No English Test Explicitly Required",
    desc: "English-taught degree or institution waiver usually accepted.",
  };
}

export function EligibilityQuickCheck({ opportunity }: Props) {
  const fullText = `${opportunity.eligibility || ""} ${opportunity.description || ""}`;
  const citizenship = detectCitizenshipFit(fullText, opportunity.country);
  const education = detectEducationLevel(fullText, opportunity.category);
  const funding = detectFundingType(opportunity.benefits, opportunity.category);
  const language = detectLanguageFit(fullText);

  // 3-step interactive self-check
  const [step1, setStep1] = useState(false);
  const [step2, setStep2] = useState(false);
  const [step3, setStep3] = useState(false);

  const checkedCount = [step1, step2, step3].filter(Boolean).length;
  const allChecked = checkedCount === 3;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {/* Header bar */}
      <div className="border-b border-border bg-muted/40 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
            Eligibility Quick-Check 
          </h2>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            Fast Glance
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirm your eligibility in seconds before starting your application.
        </p>
      </div>

      {/* 4 Key Pillars Grid */}
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {/* Pillar 1: Citizenship */}
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground">Citizenship / Scope</span>
            <p className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
              {citizenship.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {citizenship.desc}
            </p>
          </div>
        </div>

        {/* Pillar 2: Academic Level */}
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground">Target Level</span>
            <p className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
              {education.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {education.desc}
            </p>
          </div>
        </div>

        {/* Pillar 3: Funding / Support */}
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Coins className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground">Coverage</span>
            <p className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
              {funding.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {funding.desc}
            </p>
          </div>
        </div>

        {/* Pillar 4: Language Requirement */}
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Languages className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground">Language Test</span>
            <p className="mt-0.5 text-xs font-bold text-foreground sm:text-sm">
              {language.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {language.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Self-Assessment Section */}
      <div className="border-t border-border bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            3-Point Self Check: Are you ready to apply?
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {checkedCount}/3 checked
          </span>
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => setStep1(!step1)}
            className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {step1 ? (
              <CheckSquare className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={step1 ? "font-medium text-foreground" : "text-muted-foreground"}>
              I meet the citizenship or geographic location criteria ({citizenship.label})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStep2(!step2)}
            className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {step2 ? (
              <CheckSquare className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={step2 ? "font-medium text-foreground" : "text-muted-foreground"}>
              I hold or expect the required academic qualification or experience ({education.label})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStep3(!step3)}
            className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {step3 ? (
              <CheckSquare className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={step3 ? "font-medium text-foreground" : "text-muted-foreground"}>
              I have time to submit my documents before deadline ({formatDeadline(opportunity.deadline)})
            </span>
          </button>
        </div>

        {/* Dynamic Feedback Card */}
        {allChecked ? (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              You match all 3 criteria! Review the detailed steps below and visit the source page to apply.
            </span>
          </div>
        ) : checkedCount > 0 ? (
          <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
            Complete all 3 checks to verify your readiness before applying.
          </p>
        ) : null}
      </div>
    </div>
  );
    }
  
