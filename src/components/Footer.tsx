import { Link } from "@tanstack/react-router";

const exploreLinks = [
  { to: "/opportunities", label: "All opportunities" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/jobs", label: "Jobs" },
  { to: "/internships", label: "Internships" },
  { to: "/grants", label: "Grants" },
] as const;

const accountLinks = [
  { to: "/get-started", label: "Create an account" },
  { to: "/signin", label: "Sign in" },
  { to: "/saved", label: "Saved opportunities" },
  { to: "/tracker", label: "Application tracker" },
] as const;

const policyLinks = [
  { to: "/privacy", label: "Privacy policy" },
  { to: "/terms", label: "Terms of service" },
] as const;

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-sm">
            <Link
              to="/"
              aria-label="ICK Opportunities home"
              className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src="/ick-logo.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl border border-border object-cover"
              />
              <span className="font-display text-base font-extrabold text-foreground">
                ICK Opportunities
              </span>
            </Link>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Discover scholarships, jobs, internships and grants with clear
              source information. Always confirm details on the provider's official website.
            </p>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              A product of ICK Technologies
            </p>
          </div>

          <nav aria-label="Footer: explore">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Explore</h2>
            <ul className="mt-4 space-y-3">
              {exploreLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer: account">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Your account</h2>
            <ul className="mt-4 space-y-3">
              {accountLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer: company and policies">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Information</h2>
            <ul className="mt-4 space-y-3">
              {policyLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ICK Technologies. All rights reserved.</p>
          <p className="text-sm text-muted-foreground">Nigeria-first. Designed for global opportunities.</p>
        </div>
      </div>
    </footer>
  );
}
