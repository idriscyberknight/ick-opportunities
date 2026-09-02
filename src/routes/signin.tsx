import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldError, fieldClass, labelClass, submitClass } from "@/components/AuthShell";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign In — ICK Opportunities" },
      {
        name: "description",
        content: "Sign in to ICK Opportunities to track scholarships, jobs, internships, and grants.",
      },
      { property: "og:title", content: "Sign In — ICK Opportunities" },
      {
        property: "og:description",
        content: "Sign in to ICK Opportunities to track scholarships, jobs, internships, and grants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignInPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

function SignInPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<"email" | "password", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (error) {
      const message = error.message.toLowerCase();
      setFormError(
        message.includes("invalid login")
          ? "That email and password combination is incorrect. Please try again."
          : message.includes("confirm")
            ? "Please confirm your email address first — check your inbox for the confirmation link."
            : error.message
      );
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Sign in to continue tracking opportunities that match your goals."
      footer={
        <>
          New to ICK Opportunities?{" "}
          <Link to="/get-started" className="font-semibold text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set("email")}
            aria-invalid={!!errors.email}
            className={fieldClass}
            placeholder="you@example.com"
          />
          <FieldError>{errors.email}</FieldError>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={set("password")}
            aria-invalid={!!errors.password}
            className={fieldClass}
            placeholder="Your password"
          />
          <FieldError>{errors.password}</FieldError>
        </div>

        <button type="submit" disabled={loading} className={submitClass}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
