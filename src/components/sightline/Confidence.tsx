import type { Confidence } from "@/lib/destinations";

// Confidence is displayed as neutral metadata. It never sorts, ranks or warns.
export function ConfidenceTag({ value, label = "confidence" }: { value: Confidence; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {label} {value}
    </span>
  );
}