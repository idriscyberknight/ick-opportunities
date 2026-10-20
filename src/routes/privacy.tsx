import { createFileRoute, Link } from "@tanstack/react-router";

const title = "Privacy Policy — ICK Opportunities";
const description =
  "Our commitment to protecting your personal data in compliance with the Nigeria Data Protection Act (NDPA) 2023.";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="border-b border-border pb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: October 2026 • Compliant with Nigeria Data Protection Act (NDPA) 2023
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-8 text-[15px] leading-relaxed text-foreground/90">
        <section>
          <h2 className="font-display text-xl font-bold text-foreground">1. Introduction</h2>
          <p className="mt-2 text-muted-foreground">
            ICK Technologies Ltd (&quot;ICK Opportunities&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates
            the opportunity discovery platform at <strong>ickopportunities.lovable.app</strong>. We respect your
            privacy and are fully committed to protecting your personal data in accordance with the Nigeria Data
            Protection Act (NDPA) 2023 and applicable international data protection standards.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">2. Information We Collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            <li><strong>Account Information:</strong> When you register, we collect your email address and authentication credentials.</li>
            <li><strong>Profile & Preference Data:</strong> Academic background, fields of study, skills, and target countries you voluntarily provide to personalize recommendations.</li>
            <li><strong>Application Tracking:</strong> Opportunities you bookmark or track in your private application dashboard.</li>
            <li><strong>Technical Usage:</strong> Browser type, approximate geographical location (country level), and interaction logs to improve service reliability.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">3. How We Use Your Data</h2>
          <p className="mt-2 text-muted-foreground">
            We use your personal data strictly for legitimate operational purposes:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Matching you with relevant scholarships, jobs, internships, and grants.</li>
            <li>Enabling bookmarking and application deadline tracking.</li>
            <li>Protecting the platform against fraud, abuse, and security threats.</li>
            <li><strong>Zero Data Selling:</strong> We NEVER sell, rent, or trade your personal information to third-party advertisers.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">4. External Links Disclaimer</h2>
          <p className="mt-2 text-muted-foreground">
            ICK Opportunities links directly to official university, government, and corporate application portals.
            Once you click an official link and navigate to an external website, their respective privacy policies
            govern your data. We advise reading the privacy notice of every external website you visit.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">5. Your Data Rights (NDPA 2023)</h2>
          <p className="mt-2 text-muted-foreground">
            Under the NDPA 2023, you have the right to:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Access, correct, or update your personal profile at any time.</li>
            <li>Request the complete deletion of your account and associated tracking records (Right to be Forgotten).</li>
            <li>Withdraw consent for optional communications.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">6. Contact Our Data Protection Team</h2>
          <p className="mt-2 text-muted-foreground">
            If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:
          </p>
          <p className="mt-2 font-medium text-foreground">
            Email: <a href="mailto:support@icktechnologies.com" className="text-primary underline">support@icktechnologies.com</a><br />
            Company: ICK Technologies Ltd, Nigeria.
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
