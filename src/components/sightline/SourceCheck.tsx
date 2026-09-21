import { useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  CircleAlert,
  CircleDashed,
  Clock,
  PencilLine,
} from "lucide-react";
import { logEvent } from "@/lib/analytics";
import { REVIEWED_AT, checkFor, formatCheckDate, type CheckStatus } from "@/lib/verification";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const META: Record<
  Exclude<CheckStatus, "unchecked">,
  { icon: typeof BadgeCheck; label: string; tone: string }
> = {
  confirmed: { icon: BadgeCheck, label: "Confirmed by its source", tone: "text-primary" },
  partial: {
    icon: CircleDashed,
    label: "Partly confirmed by its sources",
    tone: "text-muted-foreground",
  },
  corrected: { icon: PencilLine, label: "Corrected after a source check", tone: "text-accent" },
  unconfirmed: { icon: CircleAlert, label: "Not found in its cited source", tone: "text-accent" },
  stale: { icon: Clock, label: "Source changed since it was checked", tone: "text-accent" },
  due: { icon: Clock, label: "Due for a recheck", tone: "text-accent" },
};

/**
 * What a source check found for one claim: status, check date, and on demand
 * the verbatim passage it rests on. Quiet by default; nothing is hidden.
 */
export function SourceCheck({
  claimId,
  destinationId,
  showUnchecked = false,
}: {
  claimId: string;
  destinationId: string;
  showUnchecked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { status, review } = checkFor(claimId);

  if (status === "unchecked" || !review) {
    return showUnchecked ? (
      <p className="text-[11px] text-muted-foreground/70">Not yet checked against its sources</p>
    ) : null;
  }

  const meta = META[status];
  const Icon = meta.icon;
  const date = formatCheckDate(review.correction?.correctedAt ?? REVIEWED_AT);

  return (
    <div>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open)
            logEvent("verification_open", { claim: claimId, status, destination: destinationId });
        }}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition hover:brightness-110 ${meta.tone}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {meta.label}
        <span className="font-normal text-muted-foreground">· checked {date}</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="mt-2 max-w-3xl space-y-2.5 border-l-2 border-primary/25 pl-3">
          {review.correction && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">What changed: </span>
              {review.correction.reason}
            </p>
          )}
          {review.quotes.map((q) => (
            <figure key={q.text}>
              <blockquote className="text-xs italic leading-relaxed text-foreground/80">
                “{q.text}”
              </blockquote>
              <figcaption className="mt-0.5 text-[11px] text-muted-foreground">
                —{" "}
                <a
                  href={q.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    logEvent("click_source", {
                      url: q.url,
                      context: "verification_quote",
                      destination: destinationId,
                    })
                  }
                  className="underline decoration-dotted underline-offset-4 hover:text-primary"
                >
                  {hostOf(q.url)}
                </a>
              </figcaption>
            </figure>
          ))}
          {review.conflict && (
            <figure>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Another cited source disagrees
              </p>
              <blockquote className="mt-1 text-xs italic leading-relaxed text-foreground/80">
                “{review.conflict.text}”
              </blockquote>
              <figcaption className="mt-0.5 text-[11px] text-muted-foreground">
                — {hostOf(review.conflict.url)}
              </figcaption>
            </figure>
          )}
          {review.note && !review.correction && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{review.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
