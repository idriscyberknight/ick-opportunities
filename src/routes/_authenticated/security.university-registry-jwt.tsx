import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UniversityRegistryDatabase } from "@/lib/university-registry-schema.types";
import { supabase } from "@/integrations/supabase/client";

/**
 * TEMPORARY PREVIEW-ONLY A1.5 acceptance probe. DO NOT MERGE TO MAIN.
 * Never prints, stores or logs JWTs, usernames, user IDs, private rows or credentials.
 * Write probes are constructed to violate a pre-existing database CHECK/FK constraint
 * even if a mistaken RLS rule were to allow them. They must NEVER create valid data.
 * A constraint failure is reported as REVIEW / FAIL, NOT as RLS success.
 */
export const Route = createFileRoute("/_authenticated/security/university-registry-jwt")({
  head: () => ({
    meta: [
      { title: "A1.5 JWT Security Acceptance — Preview Only" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: JwtRegistryProbe,
});

type Outcome = "PASS" | "REVIEW" | "FAIL";
type Result = {
  name: string;
  status: Outcome;
  detail: string;
};

const registry = supabase as unknown as SupabaseClient<UniversityRegistryDatabase>;
const missingUniversityId = "00000000-0000-4000-8000-000000000099";
const qaSlug = "ick-a15-jwt-denial-no-persist-20261025";

function JwtRegistryProbe() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);

  async function execute() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setResults([]);
    const steps: Result[] = [];
    const record = (name: string, status: Outcome, detail: string) => {
      steps.push({ name, status, detail });
      setResults([...steps]);
    };

    try {
      // This is an authenticated browser session, NOT SQL SET ROLE simulation.
      const auth = await supabase.auth.getUser();
      if (auth.error || !auth.data.user) {
        record("Real session", "FAIL", "No valid signed-in session. Sign in normally.");
        return;
      }

      const role = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (role.error) {
        record("Account role", "REVIEW", "Role query failed; write probes were not run.");
        return;
      }

      if (role.data) {
        record("Account role", "FAIL", "Use an existing Normal User, not Admin.");
        return;
      }

      record("Real session and role", "PASS", "Validated session; no Admin role assignment.");

      const queries = [
        ["universities", () => registry.from("universities").select("id").limit(1)],
        ["university_aliases", () => registry.from("university_aliases").select("id").limit(1)],
        ["university_evidence", () => registry.from("university_evidence").select("id").limit(1)],
        [
          "university_classifications",
          () => registry.from("university_classifications").select("id").limit(1),
        ],
      ] as const;

      for (const [table, query] of queries) {
        const response = await query();
        const label = `Normal-user SELECT ${table}`;
        if (response.error) {
          record(label, "REVIEW", `API error code: ${response.error.code ?? "unknown"}`);
        } else if ((response.data?.length ?? 0) > 0) {
          record(label, "FAIL", "A private registry row was returned.");
          return;
        } else {
          record(label, "PASS", "Zero visible rows; empty-table isolation is unproven.");
        }
      }

      // Every payload is GUARANTEED INVALID under the existing production schema:
      // 1. universities violates universities_no_publishing_yet CHECK;
      // 2-4. child rows reference a nonexistent university ID, violating FK.
      // Consequently, a misconfigured RLS rule MUST NOT result in persisted data.
      const attempts = [
        [
          "universities",
          () =>
            registry.from("universities").insert({
              slug: qaSlug,
              official_name: "ICK JWT QA TEST - NOT A REAL UNIVERSITY",
              country_code: "NG",
              publication_status: "published",
              published_at: new Date().toISOString(),
            }),
        ],
        [
          "university_aliases",
          () =>
            registry.from("university_aliases").insert({
              university_id: missingUniversityId,
              alias: "ICK QA MUST-NOT-PERSIST ALIAS",
            }),
        ],
        [
          "university_evidence",
          () =>
            registry.from("university_evidence").insert({
              university_id: missingUniversityId,
              claim_type: "identity",
              source_url: "https://example.invalid/ick-a15-jwt-probe",
            }),
        ],
        [
          "university_classifications",
          () =>
            registry.from("university_classifications").insert({
              university_id: missingUniversityId,
              classification_key: "general_institution",
              evidence_id: "00000000-0000-4000-8000-000000000098",
            }),
        ],
      ] as const;

      for (const [table, attempt] of attempts) {
        const result = await attempt();
        const label = `Normal-user INSERT ${table}`;
        if (!result.error) {
          record(label, "FAIL", "Unexpected INSERT success; stop testing.");
          return;
        }
        const code = result.error.code ?? "unknown";
        if (code === "42501") {
          record(label, "PASS", "Live JWT API denied INSERT (42501).");
        } else {
          record(label, "REVIEW", `Denied with ${code}, not RLS code 42501.`);
        }
      }
    } catch {
      record("Unexpected runtime error", "REVIEW", "Probe interrupted.");
    } finally {
      setRunning(false);
      setDone(true);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
      <Link to="/dashboard" className="text-sm font-semibold text-primary underline">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold">A1.5 — Real-JWT Normal User Security Check</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Preview-only diagnostic. Use your existing Normal User account, not Admin. No passwords,
        JWTs, or private records are displayed.
      </p>
      <p className="rounded-xl border border-border p-4 text-sm">
        Each POST violates an existing CHECK or foreign-key constraint. PostgreSQL 42501 is required
        to prove write denial.
      </p>
      <button
        type="button"
        onClick={() => void execute()}
        disabled={running}
        className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {running ? "Checking…" : "Run real-session security checks"}
      </button>
      <section aria-live="polite" className="space-y-3">
        {results.map((r) => (
          <div key={r.name} className="rounded-xl border border-border bg-card p-4">
            <div className="font-semibold">
              <span
                className={
                  r.status === "PASS"
                    ? "text-green-700 dark:text-green-400"
                    : "text-amber-700 dark:text-amber-400"
                }
              >
                {r.status}
              </span>{" "}
              — {r.name}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
          </div>
        ))}
      </section>
      {done && <p className="text-sm font-semibold">Share a screenshot of the result cards.</p>}
      <p className="text-xs text-muted-foreground">
        No real-record PATCH test or nonempty row isolation. Do not merge this page.
      </p>
    </main>
  );
}
