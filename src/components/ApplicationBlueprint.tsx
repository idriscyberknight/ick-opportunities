import { useId, useState } from "react";
import { ClipboardList, Info } from "lucide-react";

interface Props {
  opportunity: {
    id: string;
    category: string;
  };
}

interface PreparationItem {
  id: string;
  label: string;
  hint: string;
}

function getSuggestions(category: string): PreparationItem[] {
  switch (category) {
    case "scholarship":
      return [
        {
          id: "academic",
          label: "Academic records",
          hint: "Check whether the provider requests transcripts, certificates or other academic evidence.",
        },
        {
          id: "statement",
          label: "Personal statement",
          hint: "Prepare one only if requested. Follow the provider's topic and word limit.",
        },
        {
          id: "references",
          label: "References",
          hint: "Confirm whether references are needed and how referees should submit them.",
        },
      ];

    case "job":
      return [
        {
          id: "resume",
          label: "CV or résumé",
          hint: "Check the vacancy instructions and tailor your experience to the role.",
        },
        {
          id: "cover-letter",
          label: "Cover letter",
          hint: "Include one if requested or accepted by the employer.",
        },
        {
          id: "work-samples",
          label: "Portfolio or work samples",
          hint: "Provide relevant examples only when requested or appropriate.",
        },
      ];

    case "internship":
      return [
        {
          id: "resume",
          label: "CV or résumé",
          hint: "Consider relevant coursework, projects and experience.",
        },
        {
          id: "status-evidence",
          label: "Education or graduation evidence",
          hint: "Check the actual eligibility rules. An internship may accept students, graduates or both.",
        },
        {
          id: "statement",
          label: "Statement of interest",
          hint: "Prepare one if the application asks for it.",
        },
      ];

    case "grant":
      return [
        {
          id: "proposal",
          label: "Project or business proposal",
          hint: "Use the funder's requested format and explain the proposed work.",
        },
        {
          id: "budget",
          label: "Budget",
          hint: "Check eligible costs, currency and any required budget template.",
        },
        {
          id: "supporting-evidence",
          label: "Supporting evidence",
          hint: "Confirm whether registration documents, references or other evidence are required.",
        },
      ];

    default:
      return [
        {
          id: "instructions",
          label: "Application instructions",
          hint: "Read the provider's current instructions before preparing documents.",
        },
        {
          id: "supporting-evidence",
          label: "Supporting evidence",
          hint: "Prepare only the documents requested for this opportunity.",
        },
      ];
  }
}

function PreparationChecklist({ opportunity }: Props) {
  const headingId = useId();
  const items = getSuggestions(opportunity.category);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const completedCount = items.filter(
    (item) => checked[item.id] === true,
  ).length;

  const progress = Math.round(
    (completedCount / items.length) * 100,
  );

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="border-b border-border bg-muted/40 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <ClipboardList
            className="h-6 w-6 shrink-0 text-primary"
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="font-display text-lg font-bold text-foreground"
          >
            Application Preparation
          </h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          These are general preparation suggestions for this category,
          not a verified list of this provider&apos;s requirements.
          Some suggestions may not apply, and additional documents may
          be required. Follow the current instructions on the provider&apos;s
          own application page.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="rounded-xl border border-border bg-background p-4">
          <p
            role="status"
            className="text-sm font-medium text-foreground"
          >
            {completedCount} of {items.length} preparation suggestions
            marked reviewed
          </p>

          <progress
            value={completedCount}
            max={items.length}
            aria-label="Preparation suggestions reviewed"
            className="mt-3 block h-2 w-full accent-primary"
          >
            {progress}%
          </progress>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            This records your own review only. It does not confirm
            eligibility, document completeness, submission or selection.
            Selections are temporary and are not saved to your account.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-foreground">
            Suggested preparation — check what applies
          </legend>

          <div className="mt-3 space-y-3">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4"
              >
                <input
                  type="checkbox"
                  checked={checked[item.id] === true}
                  onChange={(event) => {
                    const nextChecked = event.currentTarget.checked;

                    setChecked((previous) => ({
                      ...previous,
                      [item.id]: nextChecked,
                    }));
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />

                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {item.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Before submitting
          </h3>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Confirm that applications are open and check the closing
              date, time and time zone with the provider.
            </li>
            <li>
              Confirm eligibility, required documents, file formats,
              upload limits and any translation requirements.
            </li>
            <li>
              Check application fees and other costs directly with the
              provider. This checklist does not verify fee information.
            </li>
            <li>
              Review your answers before submitting and retain any
              confirmation supplied by the application portal.
            </li>
          </ul>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Verify the provider&apos;s website before entering personal
            information or paying any stated fee. Do not share passwords
            or one-time codes with anyone promising admission, funding
            or employment.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ApplicationBlueprint({ opportunity }: Props) {
  const checklistKey = JSON.stringify([
    opportunity.id,
    opportunity.category,
  ]);

  return (
    <PreparationChecklist
      key={checklistKey}
      opportunity={opportunity}
    />
  );
          }
