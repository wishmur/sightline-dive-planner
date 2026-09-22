import { MONTH_INITIALS, MONTHS, type MonthState, type OperatingState } from "@/lib/destinations";

const FILL: Record<MonthState, string> = {
  peak: "bg-primary",
  shoulder: "bg-primary/50",
  off: "bg-primary/18",
  absent: "bg-foreground/[0.07]",
};

const OP_LABEL: Record<OperatingState, string> = {
  open: "operating",
  limited: "limited operating",
  closed: "closed — inaccessible",
};

export function MonthStrip({
  months,
  operating,
  onMonthClick,
  selectedMonth = null,
  height = 28,
  showLabels = true,
}: {
  months: MonthState[];
  operating: OperatingState[];
  onMonthClick?: (monthIndex: number) => void;
  selectedMonth?: number | null;
  height?: number;
  showLabels?: boolean;
}) {
  return (
    <div className="flex gap-[3px]" role="list">
      {months.map((state, i) => {
        const op = operating[i] ?? "open";
        const closed = op === "closed";
        const label = `${MONTHS[i]}: ${state}, ${OP_LABEL[op]}`;
        const Cell = onMonthClick ? "button" : "div";
        const selected = selectedMonth === i;
        return (
          <Cell
            key={i}
            role="listitem"
            title={label}
            aria-label={label}
            aria-current={selected ? "true" : undefined}
            onClick={onMonthClick ? () => onMonthClick(i) : undefined}
            className="group relative flex-1 text-center"
          >
            <div
              className={`relative w-full overflow-hidden rounded-md transition group-hover:brightness-110 ${FILL[state]} ${
                selected ? "scale-y-110 ring-2 ring-accent ring-offset-1 ring-offset-card" : ""
              }`}
              style={{ height }}
            >
              {op !== "open" && (
                <span
                  aria-hidden
                  className={`hatch-closed absolute inset-0 ${closed ? "bg-muted-foreground/45" : ""}`}
                  style={{ opacity: closed ? 1 : 0.6 }}
                />
              )}
              {closed && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[3px] bg-muted-foreground"
                />
              )}
            </div>
            {showLabels && (
              <span
                className={`mt-1.5 block text-[10px] font-medium ${
                  selected ? "text-accent font-bold" : "text-muted-foreground"
                }`}
              >
                {MONTH_INITIALS[i]}
              </span>
            )}
          </Cell>
        );
      })}
    </div>
  );
}

export function MonthStripLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {(["peak", "shoulder", "off", "absent"] as MonthState[]).map((s) => (
        <span key={s} className="flex items-center gap-2">
          <span className={`h-3 w-6 rounded-sm ${FILL[s]}`} />
          {s}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span className="hatch-closed h-3 w-6 rounded-sm bg-primary" />
        limited operating
      </span>
      <span className="flex items-center gap-2">
        <span className="hatch-closed h-3 w-6 rounded-sm bg-muted-foreground/45" />
        closed — shown, never hidden
      </span>
    </div>
  );
}
