import { MONTH_INITIALS, MONTHS, type MonthState, type OperatingState } from "@/lib/destinations";

const BASE: Record<MonthState, string> = {
  peak: "bg-primary",
  shoulder: "bg-primary/45",
  off: "bg-primary/15",
  absent: "bg-white/[0.06]",
};

const OP_LABEL: Record<OperatingState, string> = {
  open: "operating",
  limited: "limited operating",
  closed: "closed — inaccessible",
};

// Diagonal hatch overlays for operating state. Closed also gets a gray mask.
const HATCH =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 1.5px, transparent 1.5px 4px)";

export function MonthStrip({
  months,
  operating,
  onMonthClick,
  height = 26,
}: {
  months: MonthState[];
  operating: OperatingState[];
  onMonthClick?: (monthIndex: number) => void;
  height?: number;
}) {
  return (
    <div className="flex gap-[3px]" role="list">
      {months.map((state, i) => {
        const op = operating[i] ?? "open";
        const inaccessible = op === "closed";
        const label = `${MONTHS[i]}: ${state}, ${OP_LABEL[op]}`;
        const Cell = onMonthClick ? "button" : "div";
        return (
          <Cell
            key={i}
            role="listitem"
            title={label}
            aria-label={label}
            onClick={onMonthClick ? () => onMonthClick(i) : undefined}
            className="group relative flex-1 text-center"
          >
            <div
              className={`relative w-full overflow-hidden rounded-[3px] ring-1 ring-inset ring-white/10 ${BASE[state]}`}
              style={{ height }}
            >
              {op !== "open" && (
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage: HATCH,
                    opacity: inaccessible ? 0.9 : 0.5,
                    backgroundColor: inaccessible ? "rgba(120,130,145,0.55)" : "transparent",
                  }}
                />
              )}
              {inaccessible && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[3px] bg-muted-foreground"
                />
              )}
            </div>
            <span className="mt-1 block text-[9px] uppercase tracking-wider text-muted-foreground">
              {MONTH_INITIALS[i]}
            </span>
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
          <span className={`h-3 w-5 rounded-[3px] ring-1 ring-inset ring-white/10 ${BASE[s]}`} />
          {s}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-5 rounded-[3px] ring-1 ring-inset ring-white/10 bg-primary"
          style={{ backgroundImage: HATCH }}
        />
        limited operating
      </span>
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-5 rounded-[3px] ring-1 ring-inset ring-white/10"
          style={{ backgroundImage: HATCH, backgroundColor: "rgba(120,130,145,0.55)" }}
        />
        closed — shown as inaccessible, never hidden
      </span>
    </div>
  );
}