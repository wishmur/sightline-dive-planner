import { Info } from "lucide-react";
import type { Confidence } from "@/lib/destinations";

const COPY: Record<Confidence, string> = {
  high: "High confidence — corroborated by multiple sources.",
  medium: "Medium confidence — supported, but with limited corroboration.",
  low: "Low confidence — thinly sourced. Verify before planning around it.",
};

/**
 * Confidence is metadata, never a ranking signal. Low confidence is always
 * visible; medium and high sit behind a quiet info affordance.
 */
export function ConfidenceTag({
  value,
  label = "confidence",
}: {
  value: Confidence;
  label?: string;
}) {
  if (value === "low") {
    return (
      <span
        title={COPY.low}
        className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent ring-1 ring-inset ring-accent/30"
      >
        <Info className="h-3 w-3" />
        Low {label}
      </span>
    );
  }

  return (
    <span
      title={`${label.charAt(0).toUpperCase() + label.slice(1)}: ${COPY[value]}`}
      className="inline-flex items-center text-muted-foreground/70 transition hover:text-muted-foreground"
      aria-label={`${label} ${value}`}
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}
