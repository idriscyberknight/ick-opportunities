import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

/** Every route listed here already exists in the inspected project. */
const primaryLinks = [
  { to: "/opportunities", label: "Explore" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/jobs", label: "Jobs" },
] as const;

const additionalLinks = [
  { to: "/internships", label: "Internships" },
  { to: "/grants", label: "Grants" },
] as const;

const accountLinks = [
  { to: "/recommended", label: "For you", icon: Sparkles },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/tracker", label: "Application tracker", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const desktopLink = cn(
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
  "text-muted-foreground hover:bg-muted hover:text-foreground",
  focusRing,
);

function Brand() {
  return (
    <Link
      to="/"
      aria-label="ICK Opportunities home"
      className={cn("inline-flex min-w-0 items-center gap-3 rounded-lg", focusRing)}
    >
      <img
        src="/ick-logo.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card object-cover"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-display text-[15px] font-extrabold leading-tight tracking-tight text-foreground sm:text-base">
          ICK Opportunities
        </span>
        {/* Avoid claiming a legally registered 'Ltd' status without evidence. */}
        <span className="hidden text-[11px] font-medium leading-relaxed text-muted-foreground sm:block">
          A product of ICK Technologies
        </span>
      </span>
    </Link>
  );
}

export function Header() {
  const { isAuthenticated } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const accountRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // Disclosures should not remain open after a route transition.
    setMobileOpen(false);
    moreRef.current?.removeAttribute("open");
    accountRef.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mobileOpen) {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
      moreRef.current?.removeAttribute("open");
      accountRef.current?.removeAttribute("open");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setMobileOpen(false);
    moreRef.current?.removeAttribute("open");
    accountRef.current?.removeAttribute("open");
    try {
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      await navigate({ to: "/signin", replace: true });
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-2 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-xl",
          scrolled && "shadow-[0_8px_24px_-18px_rgba(15,23,42,0.4)]",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:gap-5 lg:px-8">
          <Brand />

          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {primaryLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={desktopLink}
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <details ref={moreRef} className="group relative">
              <summary
                className={cn(
                  desktopLink,
                  "cursor-pointer list-none gap-1 [&::-webkit-details-marker]:hidden",
                )}
              >
                More
                <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <nav
                aria-label="More opportunities"
                className="absolute left-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xl"
              >
                {additionalLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => moreRef.current?.removeAttribute("open")}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted",
                      focusRing,
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <Link
              to="/opportunities"
              aria-label="Search opportunities"
              title="Search opportunities"
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              <Search aria-hidden="true" className="h-5 w-5" />
            </Link>
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90",
                    focusRing,
                  )}
                >
                  Dashboard
                </Link>
                <details ref={accountRef} className="group relative">
                  <summary
                    className={cn(
                      "flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden",
                      focusRing,
                    )}
                  >
                    Account
                    <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <nav
                    aria-label="Account navigation"
                    className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-card p-2 shadow-xl"
                  >
                    {accountLinks.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => accountRef.current?.removeAttribute("open")}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted",
                          focusRing,
                        )}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </Link>
                    ))}
                    <div className="my-2 h-px bg-border" />
                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={handleSignOut}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60",
                        focusRing,
                      )}
                    >
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  </nav>
                </details>
              </>
            ) : (
              <>
                <Link to="/signin" className={desktopLink}>Sign in</Link>
                <Link
                  to="/get-started"
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90",
                    focusRing,
                  )}
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <Link
              to="/opportunities"
              aria-label="Search opportunities"
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-muted",
                focusRing,
              )}
            >
              <Search aria-hidden="true" className="h-5 w-5" />
            </Link>
            <ThemeToggle />
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="ick-mobile-navigation"
              onClick={() => setMobileOpen((value) => !value)}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted",
                focusRing,
              )}
            >
              {mobileOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            id="ick-mobile-navigation"
            aria-label="Mobile navigation"
            className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-border bg-background p-4 lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <span className="px-3 pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Explore</span>
              {[{ to: "/", label: "Home" }, ...primaryLinks, ...additionalLinks].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-muted",
                    focusRing,
                  )}
                  activeProps={{ className: "bg-muted text-foreground" }}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              {isAuthenticated ? (
                <>
                  <span className="px-3 pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Your workspace</span>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className={cn("flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-muted", focusRing)}
                  >
                    Dashboard
                  </Link>
                  {accountLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={cn("flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-muted", focusRing)}
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    className={cn("min-h-11 rounded-lg px-3 text-left text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60", focusRing)}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </>
              ) : (
                <div className="grid gap-2 pt-1 sm:grid-cols-2">
                  <Link
                    to="/signin"
                    onClick={() => setMobileOpen(false)}
                    className={cn("flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground", focusRing)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/get-started"
                    onClick={() => setMobileOpen(false)}
                    className={cn("flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground", focusRing)}
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
