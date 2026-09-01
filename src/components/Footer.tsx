import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

const productLinks = [
  { to: "/opportunities", label: "Opportunities" },
  { to: "/get-started", label: "Build My CV" },
  { to: "/get-started", label: "Get Started" },
  { to: "/signin", label: "Sign In" },
];

const categoryLinks = [
  { to: "/scholarships", label: "Scholarships" },
  { to: "/jobs", label: "Jobs" },
  { to: "/internships", label: "Internships" },
  { to: "/grants", label: "Grants" },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-[13px] font-extrabold text-primary-foreground">
                ICK
              </span>
              <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                ICK Opportunities
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A Nigeria-first platform for discovering verified scholarships,
              jobs, internships and grants — and preparing applications that
              stand out.
            </p>
            <a
              href="mailto:hello@ickopportunities.com"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-secondary/80"
            >
              <Mail className="h-4 w-4" />
              hello@ickopportunities.com
            </a>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Categories
            </h3>
            <ul className="mt-4 space-y-3">
              {categoryLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Company
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>ICK Technologies Ltd</li>
              <li>
                <a href="mailto:hello@ickopportunities.com" className="transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <Link to="/" className="transition-colors hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/" className="transition-colors hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ICK Technologies Ltd. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built for young Nigerians chasing their next big break.
          </p>
        </div>
      </div>
    </footer>
  );
}
