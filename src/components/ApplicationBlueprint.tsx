import { useId, useState } from "react";
import {
  FileText,
  ListChecks,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDeadline } from "@/lib/opportunities";

interface Props {
  opportunity: {
    id?: string;
    title: string;
    organization: string;
    category: string;
    country: string | null;
    deadline: string | null;
    official_link: string | null;
  };
}

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  isCrucial?: boolean;
}

function getCategoryDocuments(category: string): ChecklistItem[] {
  switch (category) {
    case "scholarship":
      return [
        {
          id: "passport",
          label: "Valid International Passport or National ID (NIN)",
          hint: "Ensure your travel passport is valid for at least 6 months beyond the start date.",
          isCrucial: true,
        },
        {
          id: "transcripts",
          label: "Certified Academic Transcripts & Certificates",
          hint: "Scanned in crisp high-resolution PDF format (under 2MB per file).",
          isCrucial: true,
        },
        {
          id: "sop",
          label: "Statement of Purpose / Motivation Essay",
          hint: "A clear, tailored 500-1,000 word essay stating your background and academic goals.",
          isCrucial: true,
        },
        {
          id: "recommendations",
          label: "2-3 Letters of Academic/Professional Recommendation",
          hint: "Signed letters on official letterhead from former lecturers or supervisors.",
        },
        {
          id: "cv",
          label: "Updated Academic CV / Resume",
          hint: "Highlight research, publications, leadership roles, and honors.",
        },
        {
          id: "language",
          label: "Language Proficiency Proof (if requested by institution)",
          hint: "English proficiency letter from university, or IELTS/TOEFL if mandatory.",
        },
      ];
    case "job":
      return [
        {
          id: "resume",
          label: "Tailored ATS-Friendly Resume",
          hint: "Reflect the specific keywords, tools, and technical competencies listed in the vacancy.",
          isCrucial: true,
        },
        {
          id: "cover_letter",
          label: "Targeted Cover Letter",
          hint: "Explain why you want to work with this company and the exact problem you will solve.",
          isCrucial: true,
        },
        {
          id: "portfolio",
          label: "Proof of Work / Portfolio / GitHub Link",
          hint: "Live links showing real-world projects, repos, or published works.",
        },
        {
          id: "references",
          label: "Professional References",
          hint: "Contact details of 2 past direct managers or team leads who can vouch for your work.",
        },
      ];
    case "internship":
      return [
        {
          id: "student_resume",
          label: "Student or Early-Career Resume",
          hint: "Emphasize coursework, projects, leadership, certifications, and soft skills.",
          isCrucial: true,
        },
        {
          id: "student_id",
          label: "Student Identity / Introduction Letter",
          hint: "Official letter from your department confirming current enrollment.",
          isCrucial: true,
        },
        {
          id: "motivation",
          label: "Personal Statement of Interest",
          hint: "Why you want this internship and what you hope to learn.",
        },
        {
          id: "transcript",
          label: "Recent Academic Transcript",
          hint: "Official or unofficial university grades record.",
        },
      ];
    case "grant":
      return [
        {
          id: "proposal",
          label: "Project Proposal / Business Plan",
          hint: "Outlining the problem, solution, target market, and measurable social impact.",
          isCrucial: true,
        },
        {
          id: "budget",
          label: "Itemized Budget & Milestones",
          hint: "Clear spreadsheet detailing how every dollar/naira of the grant will be spent.",
          isCrucial: true,
        },
        {
          id: "cac",
          label: "Business Registration / Legal Identity (CAC)",
          hint: "Certificate of incorporation or formal registered association papers (if applicable).",
        },
        {
          id: "pitch_deck",
          label: "Pitch Deck / Executive Summary",
          hint: "A clean 10-12 slide presentation explaining your venture.",
        },
      ];
    default:
      return [
        {
          id: "id_proof",
          label: "Identity Document (Passport or NIN)",
          hint: "Clear identification matching the exact name on your application.",
          isCrucial: true,
        },
        {
          id: "qualifications",
          label: "Educational / Professional Credentials",
          hint: "Degrees, certificates, or evidence of eligibility.",
          isCrucial: true,
        },
        {
          id: "motivation",
          label: "Statement of Intent / Motivation",
          hint: "Detailed explanation of your goals and fit for this opportunity.",
        },
      ];
  }
}

const applicationSteps = [
  {
    step: "01",
    title: "Document & Eligibility Audit",
    description:
      "Gather and scan all required documents in PDF format. Keep each file under 2MB and name them clearly (e.g., 'Fullname_Transcript.pdf').",
  },
  {
    step: "02",
    title: "Register on the Official Portal",
    description:
      "Create your account using a professional personal email. Never use shared cyber café emails or give passwords to third parties.",
  },
  {
    step: "03",
    title: "Complete Form & Upload Verified Files",
    description:
      "Ensure your name spelling matches your official identity document exactly. Carefully upload each required file to its dedicated slot.",
  },
  {
    step: "04",
    title: "Final Review & Early Submission",
    description:
      "Submit at least 48 to 72 hours before the deadline to prevent server crashes. Download and save your submission confirmation receipt.",
  },
];

export function ApplicationBlueprint({ opportunity }: Props) {
  const headingId = useId();
  const docs = getCategoryDocuments(opportunity.category);
  const [completedDocs, setCompletedDocs] = useState<Record<string, boolean>>({});

  const toggleDoc = (id: string) => {
    setCompletedDocs((prev: Record<string, boolean>) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = Object.values(completedDocs).filter(Boolean).length;
  const totalDocs = docs.length;
  const progressPercent = Math.round((completedCount / totalDocs) * 100);

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      {/* Header */}
      <div className="border-b border-border bg-muted/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </span>
            <div>
              <h2 id={headingId} className="font-display text-lg font-bold text-foreground">
                Application Blueprint
              </h2>
              <p className="text-xs text-muted-foreground">
                Step-by-step roadmap & document preparation checklist
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> ₦0 Application Fee Guaranteed
          </span>
        </div>

        {/* Progress Tracker */}
        <div className="mt-5 rounded-xl border border-border/80 bg-background/80 p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-medium text-foreground">
              Document Readiness:{" "}
              <strong className="text-primary">
                {completedCount} of {totalDocs} prepared
              </strong>
            </span>
            <span className="font-semibold text-muted-foreground">{progressPercent}%</span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent === 100 && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-success">
              <Sparkles className="h-3.5 w-3.5" /> All documents marked ready! You are prepared to apply on the official portal.
            </p>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-8">
        {/* Document Checklist */}
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Required Documents Checklist</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Check off each document as you prepare and scan it into PDF format.
          </p>

          <fieldset className="mt-3.5 space-y-2.5">
            <legend className="sr-only">Document preparation checklist</legend>
            {docs.map((doc) => {
              const isChecked = !!completedDocs[doc.id];
              return (
                <label
                  key={doc.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                    isChecked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/80 bg-background hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDoc(doc.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isChecked ? "text-primary line-through" : "text-foreground"
                        }`}
                      >
                        {doc.label}
                      </span>
                      {doc.isCrucial && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{doc.hint}</p>
                  </div>
                </label>
              );
            })}
          </fieldset>
        </div>

        {/* 4-Step Application Roadmap */}
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Step-by-Step Portal Submission Roadmap</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Follow these sequential stages to complete your official application without errors.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {applicationSteps.map((s) => (
              <div
                key={s.step}
                className="relative rounded-xl border border-border/70 bg-background/50 p-4 transition-colors hover:border-border"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary/10 font-mono text-xs font-bold text-secondary">
                    {s.step}
                  </span>
                  <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Security / Scam Advisory Notice */}
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs text-foreground">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <div className="space-y-1">
              <strong className="font-semibold">Important Security Reminder:</strong>
              <p className="leading-relaxed text-muted-foreground">
                Never pay money or agent fees to anyone promising guaranteed admission or selection.
                Official portals for {opportunity.organization} handle applications through their own
                secured domain. Always confirm deadline:{" "}
                <span className="font-medium text-foreground">
                  {formatDeadline(opportunity.deadline)}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
    }
          
