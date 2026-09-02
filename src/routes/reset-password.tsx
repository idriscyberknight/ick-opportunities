import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldError, fieldClass, labelClass, submitClass } from "@/components/AuthShell";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a New Password — ICK Opportunities" },
      {
        name: "description",
        content: "Choose a new password for your ICK Opportunities account.",
      },
      { property: "og:title", content: "Set a New Password — ICK Opportunities" },
      {
        property: "og:description",
        content: "Choose a new password for your ICK Opportunities account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Password is too long")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<"password" | "confirmPassword", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<"password" | "confirmPassword", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "password" | "confirmPassword";
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  if (ready && !hasSession) {
    return (
      <AuthShell
        title="Reset link expired"
        subtitle="This password reset link is invalid or has already been used."
        footer={
          <Link to="/forgot-password" className="font-semibold text-foreground underline underline-offset-4">
            Request a new link
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          For your security, reset links can only be used once and expire after a short time.
          Request a new link to continue.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div>
          <label htmlFor="password" className={labelClass}>
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setValues((p) => ({ ...p, password: e.target.value }))}
            aria-invalid={!!errors.password}
            className={fieldClass}
            placeholder="At least 8 characters"
          />
          <FieldError>{errors.password}</FieldError>
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(e) => setValues((p) => ({ ...p, confirmPassword: e.target.value }))}
            aria-invalid={!!errors.confirmPassword}
            className={fieldClass}
            placeholder="Re-enter your new password"
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </div>

        <button type="submit" disabled={loading || !ready} className={submitClass}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Updating password…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
