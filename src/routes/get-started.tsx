import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldError, fieldClass, labelClass, submitClass } from "@/components/AuthShell";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Create Your Account — ICK Opportunities" },
      {
        name: "description",
        content:
          "Sign up for ICK Opportunities to discover verified scholarships, jobs, internships, and grants.",
      },
      { property: "og:title", content: "Create Your Account — ICK Opportunities" },
      {
        property: "og:description",
        content:
          "Sign up for ICK Opportunities to discover verified scholarships, jobs, internships, and grants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUpPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100, "Name is too long"),
    email: z.string().trim().email("Enter a valid email address").max(255),
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

type Errors = Partial<Record<"fullName" | "email" | "password" | "confirmPassword", string>>;

function SignUpPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);

    if (error) {
      const message = error.message.toLowerCase();
      setFormError(
        message.includes("already") || message.includes("registered")
          ? "An account with this email already exists. Try signing in instead, or reset your password."
          : error.message
      );
      return;
    }

    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent a confirmation link to complete your account setup."
      >
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            We've sent a confirmation link to <span className="font-semibold text-foreground">{values.email}</span>.
            Open it to activate your ICK Opportunities account, then sign in.
          </p>
          <Link to="/signin" className={`${submitClass} mt-6`}>
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join ICK Opportunities to discover scholarships, jobs, internships, and grants built around your goals."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-foreground underline underline-offset-4">
            Sign in
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
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={values.fullName}
            onChange={set("fullName")}
            aria-invalid={!!errors.fullName}
            className={fieldClass}
            placeholder="Amina Yusuf"
          />
          <FieldError>{errors.fullName}</FieldError>
        </div>

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
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
            aria-invalid={!!errors.password}
            className={fieldClass}
            placeholder="At least 8 characters"
          />
          <FieldError>{errors.password}</FieldError>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Minimum 8 characters, including a letter and a number.
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={set("confirmPassword")}
            aria-invalid={!!errors.confirmPassword}
            className={fieldClass}
            placeholder="Re-enter your password"
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </div>

        <button type="submit" disabled={loading} className={submitClass}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
