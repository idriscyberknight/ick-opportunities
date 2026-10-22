import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { to: "/opportunities", label: "Opportunities" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/jobs", label: "Jobs" },
  { to: "/internships", label: "Internships" },
  { to: "/grants", label: "Grants" },
];

function Wordmark() {
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <img
        src="/ick-logo.png"
        alt="ICK Opportunities"
        className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-border/50"
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate font-display text-[15px] font-bold tracking-tight text-foreground">
          ICK Opportunities
        </span>
        <span className="mt-0.5 hidden text-[11px] font-medium text-muted-foreground sm:block">
          by ICK Technologies Ltd
        </span>
      </span>
    </Link>
  );
}


export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    setMobileOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md transition-shadow",
        scrolled ? "border-b border-border shadow-[0_1px_2px_rgba(16,24,40,0.06)]" : "border-b border-transparent"
      )}
    >
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Wordmark />
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeProps={{ className: "text-foreground bg-muted/70" }}
                inactiveProps={{
                  className: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                }}
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link
                to="/recommended"
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                For You
              </Link>
              <Link
                to="/saved"
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Saved
              </Link>
              <Link
                to="/tracker"
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tracker
              </Link>
              <Link
                to="/profile"
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign Out
              </button>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Sign In
              </Link>
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-border bg-background transition-all duration-200 ease-in-out lg:hidden",
          mobileOpen
            ? "max-h-[32rem] border-b opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-0.5 px-4 pb-5 pt-2 sm:px-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              activeProps={{ className: "text-foreground bg-muted/70" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="rounded-lg px-3 py-3 text-[15px] font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-3 h-px bg-border" />
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-primary px-3 py-3 text-center text-[15px] font-semibold text-primary-foreground"
              >
                Dashboard
              </Link>
              <Link
                to="/recommended"
                onClick={() => setMobileOpen(false)}
                className="mt-0.5 rounded-lg border border-border px-3 py-3 text-center text-[15px] font-semibold text-foreground"
              >
                Recommended
              </Link>
              <Link
                to="/saved"
                onClick={() => setMobileOpen(false)}
                className="mt-0.5 rounded-lg border border-border px-3 py-3 text-center text-[15px] font-semibold text-foreground"
              >
                Saved
              </Link>
              <Link
                to="/tracker"
                onClick={() => setMobileOpen(false)}
                className="mt-0.5 rounded-lg border border-border px-3 py-3 text-center text-[15px] font-semibold text-foreground"
              >
                Tracker
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="mt-0.5 rounded-lg border border-border px-3 py-3 text-center text-[15px] font-semibold text-foreground"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-0.5 rounded-lg border border-border px-3 py-3 text-center text-[15px] font-semibold text-foreground"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/get-started"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg bg-primary px-3 py-3 text-center text-[15px] font-semibold text-primary-foreground"
              >
                Get Started
              </Link>
              <Link
                to="/signin"
                onClick={() => setMobileOpen(false)}
                className="mt-0.5 rounded-lg border border-border px-3 py-3 text-center text-[15px] font-semibold text-foreground"
              >
                Sign In
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
