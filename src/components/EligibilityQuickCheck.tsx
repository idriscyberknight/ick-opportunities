import { useId, useState } from "react";
import { formatDeadline } from "@/lib/opportunities";

interface Props {
  opportunity: {
    id?: string;
    category: string;
    country: string | null;
    eligibility: string | null;
    benefits: string | null;
    description: string | null;
    deadline: string | null;
  };
}

const checks = [
  "I have checked citizenship, residence, age, education, experience and language requirements on the official provider's page.",
  "I have checked the funding or pay, any costs, and the documents required by the provider.",
  "I have confirmed that applications are open and checked the deadline, closing time and time zone with the provider.",
];

function QuickCheckContent({ opportunity }: Props) {
  const headingId = useId();
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const checkedCount = checked.filter(Boolean).length;

  const cards = [
    {
      title: "Eligibility recorded in this listing",
      body: opportunity.eligibility?.trim() ||
        "Not stated in this listing. Check the official requirements.",
    },
    {
      title: "Benefits recorded in this listing",
      body: opportunity.benefits?.trim() ||
        "Not stated in this listing. Confirm funding, pay and any costs with the provider.",
    },
    {
      title: "Location recorded in this listing",
      body: opportunity.country?.trim() || "Not stated in this listing.",
      note: "A location or remote label does not establish which nationalities or residents may apply.",
    },
    {
      title: "Deadline recorded in this listing",
      body: opportunity.deadline?.trim()
        ? formatDeadline(opportunity.deadline.trim())
        : "Not stated in this listing.",
      note: "Confirm the current application status, closing time and time zone on the provider's page.",
    },
  ];

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      <div className="border-b border-border bg-muted/40 px-5 py-4 sm:px-6">
        <h2 id={headingId} className="font-display text-lg font-bold text-foreground">
          Eligibility Quick-Check
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review this listing, then confirm the details with the official provider.
          This checklist does not determine your eligibility.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {cards.map((card) => (
          <div key={card.title} className="min-w-0 rounded-xl border border-border/60 bg-background/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {card.body}
            </p>
            {card.note && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.note}</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border bg-muted/20 px-5 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          These are the details currently saved in the listing, not a fresh
          verification of the source. Missing information does not mean a
          requirement is waived or a benefit is included.
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-foreground">
            Your review checklist
          </legend>
          <div className="mt-3 space-y-3">
            {checks.map((label, index) => (
              <label key={label} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={checked[index]}
                  onChange={(event) => {
                    const nextChecked = event.currentTarget.checked;
                    setChecked((previous) => previous.map((value, i) =>
                      i === index ? nextChecked : value,
                    ));
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {checkedCount === checks.length
            ? "You marked all 3 review steps complete. This is your own checklist, not confirmation of eligibility or an award. The provider makes the final decision."
            : `${checkedCount} of ${checks.length} review steps marked complete.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Checklist selections are temporary and are not saved to your account.
        </p>
      </div>
    </section>
  );
}

export function EligibilityQuickCheck({ opportunity }: Props) {
  // Reset the checklist when the opportunity or its displayed details change.
  const checklistKey = JSON.stringify([
    opportunity.id,
    opportunity.category,
    opportunity.country,
    opportunity.eligibility,
    opportunity.benefits,
    opportunity.description,
    opportunity.deadline,
  ]);

  return <QuickCheckContent key={checklistKey} opportunity={opportunity} />;
}
