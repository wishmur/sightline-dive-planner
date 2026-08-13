import { Link } from "@tanstack/react-router";
import { ChevronDown, Check, Search, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { logEvent } from "@/lib/analytics";
import { MONTHS, SPECIES_GROUPS, findDestinations, type FinderMatch } from "@/lib/destinations";

export function DestinationFinder() {
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [speciesSlug, setSpeciesSlug] = useState<string | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [results, setResults] = useState<FinderMatch[] | null>(null);

  const species = useMemo(
    () => SPECIES_GROUPS.find((g) => g.slug === speciesSlug) ?? null,
    [speciesSlug],
  );
  const ready = Boolean(speciesSlug) && month !== null;

  function run() {
    if (!speciesSlug || month === null) return;
    logEvent("filter_month", { species: speciesSlug, month: MONTHS[month], from: "hero_finder" });
    setResults(findDestinations(speciesSlug, month));
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="glass flex flex-col gap-px overflow-hidden rounded-2xl sm:flex-row sm:items-stretch">
        {/* species */}
        <Popover open={speciesOpen} onOpenChange={setSpeciesOpen}>
          <PopoverTrigger asChild>
            <button className="flex flex-1 flex-col items-start gap-1 px-6 py-4 text-left transition hover:bg-primary/[0.06]">
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                What do you want to see?
              </span>
              <span className="flex w-full items-center justify-between gap-3 text-sm">
                <span className={species ? "text-foreground" : "text-muted-foreground"}>
                  {species ? species.name : "Any species"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="theme-light w-[min(22rem,90vw)] p-0">
            <Command>
              <CommandInput placeholder="Search species…" />
              <CommandList>
                <CommandEmpty>No species found.</CommandEmpty>
                <CommandGroup>
                  {SPECIES_GROUPS.map((g) => (
                    <CommandItem
                      key={g.slug}
                      value={`${g.name} ${g.scientific}`}
                      onSelect={() => {
                        setSpeciesSlug(g.slug);
                        setSpeciesOpen(false);
                        setResults(null);
                      }}
                    >
                      <Check
                        className={`mr-2 h-3.5 w-3.5 ${g.slug === speciesSlug ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="truncate">{g.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <span aria-hidden className="hidden w-px self-stretch bg-border sm:block" />

        {/* month */}
        <Popover open={monthOpen} onOpenChange={setMonthOpen}>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-start gap-1 px-6 py-4 text-left transition hover:bg-primary/[0.06] sm:w-56">
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                When are you diving?
              </span>
              <span className="flex w-full items-center justify-between gap-3 text-sm">
                <span className={month !== null ? "text-foreground" : "text-muted-foreground"}>
                  {month !== null ? MONTHS[month] : "Any month"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="theme-light w-[min(20rem,90vw)] p-3">
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => {
                    setMonth(i);
                    setMonthOpen(false);
                    setResults(null);
                  }}
                  className={`rounded-lg px-2 py-2 text-xs transition ${
                    month === i
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="p-2 sm:p-2">
          <button
            onClick={run}
            disabled={!ready}
            className="flex h-full w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Search className="h-4 w-4" />
            Find destinations
          </button>
        </div>
      </div>

      {results && (
        <div className="mt-5">
          <p className="text-xs text-muted-foreground">
            {results.length === 0
              ? `No destination has ${species?.name.toLowerCase()} in peak or shoulder season in ${MONTHS[month!]}.`
              : `${results.length} destination${results.length === 1 ? "" : "s"} for ${species?.name.toLowerCase()} in ${MONTHS[month!]}`}
          </p>
          <ul className="mt-3 space-y-2">
            {results.map(({ destination, status }) => (
              <li key={destination.id}>
                <Link
                  to="/destinations/$slug"
                  params={{ slug: destination.id }}
                  onClick={() =>
                    logEvent("view_destination", { destination: destination.id, from: "hero_finder" })
                  }
                  className="glass-subtle group flex items-center gap-4 rounded-2xl px-5 py-4 transition hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {destination.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {destination.region}, {destination.country} · {status} in {MONTHS[month!]}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}