import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, FieldError, fieldClass, labelClass, submitClass } from "@/components/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — ICK Opportunities" },
      {
        name: "description",
        content: "Request a password reset link for your ICK Opportunities account.",
      },
      { property: "og:title", content: "Reset Your Password — ICK Opportunities" },
      {
        property: "og:description",
        content: "Request a password reset link for your ICK Opportunities account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email address").max(255) });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    setError(undefined);
    setLoading(true);
    // Response is intentionally identical whether or not the account exists.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="If an account exists for that address, reset instructions are on the way."
      >
        <div className="flex flex-col items-center text-center">
          <MailCheck className="h-10 w-10 text-primary" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            We've sent password reset instructions to{" "}
            <span className="font-semibold text-foreground">{email}</span> if an account exists for
            it. The link expires shortly, so use it soon.
          </p>
          <Link to="/signin" className={`${submitClass} mt-6`}>
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we'll send instructions to reset your password."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/signin" className="font-semibold text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            className={fieldClass}
            placeholder="you@example.com"
          />
          <FieldError>{error}</FieldError>
        </div>
        <button type="submit" disabled={loading} className={submitClass}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Sending instructions…
            </>
          ) : (
            "Send reset instructions"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
