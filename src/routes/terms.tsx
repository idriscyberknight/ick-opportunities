import { createFileRoute, Link } from "@tanstack/react-router";

const title = "Terms of Service — ICK Opportunities";
const description =
  "Terms and conditions governing the use of the ICK Opportunities discovery platform.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="border-b border-border pb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: October 2026 • ICK Technologies Ltd
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-8 text-[15px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="font-display text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
          <p className="mt-2 text-muted-foreground">
            By accessing or using ICK Opportunities (<strong>ickopportunities.lovable.app</strong>), you agree to be
            bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">2. Nature of the Service</h2>
          <p className="mt-2 text-muted-foreground">
            ICK Opportunities is an educational and professional discovery directory. We review, curate, and link
            to legitimate scholarships, fellowships, jobs, internships, and grants provided by recognized universities,
            foundations, international organizations, and employers worldwide.
          </p>
        </section>

        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold text-primary">3. Strict Anti-Scam Notice — ₦0 Application Fees</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            <strong>ICK Opportunities never charges users any fee to apply for opportunities.</strong> We do not ask
            for processing fees, interview fees, or placement guarantees. Legitimate scholarships and jobs listed on
            our platform process applications directly on their official portals. Anyone claiming to represent ICK
            who asks for money is fraudulent and should be reported immediately.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">4. Accuracy & Independent Verification</h2>
          <p className="mt-2 text-muted-foreground">
            While our team exercises diligence in verifying listings and sourcing official links, opportunities,
            deadlines, eligibility requirements, and funding terms are controlled entirely by the respective
            sponsoring institutions. Users are strongly advised to verify all critical details directly on the
            official provider&apos;s website before submitting applications.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">5. Intellectual Property & Prohibited Use</h2>
          <p className="mt-2 text-muted-foreground">
            You agree not to use automated web scrapers, bots, or unauthorized harvesting scripts against ICK
            Opportunities without prior written permission. All platform design, branding, and proprietary curation
            features belong to ICK Technologies Ltd.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">6. Governing Law</h2>
          <p className="mt-2 text-muted-foreground">
            These terms shall be governed by and construed in accordance with the laws of the Federal Republic of
            Nigeria.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <Link to="/" className="text-sm font-semibold text-primary hover:underline">
          ← Back to Homepage
        </Link>
      </div>
    </main>
  );
}
