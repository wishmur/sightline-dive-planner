import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MONTHS } from "@/lib/destinations";
import { certLabel } from "@/lib/cards";
import {
  CERT_OPTIONS,
  CONTINENTS,
  CURRENT_OPTIONS,
  DIVE_TYPE_OPTIONS,
  ENTRY_OPTIONS,
  FORMAT_OPTIONS,
  SPECIES_NAMES,
  TEMP_OPTIONS,
  type Filters,
} from "@/lib/filters";

const SEG =
  "group flex min-w-0 flex-1 items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-primary/[0.06] sm:px-5";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}

function Value({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`block truncate text-sm font-medium ${muted ? "text-muted-foreground" : "text-foreground"}`}
    >
      {children}
    </span>
  );
}

function Divider() {
  return <span aria-hidden className="hidden w-px self-stretch bg-border lg:block" />;
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const whereLabel = filters.where === "all" ? "Anywhere" : (filters.where.split(":")[1] ?? "Anywhere");
  const speciesLabel =
    filters.species.length === 0
      ? "Any marine life"
      : filters.species.length === 1
        ? filters.species[0]!
        : `${filters.species.length} species`;
  const styleBits = [
    filters.format !== "any" ? FORMAT_OPTIONS.find((o) => o.value === filters.format)?.label : null,
    filters.current !== "any" ? `${CURRENT_OPTIONS.find((o) => o.value === filters.current)?.label} current` : null,
    filters.entry !== "any" ? `${ENTRY_OPTIONS.find((o) => o.value === filters.entry)?.label} entry` : null,
  ].filter(Boolean) as string[];
  const advanced =
    (filters.cert !== "any" ? 1 : 0) + (filters.temp !== "any" ? 1 : 0) + (filters.operatingOnly ? 1 : 0);

  function toggleSpecies(name: string) {
    onChange({
      species: filters.species.includes(name)
        ? filters.species.filter((s) => s !== name)
        : [...filters.species, name],
    });
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
      <div className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-inset ring-border lg:flex-row lg:items-stretch">
        {/* Where */}
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="Where" className={`${SEG} lg:w-[12rem]`}>
              <span className="min-w-0">
                <Label>Where</Label>
                <Value muted={filters.where === "all"}>{whereLabel}</Value>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="theme-light w-[min(20rem,92vw)] p-0">
            <Command>
              <CommandInput placeholder="Search continent or country…" />
              <CommandList className="max-h-80">
                <CommandEmpty>No place found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="Anywhere" onSelect={() => onChange({ where: "all" })}>
                    <Check className={`mr-2 h-3.5 w-3.5 ${filters.where === "all" ? "opacity-100" : "opacity-0"}`} />
                    Anywhere
                  </CommandItem>
                </CommandGroup>
                {CONTINENTS.map((c) => (
                  <CommandGroup key={c.name} heading={c.name}>
                    <CommandItem
                      value={`${c.name} all`}
                      onSelect={() => onChange({ where: `continent:${c.name}` })}
                    >
                      <Check
                        className={`mr-2 h-3.5 w-3.5 ${filters.where === `continent:${c.name}` ? "opacity-100" : "opacity-0"}`}
                      />
                      All of {c.name}
                    </CommandItem>
                    {c.countries.map((country) => (
                      <CommandItem
                        key={country}
                        value={country}
                        onSelect={() => onChange({ where: `country:${country}` })}
                      >
                        <Check
                          className={`mr-2 h-3.5 w-3.5 ${filters.where === `country:${country}` ? "opacity-100" : "opacity-0"}`}
                        />
                        {country}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Divider />

        {/* When */}
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="When" className={`${SEG} lg:w-[10rem]`}>
              <span className="min-w-0">
                <Label>When</Label>
                <Value muted={filters.month === "any"}>
                  {filters.month === "any" ? "Any month" : MONTHS[Number(filters.month)]}
                </Value>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="theme-light w-[min(19rem,92vw)] p-3">
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => onChange({ month: String(i) })}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition ${
                    filters.month === String(i)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            {filters.month !== "any" && (
              <button
                onClick={() => onChange({ month: "any" })}
                className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-primary/[0.08] hover:text-foreground"
              >
                Any month
              </button>
            )}
          </PopoverContent>
        </Popover>

        <Divider />

        {/* Marine life */}
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="Marine life" className={`${SEG} lg:w-[13rem]`}>
              <span className="min-w-0">
                <Label>Marine life</Label>
                <Value muted={filters.species.length === 0}>{speciesLabel}</Value>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="theme-light w-[min(22rem,92vw)] p-0">
            <Command>
              <CommandInput placeholder="Search marine life…" />
              <CommandList className="max-h-80">
                <CommandEmpty>No species found.</CommandEmpty>
                <CommandGroup>
                  {SPECIES_NAMES.map((name) => (
                    <CommandItem key={name} value={name} onSelect={() => toggleSpecies(name)}>
                      <Check
                        className={`mr-2 h-3.5 w-3.5 ${filters.species.includes(name) ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="truncate">{name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            {filters.species.length > 0 && (
              <div className="border-t border-border p-2">
                <button
                  onClick={() => onChange({ species: [] })}
                  className="w-full rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-primary/[0.08] hover:text-foreground"
                >
                  Clear marine life
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Divider />

        {/* Dive style */}
        <Popover>
          <PopoverTrigger asChild>
            <button aria-label="Dive style" className={`${SEG} lg:w-[12rem]`}>
              <span className="min-w-0">
                <Label>Dive style</Label>
                <Value muted={styleBits.length === 0}>
                  {styleBits.length === 0 ? "Any style" : styleBits.join(" · ")}
                </Value>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="theme-light w-[min(22rem,92vw)] space-y-4 p-4">
            <ChipGroup
              label="Trip format"
              value={filters.format}
              options={FORMAT_OPTIONS}
              onChange={(v) => onChange({ format: v })}
            />
            <ChipGroup
              label="Current"
              value={filters.current}
              options={CURRENT_OPTIONS}
              onChange={(v) => onChange({ current: v })}
            />
            <ChipGroup
              label="Entry"
              value={filters.entry}
              options={ENTRY_OPTIONS}
              onChange={(v) => onChange({ entry: v })}
            />
          </PopoverContent>
        </Popover>

        <Divider />

        {/* All filters */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="All filters"
              className="flex items-center justify-between gap-2 px-5 py-3 text-sm font-medium transition hover:bg-primary/[0.06]"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                All filters
              </span>
              {advanced > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[0.65rem] font-semibold text-primary-foreground">
                  {advanced}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="theme-light w-[min(24rem,94vw)] space-y-4 p-4">
            <ChipGroup
              label="Certification level"
              value={filters.cert}
              options={CERT_OPTIONS.map((o) => ({ value: o.value, label: certLabel(o.value) }))}
              onChange={(v) => onChange({ cert: v })}
            />
            <ChipGroup
              label="Water temperature"
              value={filters.temp}
              options={TEMP_OPTIONS}
              onChange={(v) => onChange({ temp: v })}
            />
            <ChipGroup
              label="Trip format"
              value={filters.format}
              options={FORMAT_OPTIONS}
              onChange={(v) => onChange({ format: v })}
            />
            <ChipGroup
              label="Current"
              value={filters.current}
              options={CURRENT_OPTIONS}
              onChange={(v) => onChange({ current: v })}
            />
            <ChipGroup
              label="Entry"
              value={filters.entry}
              options={ENTRY_OPTIONS}
              onChange={(v) => onChange({ entry: v })}
            />
            <label className="flex items-start gap-3 border-t border-border pt-4 text-sm">
              <input
                type="checkbox"
                checked={filters.operatingOnly}
                onChange={(e) => onChange({ operatingOnly: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                Fully operating in selected month
                {filters.month === "any" && (
                  <span className="block text-xs text-muted-foreground">Pick a month to apply</span>
                )}
              </span>
            </label>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search */}
      <div className="flex min-w-[13rem] items-center gap-2 rounded-2xl bg-card px-4 shadow-sm ring-1 ring-inset ring-border xl:w-[16rem]">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search destinations"
          aria-label="Search destinations"
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(on ? "any" : o.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                on
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
    >
      <X className="h-3.5 w-3.5" />
      Clear filters
    </button>
  );
}
