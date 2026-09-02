import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:py-16">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06)] sm:p-7">
        {children}
      </div>
      {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
      {children}
    </p>
  );
}

export const fieldClass =
  "mt-1.5 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/15";

export const labelClass = "text-sm font-semibold text-foreground";

export const submitClass =
  "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
