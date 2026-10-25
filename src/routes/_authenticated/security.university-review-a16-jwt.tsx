import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { UniversityEvidenceReviewDatabase } from "@/lib/university-registry-schema.types";

/**
 * A1.6.2 TEMPORARY PREVIEW-ONLY real-session security acceptance.
 * DO NOT MERGE TO MAIN. No valid writes, no tokens/user IDs/private rows
 * displayed, logged or saved. The RPC's intentionally invalid expected state
 * is rejected BEFORE accessing or changing any evidence.
 */
export const Route = createFileRoute("/_authenticated/security/university-review-a16-jwt")({
  head: () => ({
    meta: [
      { title: "A1.6.2 Real-JWT Review Security — Preview Only" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: UniversityReviewA16JwtProbe,
});

type Result = { label: string; status: "PASS" | "REVIEW" | "FAIL"; detail: string };
const registry = supabase as unknown as SupabaseClient<UniversityEvidenceReviewDatabase>;
const impossibleId = "00000000-0000-4000-8000-000000000099";

function UniversityReviewA16JwtProbe() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  async function run() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setResults([]);
    const findings: Result[] = [];
    const report = (label: string, status: Result["status"], detail: string) => {
      findings.push({ label, status, detail });
      setResults([...findings]);
    };

    try {
      const { data: session, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !session.user) {
        report("Authenticated browser session", "FAIL", "Sign in to your existing account.");
        return;
      }
      report("Real signed-in browser session", "PASS", "Auth server validated this session.");

      const role = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (role.error) {
        report("Determine current account role", "REVIEW", "Role lookup failed; no RPC was called.");
        return;
      }

      const isAdmin = !!role.data;
      report("Current role", "PASS", isAdmin ? "Admin session." : "Normal User session.");

      // HEAD/count does not return or expose any underlying private records.
      const tables = [
        ["universities", () => registry.from("universities").select("id", { count: "exact", head: true })],
        [
          "university_aliases",
          () => registry.from("university_aliases").select("id", { count: "exact", head: true }),
        ],
        [
          "university_evidence",
          () => registry.from("university_evidence").select("id", { count: "exact", head: true }),
        ],
        [
          "university_classifications",
          () => registry.from("university_classifications").select("id", { count: "exact", head: true }),
        ],
      ] as const;

      for (const [table, query] of tables) {
        const result = await query();
        if (result.error || result.count == null) {
          report(`Private SELECT ${table}`, "REVIEW", "Count unavailable or API denied.");
        } else if (!isAdmin && result.count !== 0) {
          report(`Private SELECT ${table}`, "FAIL", "Normal User can see private rows.");
          return;
        } else if (isAdmin && ["universities", "university_evidence"].includes(table) && result.count < 1) {
          report(`Private SELECT ${table}`, "REVIEW", "Expected existing Admin draft is not visible.");
        } else {
          report(
            `Private SELECT ${table}`,
            "PASS",
            isAdmin ? "Admin may query registry; no row content shown." : "Zero private rows visible.",
          );
        }
      }

      // This RPC request is provably no-write even if authorization fails:
      // p_expected_state is invalid and is checked before SELECT FOR UPDATE.
      // The impossibleId is also unrelated to actual project records.
      const rpc = await registry.rpc("ick_a16_review_evidence", {
        p_evidence_id: impossibleId,
        p_decision: "reviewed",
        p_reason: "SECURITY DIAGNOSTIC ONLY: intentionally invalid state, never review evidence.",
        p_expected_state: "qa_must_reject_without_mutation" as "pending_review",
      });
      const code = rpc.error?.code ?? "success";
      if (!rpc.error) {
        report("Role-checked review RPC", "FAIL", "Unexpected success; stop and report this.");
        return;
      }
      if (isAdmin && code === "22023") {
        report("Admin real-JWT RPC", "PASS", "Admin passed authorization; invalid request safely rejected (22023).");
      } else if (!isAdmin && code === "42501") {
        report("Normal User real-JWT RPC", "PASS", "Database denied review to Normal User (42501).");
      } else {
        report("Role-checked review RPC", "REVIEW", `Unexpected error code: ${code}.`);
      }

      // These UPDATE calls target a known-nonexistent UUID. If permissions
      // were accidentally granted they still cannot touch a real row.
      const directUpdates = [
        [
          "university_evidence.review_status",
          () =>
            registry
              .from("university_evidence")
              .update({ review_status: "reviewed" })
              .eq("id", impossibleId),
        ],
        [
          "universities.verification_status",
          () =>
            registry
              .from("universities")
              .update({ verification_status: "verified" })
              .eq("id", impossibleId),
        ],
      ] as const;

      for (const [field, update] of directUpdates) {
        const result = await update();
        if (result.error?.code === "42501") {
          report(`Direct UPDATE ${field}`, "PASS", "Column permission denied (42501).");
        } else if (result.error) {
          report(`Direct UPDATE ${field}`, "REVIEW", `Error code: ${result.error.code ?? "unknown"}.`);
        } else {
          report(`Direct UPDATE ${field}`, "FAIL", "Privilege bypass: API accepted direct status PATCH (no rows targeted).");
        }
      }
    } catch {
      report("Unexpected runtime exception", "REVIEW", "Diagnostic interrupted.");
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
      <h1 className="text-2xl font-bold">A1.6.2 — Real-JWT Security Verification</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Temporary Preview-only security test for Admin and Normal User sessions. No
        source data, passwords, tokens, or user IDs appear on this page.
      </p>
      <p className="rounded-xl border border-border p-4 text-sm">
        This diagnostic checks real browser authorization, private row visibility,
        and protected status fields. It cannot approve an institution or publish anything.
      </p>
      <button
        type="button"
        disabled={running}
        onClick={() => void run()}
        className="min-h-11 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
      >
        {running ? "Running security checks…" : "Run A1.6.2 real-session checks"}
      </button>
      <section aria-live="polite" className="space-y-3">
        {results.map((r) => (
          <div key={r.label} className="rounded-xl border border-border bg-card p-4">
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
              — {r.label}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
          </div>
        ))}
      </section>
      {done && <p className="text-sm font-semibold">Share screenshot(s) of result cards only.</p>}
      <p className="text-xs text-muted-foreground">
        No real source-review decision was submitted. This temporary diagnostic must not be
        merged into Production.
      </p>
    </main>
  );
}
