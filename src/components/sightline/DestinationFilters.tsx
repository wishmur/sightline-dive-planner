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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS } from "@/lib/destinations";
import {
  CERT_OPTIONS,
  CONTINENTS,
  CURRENT_OPTIONS,
  ENTRY_OPTIONS,
  FORMAT_OPTIONS,
  SPECIES_NAMES,
  TEMP_OPTIONS,
  countSecondaryActive,
  type Filters,
} from "@/lib/filters";

const trigger =
  "flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition hover:border-primary/40";

export function DestinationFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}) {
  const secondary = countSecondaryActive(filters);

  const whereLabel =
    filters.where === "all" ? "Where" : (filters.where.split(":")[1] ?? "Where");

  const speciesLabel =
    filters.species.length === 0
      ? "Marine life"
      : filters.species.length === 1
        ? filters.species[0]!
        : `${filters.species.length} species`;

  function toggleSpecies(name: string) {
    const next = filters.species.includes(name)
      ? filters.species.filter((s) => s !== name)
      : [...filters.species, name];
    onChange({ species: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* search */}
      <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search destinations"
          aria-label="Search destinations"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* where */}
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label="Where" className={`${trigger} w-[11rem]`}>
            <span className={filters.where === "all" ? "text-muted-foreground" : ""}>
              {whereLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="theme-light w-[min(20rem,90vw)] p-0">
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

      {/* when */}
      <Select value={filters.month} onValueChange={(v) => onChange({ month: v })}>
        <SelectTrigger aria-label="When" className="w-[9.5rem] rounded-xl bg-card">
          <SelectValue placeholder="When" />
        </SelectTrigger>
        <SelectContent className="theme-light max-h-72">
          <SelectItem value="any">Any month</SelectItem>
          {MONTHS.map((m, i) => (
            <SelectItem key={m} value={String(i)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* marine life */}
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label="Marine life" className={`${trigger} w-[12rem]`}>
            <span className={`truncate ${filters.species.length === 0 ? "text-muted-foreground" : ""}`}>
              {speciesLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="theme-light w-[min(22rem,90vw)] p-0">
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

      {/* experience */}
      <Select value={filters.cert} onValueChange={(v) => onChange({ cert: v })}>
        <SelectTrigger aria-label="Experience" className="w-[12rem] rounded-xl bg-card">
          <SelectValue placeholder="Experience" />
        </SelectTrigger>
        <SelectContent className="theme-light">
          <SelectItem value="any">Any level</SelectItem>
          {CERT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* more filters */}
      <Popover>
        <PopoverTrigger asChild>
          <button aria-label="More filters" className={`${trigger} w-[11rem]`}>
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              More filters
            </span>
            {secondary > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[0.65rem] text-primary-foreground">
                {secondary}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="theme-light w-[min(20rem,92vw)] space-y-4 p-4">
          <MoreSelect
            label="Current"
            value={filters.current}
            options={CURRENT_OPTIONS}
            anyLabel="Any current"
            onChange={(v) => onChange({ current: v })}
          />
          <MoreSelect
            label="Water temperature"
            value={filters.temp}
            options={TEMP_OPTIONS}
            anyLabel="Any temperature"
            onChange={(v) => onChange({ temp: v })}
          />
          <MoreSelect
            label="Trip format"
            value={filters.format}
            options={FORMAT_OPTIONS}
            anyLabel="Any format"
            onChange={(v) => onChange({ format: v })}
          />
          <MoreSelect
            label="Entry"
            value={filters.entry}
            options={ENTRY_OPTIONS}
            anyLabel="Any entry"
            onChange={(v) => onChange({ entry: v })}
          />
          <label className="flex items-start gap-3 pt-1 text-sm">
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
  );
}

function MoreSelect({
  label,
  value,
  options,
  anyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  anyLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-full rounded-xl bg-card">
          <SelectValue placeholder={anyLabel} />
        </SelectTrigger>
        <SelectContent className="theme-light">
          <SelectItem value="any">{anyLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-primary transition hover:opacity-80"
    >
      <X className="h-3.5 w-3.5" />
      Clear filters
    </button>
  );
}
