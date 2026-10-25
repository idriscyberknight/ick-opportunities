import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { UniversityRegistryDatabase } from "@/lib/university-registry-schema.types";
import { isCurrentUserAdmin } from "@/lib/opportunities";

/**
 * Preview-only read-only diagnostic for the currently signed-in REAL session.
 * REMOVE this route before approving production merge.
 *
 * Every database probe is a PostgREST HEAD (no rows or identities returned).
 * No form submission, role assignments, INSERT/UPDATE/DELETE, secrets, JWT
 * display, or artificial data fixtures. Do not mistake an empty-table count
 * for proof that non-admin users cannot read another user's data.
 */
export const Route = createFileRoute("/_authenticated/security/university-registry")({
  head: () => ({
    meta: [
      { title: "University Registry JWT Probe — ICK Opportunities Preview" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UniversityRegistryJwtProbe,
});

type RegistryTable =
  "universities" | "university_aliases" | "university_evidence" | "university_classifications";

type ProbeRow = {
  table: RegistryTable;
  httpStatus: number;
  label: string;
  verdict: "PASS" | "REVIEW" | "ALERT";
};

type ProbeResult = {
  jwtAuthenticated: boolean;
  admin: boolean;
  rows: ProbeRow[];
  notice: string;
};

const tableNames: RegistryTable[] = [
  "universities",
  "university_aliases",
  "university_evidence",
  "university_classifications",
];

const registry = supabase as unknown as SupabaseClient<UniversityRegistryDatabase>;

async function runReadOnlyJwtProbe(): Promise<ProbeResult> {
  // auth.getUser() performs a real Auth API request with the current session,
  // unlike reading user data from local storage.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("No validated signed-in session. Sign in and retry.");
  }

  const admin = await isCurrentUserAdmin();
  const rows: ProbeRow[] = [];

  // Sequential requests avoid overloading the user's mobile connection.
  // The caller's ordinary/admin JWT is attached by the existing Supabase
  // client; this diagnostic does not handle or show the bearer token.
  for (const table of tableNames) {
    const response = await registry.from(table).select("id", { count: "exact", head: true });

    if (response.error) {
      rows.push({
        table,
        httpStatus: response.status,
        label: "Read request failed; inspect status and backend grants.",
        verdict: "ALERT",
      });
    } else if (!admin && (response.count ?? 0) > 0) {
      rows.push({
        table,
        httpStatus: response.status,
        label: "Non-admin could see registry records. Investigate immediately.",
        verdict: "ALERT",
      });
    } else {
      rows.push({
        table,
        httpStatus: response.status,
        label: admin
          ? "Authenticated Admin GET reached the table (data not displayed)."
          : "Authenticated non-admin GET returned zero rows; isolation remains unproven without fixtures.",
        verdict: admin ? "PASS" : "REVIEW",
      });
    }
  }

  return {
    jwtAuthenticated: true,
    admin,
    rows,
    notice:
      "This uses the CURRENT browser's validated session and read-only API calls. " +
      "A 200 response and zero records cannot prove unauthorized writes are blocked " +
      "or cross-user isolation when the tables have no records. Real non-admin " +
      "write-denial tests remain separate.",
  };
}

function UniversityRegistryJwtProbe() {
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function perform() {
    setResult(null);
    setError("");
    setRunning(true);
    try {
      setResult(await runReadOnlyJwtProbe());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete probe.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link
        to="/admin/universities"
        className="inline-block rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
      >
        ← University admin
      </Link>
      <h1 className="font-display text-2xl font-bold">A1.5 — Real-session JWT API check</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Preview-only security diagnostic. Uses your existing signed-in account to make HEAD-only
        reads against the four Registry tables. No JWT, email, account ID, university record or
        personal information is displayed.
      </p>
      <p className="rounded-lg border border-border bg-muted p-4 text-sm">
        This is a temporary acceptance-test route and must be removed before merging the production
        application.
      </p>
      <button
        type="button"
        onClick={perform}
        disabled={running}
        className="min-h-11 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
      >
        {running ? "Running read-only checks…" : "Run real-session read-only check"}
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <section className="space-y-3" aria-live="polite">
          <h2 className="text-xl font-bold">Results</h2>
          <p className="text-sm">
            Validated session: <strong>{result.jwtAuthenticated ? "YES" : "NO"}</strong>
            {" · "}
            Role lookup: <strong>{result.admin ? "ADMIN" : "NORMAL USER"}</strong>
          </p>
          {result.rows.map((row) => (
            <div key={row.table} className="rounded-xl border border-border bg-card p-4">
              <h3 className="break-all font-semibold">{row.table}</h3>
              <p className="mt-1 text-sm">
                <strong>{row.verdict}</strong>
                {" · "}HTTP {row.httpStatus}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{row.label}</p>
            </div>
          ))}
          <p className="rounded-xl border border-border p-4 text-sm leading-6 text-muted-foreground">
            {result.notice}
          </p>
        </section>
      )}
    </main>
  );
}
