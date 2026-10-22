import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatDeadline, type Opportunity } from "@/lib/opportunities";
import { SITE_ORIGIN } from "@/lib/site";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 7.224c.138-.001.327.03.475.155a.5.5 0 0 1 .17.326c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-.556-.372-.235-.58.118-.92.254-.246 1.415-1.223 1.561-1.356.19-.173.064-.266.082-.4.04-.293.62-1.344.6-1.635-.014-.2-.146-.234-.295-.146-.147.088-1.127.683-1.47.904-.428.275-.958.42-1.436.28-.383-.108-1.018-.322-1.468-.502-.7-.28-1.264-.443-1.223-.875.021-.216.53-.566 1.342-1.02.7-.395 3.315-1.635 3.727-1.796.466-.18.98-.268 1.39-.272z" />
    </svg>
  );
}

const shareButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Builds the share copy: intro, title, deadline (when stated) and details link. */
export function buildShareMessage(
  opportunity: Pick<Opportunity, "title" | "deadline" | "verified_status">,
  url: string,
) {
  const intro =
    opportunity.verified_status === "verified"
      ? "Found this reviewed opportunity on ICK Opportunities:"
      : "Found this opportunity on ICK Opportunities:";
  const lines = [intro, "", opportunity.title];
  if (opportunity.deadline) lines.push("", `Deadline: ${formatDeadline(opportunity.deadline)}`);
  lines.push("", "Details:", url);
  return lines.join("\n");
}

function shareUrl(id: string): string {
  return `${SITE_ORIGIN}/opportunities/${encodeURIComponent(id)}`;
}

export function ShareOpportunity({
  opportunity,
}: {
  opportunity: Pick<Opportunity, "id" | "title" | "deadline" | "verified_status">;
}) {
  const [copied, setCopied] = useState(false);
  const url = shareUrl(opportunity.id);
  const message = buildShareMessage(opportunity, url);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;

    const copyLink = async () => {
    setCopied(false);
    let didCopy = false;

    try {
      await navigator.clipboard.writeText(url);
      didCopy = true;
    } catch {
      // Compatibility fallback when the Clipboard API is unavailable
      // or the browser rejects the request.
      const textarea = document.createElement("textarea");
      const previousFocus = document.activeElement;

      textarea.value = url;
      textarea.readOnly = true;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.fontSize = "16px";

      try {
        document.body.appendChild(textarea);
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        didCopy = document.execCommand("copy");
      } catch {
        didCopy = false;
      } finally {
        textarea.remove();

        if (
          previousFocus instanceof HTMLElement &&
          previousFocus.isConnected
        ) {
          previousFocus.focus({ preventScroll: true });
        }
      }
    }

    if (!didCopy) {
      toast.error("Could not copy the link", {
        description:
          "Try again, or use the WhatsApp or Telegram share button.",
      });
      return;
    }

    setCopied(true);
    toast.success("Link copied", {
      description: "Paste it into any chat, group or post.",
    });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-bold text-foreground">
        Share this opportunity
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Know someone who fits? Send it straight to their WhatsApp or Telegram.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={shareButtonClass}
          aria-label="Share on WhatsApp"
        >
          <WhatsAppIcon className="h-5 w-5 text-success" />
          WhatsApp
        </a>
        <a
          href={telegramHref}
          target="_blank"
          rel="noopener noreferrer"
          className={shareButtonClass}
          aria-label="Share on Telegram"
        >
          <TelegramIcon className="h-5 w-5 text-primary" />
          Telegram
        </a>
        <button
          type="button"
          onClick={copyLink}
          className={shareButtonClass}
          aria-label="Copy link"
        >
          {copied ? (
            <Check className="h-5 w-5 text-success" />
          ) : (
            <Link2 className="h-5 w-5 text-muted-foreground" />
          )}
          {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
    </section>
  );
}
