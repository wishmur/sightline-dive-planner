import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { SightlineNav } from "@/components/sightline/Nav";
import { DestinationFinder } from "@/components/sightline/DestinationFinder";
import { WorldMap } from "@/components/sightline/WorldMap";
import {
  ClearFiltersButton,
  DestinationFilters,
} from "@/components/sightline/DestinationFilters";
import { logEvent } from "@/lib/analytics";
import {
  DESTINATIONS,
  MONTHS,
  SPECIES_GROUPS,
  bestMonthsLabel,
  yearRoundSpecies,
  formatFormat,
} from "@/lib/destinations";
import { EMPTY_FILTERS, applyFilters, countActive, type Filters } from "@/lib/filters";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Sightline — dive destination and species season reference";
    const description =
      "Search 36 dive destinations by species, month, region, conditions and experience level. Month-by-month seasonality, operating windows and cited sources.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const shown = useMemo(() => applyFilters(filters), [filters]);
  const active = countActive(filters);

  function patch(next: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...next }));
    if (next.month && next.month !== "any") {
      logEvent("filter_month", { month: MONTHS[Number(next.month)], from: "browse" });
    }
  }

  return (
    <div className="theme-light min-h-screen overflow-x-hidden">
      <SightlineNav />

      {/* HERO */}
      <section className="relative px-6 pt-28 pb-14 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl font-medium leading-[1] tracking-tight sm:text-5xl lg:text-[3.75rem]"
          >
            Find your next dive.
          </motion.h1>

          <div className="mt-8">
            <DestinationFinder />
          </div>

          <p className="mt-6 text-xs tracking-wide text-muted-foreground">
            {DESTINATIONS.length} destinations · {SPECIES_GROUPS.length} species · source-backed
          </p>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-medium lg:text-4xl">Explore the world</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {shown.length} of {DESTINATIONS.length} researched dive destinations
            {active > 0 ? " match your filters" : ""}
          </p>
        </div>
        <WorldMap
          bare
          destinations={shown}
          onSelect={(d) => {
            logEvent("click_map_pin", { destination: d.id });
            navigate({ to: "/destinations/$slug", params: { slug: d.id } });
          }}
        />
      </section>

      {/* DESTINATION LIST */}
      <section className="mx-auto max-w-6xl px-6 pb-32 lg:px-10">
        <h2 className="font-display text-3xl font-medium lg:text-4xl">Explore destinations</h2>

        <div className="mt-8">
          <DestinationFilters filters={filters} onChange={patch} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {shown.length} destination{shown.length === 1 ? "" : "s"}
          </p>
          {active > 0 && <ClearFiltersButton onClick={() => setFilters(EMPTY_FILTERS)} />}
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((d) => {
            const chips = [yearRoundSpecies(d), bestMonthsLabel(d.best_months_overall)].filter(
              Boolean,
            ) as string[];
            return (
              <Link
                key={d.id}
                to="/destinations/$slug"
                params={{ slug: d.id }}
                onClick={() => logEvent("view_destination", { destination: d.id, from: "home_list" })}
                className="group block"
              >
                <h3 className="font-display text-2xl font-medium transition group-hover:text-primary">
                  {d.name}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {d.region}, {d.country}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {d.summary}
                </p>
                <p className="mt-4 text-sm text-foreground/80">{chips.join(" · ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Minimum certification: {formatFormat(d.conditions.min_cert)}
                </p>
              </Link>
            );
          })}
        </div>

        {shown.length === 0 && (
          <p className="mt-10 text-sm text-muted-foreground">
            No destinations match those filters.
          </p>
        )}
      </section>
    </div>
  );
}
