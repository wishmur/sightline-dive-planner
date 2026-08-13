import { X } from "lucide-react";
import { MONTHS } from "@/lib/destinations";
import { certLabel } from "@/lib/cards";
import { getCollection } from "@/lib/collections";
import {
  CURRENT_OPTIONS,
  ENTRY_OPTIONS,
  FORMAT_OPTIONS,
  TEMP_OPTIONS,
  type Filters,
} from "@/lib/filters";

type Chip = { key: string; label: string; clear: Partial<Filters> };

function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function activeChips(f: Filters): Chip[] {
  const chips: Chip[] = [];

  if (f.collection !== "all") {
    chips.push({
      key: "collection",
      label: getCollection(f.collection)?.title ?? f.collection,
      clear: { collection: "all" },
    });
  }
  if (f.query.trim()) {
    chips.push({ key: "query", label: `“${f.query.trim()}”`, clear: { query: "" } });
  }
  if (f.where !== "all") {
    chips.push({ key: "where", label: f.where.split(":")[1] ?? "Anywhere", clear: { where: "all" } });
  }
  if (f.month !== "any") {
    chips.push({ key: "month", label: MONTHS[Number(f.month)]!, clear: { month: "any" } });
  }
  for (const name of f.species) {
    chips.push({
      key: `species:${name}`,
      label: name,
      clear: { species: f.species.filter((s) => s !== name) },
    });
  }
  if (f.cert !== "any") {
    chips.push({ key: "cert", label: certLabel(f.cert), clear: { cert: "any" } });
  }
  if (f.current !== "any") {
    chips.push({
      key: "current",
      label: `${optionLabel(CURRENT_OPTIONS, f.current)} current`,
      clear: { current: "any" },
    });
  }
  if (f.temp !== "any") {
    chips.push({ key: "temp", label: optionLabel(TEMP_OPTIONS, f.temp), clear: { temp: "any" } });
  }
  if (f.format !== "any") {
    chips.push({
      key: "format",
      label: optionLabel(FORMAT_OPTIONS, f.format),
      clear: { format: "any" },
    });
  }
  if (f.entry !== "any") {
    chips.push({
      key: "entry",
      label: `${optionLabel(ENTRY_OPTIONS, f.entry)} entry`,
      clear: { entry: "any" },
    });
  }
  if (f.operatingOnly) {
    chips.push({ key: "operating", label: "Fully operating", clear: { operatingOnly: false } });
  }
  return chips;
}

export function ActiveFilterChips({
  filters,
  onChange,
  onClearAll,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClearAll: () => void;
}) {
  const chips = activeChips(filters);
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            onClick={() => onChange(c.clear)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/25 transition hover:bg-primary/16"
          >
            {c.label}
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
      <li>
        <button
          onClick={onClearAll}
          className="rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
