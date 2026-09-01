import { Link } from "@tanstack/react-router";

const footerLinks = [
  { to: "/opportunities", label: "Opportunities" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/jobs", label: "Jobs" },
  { to: "/internships", label: "Internships" },
  { to: "/grants", label: "Grants" },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2 text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                ICK
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Opportunities
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Nigeria-first opportunity discovery. Find scholarships, jobs,
              internships, and grants that match your goals.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ICK Opportunities. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built for young Nigerians chasing their next big break.
          </p>
        </div>
      </div>
    </footer>
  );
}
