import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plus, ShieldCheck } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/opportunities";
import { fieldClass, labelClass } from "@/components/AuthShell";
import {
  A16_EVIDENCE_REVIEW_RELEASE_ENABLED,
  CLASSIFICATIONS,
  EVIDENCE_CLAIMS,
  createUniversityAlias,
  createUniversityClassification,
  createUniversityDraft,
  createUniversityEvidence,
  listAdminUniversityRegistry,
  reviewUniversityEvidence,
  updateUniversityDraft,
  type ClassificationKey,
  type EvidenceReviewDecision,
  type EvidenceClaim,
  type RegistryUniversity,
} from "@/lib/university-registry-admin";

/**
 * Restricted editorial workspace; NOT a university publishing interface.
 * All writes are draft/unreviewed. PostgreSQL RLS is the source of truth.
 * NO automatic import of the eight existing static editorial directory entries.
 */
export const Route = createFileRoute("/_authenticated/admin/universities")({
  head: () => ({
    meta: [
      { title: "University Registry Admin — ICK Opportunities" },
      {
        name: "description",
        content: "Restricted university draft and evidence review workspace.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UniversityRegistryAdminPage,
});

const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

function Feedback({ error }: { error: Error | null }) {
  return error ? (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {error.message}
    </p>
  ) : null;
}

function Busy() {
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-3 p-8 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading registry…
    </div>
  );
}

type DraftData = {
  official_name: string;
  country_code: string;
  city: string;
  official_website: string;
  summary: string;
};
const emptyDraft: DraftData = {
  official_name: "",
  country_code: "",
  city: "",
  official_website: "",
  summary: "",
};
const editable = (u: RegistryUniversity): DraftData => ({
  official_name: u.official_name,
  country_code: u.country_code,
  city: u.city ?? "",
  official_website: u.official_website ?? "",
  summary: u.summary ?? "",
});

function UniversityRegistryAdminPage() {
  const qc = useQueryClient();
  const draftEditorRef = useRef<HTMLElement>(null);
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isCurrentUserAdmin });
  const allowed = admin.data === true;
  const registry = useQuery({
    queryKey: ["a15-university-admin-registry"],
    queryFn: listAdminUniversityRegistry,
    enabled: allowed,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [draft, setDraft] = useState<DraftData>(emptyDraft);
  const [edit, setEdit] = useState<DraftData>(emptyDraft);
  const [alias, setAlias] = useState("");
  const [language, setLanguage] = useState("");
  const [claimType, setClaimType] = useState<EvidenceClaim>("identity");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [classificationKey, setClassificationKey] = useState<ClassificationKey>(
    "islamic_studies_provider",
  );
  const [classificationEvidenceId, setClassificationEvidenceId] = useState("");
  const [reviewEvidenceId, setReviewEvidenceId] = useState("");
  const [reviewDecision, setReviewDecision] = useState<EvidenceReviewDecision>("reviewed");
  const [reviewReason, setReviewReason] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["a15-university-admin-registry"] });
  const createDraft = useMutation({
    mutationFn: () => createUniversityDraft({ slug, ...draft }),
    onSuccess: () => {
      setSlug("");
      setDraft(emptyDraft);
      invalidate();
    },
  });
  const updateDraft = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("Select a draft first.");
      return updateUniversityDraft(selectedId, edit);
    },
    onSuccess: invalidate,
  });
  const addAlias = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("Select a university.");
      return createUniversityAlias(selectedId, alias, language);
    },
    onSuccess: () => {
      setAlias("");
      setLanguage("");
      invalidate();
    },
  });
  const addEvidence = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("Select a university.");
      return createUniversityEvidence(selectedId, sourceUrl, claimType, sourceTitle);
    },
    onSuccess: () => {
      setSourceUrl("");
      setSourceTitle("");
      invalidate();
    },
  });
  const reviewEvidence = useMutation({
    mutationFn: () => {
      if (!A16_EVIDENCE_REVIEW_RELEASE_ENABLED) {
        throw new Error("Evidence review is unavailable until the backend migration is approved.");
      }
      const matchingSource = registry.data?.evidence?.find(
        (item) =>
          item.id === reviewEvidenceId &&
          item.university_id === selectedId &&
          item.review_status === "pending_review",
      );
      if (!matchingSource) throw new Error("Select a pending source for the selected institution.");
      return reviewUniversityEvidence(reviewEvidenceId, reviewDecision, reviewReason);
    },
    onSuccess: () => {
      setReviewEvidenceId("");
      setReviewReason("");
      invalidate();
    },
  });
  const addClassification = useMutation({
    mutationFn: () => {
      if (!selectedId || !classificationEvidenceId) throw new Error("Select an evidence record.");
      return createUniversityClassification(
        selectedId,
        classificationKey,
        classificationEvidenceId,
      );
    },
    onSuccess: () => {
      setClassificationEvidenceId("");
      invalidate();
    },
  });

  if (admin.isLoading) return <Busy />;
  if (admin.isError)
    return (
      <div className="mx-auto max-w-5xl p-8">
        <Feedback error={admin.error} />
      </div>
    );
  if (!allowed) return <div className="mx-auto max-w-5xl p-8">Administrator access required.</div>;

  const universities = registry.data?.universities ?? [];
  const selected = universities.find((u) => u.id === selectedId) ?? null;
  const evidence = (registry.data?.evidence ?? []).filter((e) => e.university_id === selectedId);
  const aliases = (registry.data?.aliases ?? []).filter((a) => a.university_id === selectedId);
  const classifications = (registry.data?.classifications ?? []).filter(
    (c) => c.university_id === selectedId,
  );
  const draftEditingLocked =
    selected?.verification_status !== "pending_review" ||
    selected?.publication_status !== "draft" ||
    evidence.some((item) => item.review_status === "reviewed");
  const pendingEvidence = evidence.filter((item) => item.review_status === "pending_review");
  // Evidence presence is not editorial approval, identity verification, or accreditation.
  const evidenceChecks = [
    {
      id: "identity",
      label: "Institution identity",
      detail: "Record a source that identifies the actual institution.",
    },
    {
      id: "website",
      label: "Official website",
      detail: "Cross-check the official domain against an independent authority.",
    },
    {
      id: "accreditation",
      label: "National recognition / accreditation",
      detail: "Look up the relevant national regulator; ROR alone is not sufficient.",
    },
  ];
  const reviewedSourceCount = evidence.filter((item) => item.review_status === "reviewed").length;
  const pendingClassificationCount = classifications.filter(
    (item) => item.review_status !== "reviewed",
  ).length;
  const onForm = (e: FormEvent<HTMLFormElement>, submit: () => void) => {
    e.preventDefault();
    submit();
  };

  const choose = (u: RegistryUniversity) => {
    setSelectedId(u.id);
    setEdit(editable(u));
    setClassificationEvidenceId("");
    setAlias("");
    setLanguage("");
    setSourceUrl("");
    setSourceTitle("");
    setReviewEvidenceId("");
    setReviewReason("");
    setReviewDecision("reviewed");
    // The editor lives below the create form. Scroll to it after React renders
    // so selecting an existing draft never appears to do nothing on mobile.
    requestAnimationFrame(() => {
      draftEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      draftEditorRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/review" className={button}>
            ← Opportunity review
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Admin only · Unpublished
          </span>
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">University Registry</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Build internal university drafts with source-backed evidence. Neither creating a
          university nor attaching a source verifies accreditation, admissions or scholarships.
          Publication is intentionally blocked by the database.
        </p>
      </header>

      <section
        className="rounded-2xl border border-border bg-card p-5"
        aria-labelledby="registry-list-heading"
      >
        <h2 id="registry-list-heading" className="font-display text-xl font-bold">
          Internal drafts
        </h2>
        {registry.isLoading ? <Busy /> : null}
        <Feedback error={registry.error} />
        {registry.data && universities.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No university draft records yet. The eight public editorial starter entries are not
            imported automatically.
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {universities.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => choose(u)}
              aria-pressed={selectedId === u.id}
              className={`min-h-16 rounded-xl border p-4 text-left text-sm transition-colors hover:bg-muted ${selectedId === u.id ? "border-primary bg-muted" : "border-border"}`}
            >
              <span className="block font-bold">{u.official_name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {u.country_code} · {u.verification_status} · {u.publication_status}
              </span>
              <span className="mt-2 block text-xs font-semibold text-primary">
                {selectedId === u.id ? "Selected — editing below" : "Tap to open draft editor"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl border border-border bg-card p-5"
        aria-labelledby="new-draft-heading"
      >
        <h2 id="new-draft-heading" className="font-display text-xl font-bold">
          Create an unverified draft
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A new record is internal only and always starts pending review.
        </p>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => onForm(e, () => createDraft.mutate())}
        >
          <Field
            id="draft-slug"
            title="Unique slug"
            value={slug}
            onChange={setSlug}
            required
            placeholder="e.g. example-university"
          />
          <Field
            id="draft-name"
            title="Official institution name"
            value={draft.official_name}
            onChange={(v) => setDraft({ ...draft, official_name: v })}
            required
          />
          <Field
            id="draft-country"
            title="ISO country code (2 letters)"
            value={draft.country_code}
            maxLength={2}
            onChange={(v) => setDraft({ ...draft, country_code: v })}
            required
            placeholder="NG"
          />
          <Field
            id="draft-city"
            title="City (optional)"
            value={draft.city}
            onChange={(v) => setDraft({ ...draft, city: v })}
          />
          <Field
            id="draft-url"
            title="Official HTTPS website (if verified)"
            value={draft.official_website}
            onChange={(v) => setDraft({ ...draft, official_website: v })}
            placeholder="https://…"
          />
          <Field
            id="draft-summary"
            title="Internal short summary"
            value={draft.summary}
            onChange={(v) => setDraft({ ...draft, summary: v })}
          />
          <div className="sm:col-span-2 space-y-3">
            <Feedback error={createDraft.error} />
            <button className={primary} disabled={createDraft.isPending}>
              <Plus className="h-4 w-4" /> {createDraft.isPending ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </section>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            ref={draftEditorRef}
            tabIndex={-1}
            className="scroll-mt-28 rounded-2xl border border-border bg-card p-5"
            aria-labelledby="edit-university-heading"
          >
            <h2 id="edit-university-heading" className="font-display text-xl font-bold">
              Edit draft · {selected.official_name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft editing never resets verification or reviewer metadata. Once an identity source
              is reviewed, changes require a separately audited re-review process. Publication
              remains blocked.
            </p>
            {draftEditingLocked && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-border bg-muted p-3 text-sm"
              >
                Draft editing is locked due to review state. No direct approval-state edits are
                permitted.
              </p>
            )}
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => onForm(e, () => updateDraft.mutate())}
            >
              <Field
                id="edit-name"
                title="Institution name"
                value={edit.official_name}
                disabled={draftEditingLocked}
                onChange={(v) => setEdit({ ...edit, official_name: v })}
                required
              />
              <Field
                id="edit-country"
                title="ISO country code"
                value={edit.country_code}
                maxLength={2}
                disabled={draftEditingLocked}
                onChange={(v) => setEdit({ ...edit, country_code: v })}
                required
              />
              <Field
                id="edit-city"
                title="City"
                value={edit.city}
                disabled={draftEditingLocked}
                onChange={(v) => setEdit({ ...edit, city: v })}
              />
              <Field
                id="edit-url"
                title="Official HTTPS website"
                value={edit.official_website}
                disabled={draftEditingLocked}
                onChange={(v) => setEdit({ ...edit, official_website: v })}
              />
              <Field
                id="edit-summary"
                title="Summary"
                value={edit.summary}
                disabled={draftEditingLocked}
                onChange={(v) => setEdit({ ...edit, summary: v })}
              />
              <Feedback error={updateDraft.error} />
              <button className={primary} disabled={updateDraft.isPending || draftEditingLocked}>
                Save draft changes
              </button>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Names and aliases</h2>
              <ul className="my-3 space-y-1 text-sm text-muted-foreground">
                {aliases.map((a) => (
                  <li key={a.id}>
                    {a.alias} {a.language_code && `(${a.language_code})`}
                  </li>
                ))}
                {!aliases.length && <li>No aliases recorded.</li>}
              </ul>
              <form className="space-y-3" onSubmit={(e) => onForm(e, () => addAlias.mutate())}>
                <Field
                  id="a15-alias"
                  title="Alternative official name / abbreviation"
                  value={alias}
                  onChange={setAlias}
                  required
                />
                <Field
                  id="a15-lang"
                  title="Language code (optional)"
                  value={language}
                  onChange={setLanguage}
                  placeholder="ar / en / fr"
                />
                <Feedback error={addAlias.error} />
                <button className={button} disabled={addAlias.isPending}>
                  Add alias
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Evidence (unreviewed)</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                A submitted source is not automatically authoritative or verified.
              </p>
              <ul className="my-3 space-y-2 text-sm text-muted-foreground">
                {evidence.map((e) => (
                  <li key={e.id} className="break-all">
                    <b>{e.claim_type}</b> · {e.review_status} ·{" "}
                    <a
                      href={e.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-secondary underline"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
                {!evidence.length && <li>No evidence recorded.</li>}
              </ul>
              <form className="space-y-3" onSubmit={(e) => onForm(e, () => addEvidence.mutate())}>
                <label className={labelClass} htmlFor="a15-claim">
                  Evidence claim
                </label>
                <select
                  id="a15-claim"
                  className={fieldClass}
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value as EvidenceClaim)}
                >
                  {EVIDENCE_CLAIMS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <Field
                  id="a15-source-url"
                  title="Source HTTPS URL"
                  value={sourceUrl}
                  onChange={setSourceUrl}
                  required
                  placeholder="https://…"
                />
                <Field
                  id="a15-source-title"
                  title="Source title"
                  value={sourceTitle}
                  onChange={setSourceTitle}
                />
                <Feedback error={addEvidence.error} />
                <button className={button} disabled={addEvidence.isPending}>
                  Attach unreviewed source
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Provisional classifications</h2>
              <ul className="my-3 space-y-1 text-sm text-muted-foreground">
                {classifications.map((c) => (
                  <li key={c.id}>
                    {c.classification_key} · {c.review_status}
                  </li>
                ))}
                {!classifications.length && <li>No classification records.</li>}
              </ul>
              <form
                className="space-y-3"
                onSubmit={(e) => onForm(e, () => addClassification.mutate())}
              >
                <label className={labelClass} htmlFor="a15-category">
                  Category
                </label>
                <select
                  id="a15-category"
                  className={fieldClass}
                  value={classificationKey}
                  onChange={(e) => setClassificationKey(e.target.value as ClassificationKey)}
                >
                  {CLASSIFICATIONS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <label className={labelClass} htmlFor="a15-evidence">
                  Evidence for this institution
                </label>
                <select
                  id="a15-evidence"
                  required
                  className={fieldClass}
                  value={classificationEvidenceId}
                  onChange={(e) => setClassificationEvidenceId(e.target.value)}
                >
                  <option value="">Select a source first</option>
                  {evidence.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.claim_type} · {e.source_title || e.source_url}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  The database requires evidence belonging to the same university. This
                  classification remains pending review.
                </p>
                <Feedback error={addClassification.error} />
                <button
                  className={button}
                  disabled={addClassification.isPending || evidence.length === 0}
                >
                  Add provisional classification
                </button>
              </form>
            </div>
          </section>
          <section
            className="rounded-2xl border border-border bg-card p-5 lg:col-span-2"
            aria-labelledby="a16-readiness-heading"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              A1.6 · Editorial research preparation
            </p>
            <h2 id="a16-readiness-heading" className="mt-2 font-display text-xl font-bold">
              Source checklist · {selected.official_name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This is a read-only research aid, not a verification certificate. Attaching a source
              does not establish institutional recognition, accreditation, or a real scholarship.
              Publication remains disabled at database level.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {evidenceChecks.map((check) => {
                const attached = evidence.some((item) => item.claim_type === check.id);
                return (
                  <li key={check.id} className="rounded-xl border border-border p-4">
                    <span className="text-xs font-bold text-muted-foreground">
                      {attached ? "SOURCE ATTACHED — UNVERIFIED" : "SOURCE NOT YET ATTACHED"}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold">{check.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{check.detail}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Sources marked reviewed: {reviewedSourceCount} of {evidence.length}. Classifications
              awaiting review: {pendingClassificationCount}. These metadata counts do not authorize
              publication or prove source quality.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <a
                href="https://whed.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                WHED — recognized institutions <ExternalLink className="inline h-3 w-3" />
              </a>
              <a
                href="https://ror.org/search"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                ROR — identity lookup <ExternalLink className="inline h-3 w-3" />
              </a>
              {selected.country_code === "NG" && (
                <a
                  href="https://enuc.nuc.edu.ng/nus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline"
                >
                  Nigeria NUC — official universities
                  <ExternalLink className="ml-1 inline h-3 w-3" />
                </a>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Islamic institution and Islamic-studies-provider are distinct claims: verify the
              official classification independently. Never infer an institution’s character from its
              name alone.
            </p>
          </section>
          <section
            className="rounded-2xl border border-border bg-card p-5 lg:col-span-2"
            aria-labelledby="a16-review-heading"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              A1.6.2 · Backend-gated editorial controls
            </p>
            <h2 id="a16-review-heading" className="mt-2 font-display text-xl font-bold">
              Source review decision
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Editorial decisions now use the secured database review function with an audit trail.
              Review each source carefully before deciding. Reviewing a source does not verify
              university accreditation, admission eligibility, or scholarships.
            </p>
            {!A16_EVIDENCE_REVIEW_RELEASE_ENABLED && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-border bg-muted p-3 text-sm"
              >
                Review submission unavailable — database release approval pending. No source can be
                marked verified or published from this form.
              </p>
            )}
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => onForm(event, () => reviewEvidence.mutate())}
            >
              <fieldset
                disabled={!A16_EVIDENCE_REVIEW_RELEASE_ENABLED || reviewEvidence.isPending}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass} htmlFor="a16-review-source">
                    Pending source
                  </label>
                  <select
                    id="a16-review-source"
                    className={fieldClass}
                    value={reviewEvidenceId}
                    required
                    onChange={(event) => setReviewEvidenceId(event.target.value)}
                  >
                    <option value="">Select a pending source</option>
                    {pendingEvidence.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.claim_type} · {source.source_title || source.source_url}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="a16-review-decision">
                    Editorial decision
                  </label>
                  <select
                    id="a16-review-decision"
                    className={fieldClass}
                    value={reviewDecision}
                    onChange={(event) =>
                      setReviewDecision(event.target.value as EvidenceReviewDecision)
                    }
                  >
                    <option value="reviewed">Reviewed source (human attestation only)</option>
                    <option value="rejected">Reject insufficient source</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="a16-review-reason">
                    Review rationale (20–2000 characters)
                  </label>
                  <textarea
                    id="a16-review-reason"
                    className={fieldClass}
                    value={reviewReason}
                    minLength={20}
                    maxLength={2000}
                    rows={4}
                    required
                    placeholder="Describe what the source establishes and how it was checked."
                    onChange={(event) => setReviewReason(event.target.value)}
                  />
                </div>
                <Feedback error={reviewEvidence.error} />
                <button
                  className={primary}
                  disabled={
                    reviewEvidence.isPending ||
                    pendingEvidence.length === 0 ||
                    reviewReason.trim().length < 20 ||
                    !reviewEvidenceId
                  }
                >
                  {reviewEvidence.isPending ? "Recording review…" : "Submit editorial decision"}
                </button>
              </fieldset>
            </form>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              A source-review decision is not university accreditation, a scholarship verification,
              or publication. Only the future secure database function can append the decision to
              the audit history.
            </p>
          </section>
        </div>
      )}
      <footer className="text-xs leading-5 text-muted-foreground">
        A1.5 editorial draft workspace only. There is intentionally no Publish, Delete or automatic
        scholarship listing action. Existing public starter-directory pages are unchanged until a
        separate evidence-backed publication workflow is approved.
      </footer>
    </main>
  );
}

function Field({
  id,
  title,
  value,
  onChange,
  required,
  placeholder,
  maxLength,
  disabled,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {title}
      </label>
      <input
        id={id}
        className={fieldClass}
        type="text"
        required={required}
        value={value}
        maxLength={maxLength ?? 1800}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
