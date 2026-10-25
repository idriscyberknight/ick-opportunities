import { Link } from "@tanstack/react-router";
import type { RegistryAlias, RegistryUniversity } from "@/lib/university-registry-admin";
import { reconcileUniversityDirectory } from "@/lib/university-reconciliation";

type Props = {
  universities: readonly RegistryUniversity[];
  aliases: readonly RegistryAlias[];
};

const labels = {
  candidate: "Possible match — manual review required",
  unmatched: "No matching private draft",
  ambiguous: "Multiple private matches — investigate",
  country_conflict: "Conflict — same slug, different country",
} as const;

/** Admin-only display: no database mutations and no public exposure of draft rows. */
export function UniversityReconciliationPanel({ universities, aliases }: Props) {
  const result = reconcileUniversityDirectory(universities, aliases);

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      aria-labelledby="a17-reconciliation-heading"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        A1.7 · Read-only migration planning
      </p>
      <h2 id="a17-reconciliation-heading" className="mt-2 font-display text-xl font-bold">
        Reconcile public directory and private registry
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        The public directory still has eight static profiles. This comparison checks whether any may
        describe institutions already held as private drafts. A possible match is not verification,
        accreditation, or permission to publish. Nothing is imported or changed.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm" role="status">
        <span className="rounded-lg bg-muted px-3 py-2">
          {result.unmatched} not in private registry
        </span>
        <span className="rounded-lg bg-muted px-3 py-2">{result.candidates} candidate matches</span>
        <span className="rounded-lg bg-muted px-3 py-2">
          {result.ambiguous + result.countryConflicts} conflicts
        </span>
        <span className="rounded-lg bg-muted px-3 py-2">
          {result.privateOnly.length} unmatched private drafts
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {result.entries.map((entry) => (
          <article key={entry.starter.slug} className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold">{entry.starter.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.starter.countryCode} · {entry.starter.slug}
            </p>
            <p className="mt-3 text-xs font-semibold">{labels[entry.status]}</p>
            {entry.reasons.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Match signal: {entry.reasons.join("; ")}.
              </p>
            )}
            <Link
              to="/scholarship-navigator/universities/$slug"
              params={{ slug: entry.starter.slug }}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline"
            >
              Existing public profile
            </Link>
          </article>
        ))}
      </div>
      {result.privateOnly.length > 0 && (
        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
          <h3 className="text-sm font-bold">Private drafts not matched to a public profile</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            These private names are shown only in this Admin workspace. Do not reuse an existing
            public identity without investigating source and country conflicts.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {result.privateOnly.map((row) => (
              <li key={row.id}>
                {row.official_name} ({row.country_code}) · {row.publication_status}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Public directory entries are not yet database-backed. The private registry publishing CHECK
        remains in force; no public-read RLS or synchronization is enabled by this panel.
      </p>
    </section>
  );
}
