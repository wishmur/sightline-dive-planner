import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { DestinationFinder } from "@/components/sightline/DestinationFinder";
import { WorldMap } from "@/components/sightline/WorldMap";
import { logEvent } from "@/lib/analytics";
import {
  DESTINATIONS,
  MONTHS,
  SPECIES_GROUPS,
  bestMonthsLabel,
  yearRoundSpecies,
} from "@/lib/destinations";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Sightline — dive destination and species season reference";
    const description =
      "Search 36 dive destinations by species or place. Month-by-month species seasonality, operating windows, conditions, certification and cited sources.";
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

const POPULAR = [
  "Reef manta ray",
  "Giant oceanic manta ray",
  "Whale shark",
  "Scalloped hammerhead",
  "Humpback whale",
];

function Home() {
  const navigate = useNavigate();
  const [region, setRegion] = useState<string | null>(null);

  const regions = useMemo(
    () => [...new Set(DESTINATIONS.map((d) => d.region))].sort(),
    [],
  );
  const shown = region ? DESTINATIONS.filter((d) => d.region === region) : DESTINATIONS;

  const popular = POPULAR.map((name) =>
    SPECIES_GROUPS.find((g) => g.name.toLowerCase() === name.toLowerCase()),
  ).filter(Boolean);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <SightlineNav />

      {/* HERO */}
      <section className="relative px-6 pt-32 pb-14 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[140px]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Independent dive intelligence</p>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-display mt-4 max-w-3xl text-5xl font-medium leading-[0.95] tracking-tight sm:text-6xl lg:text-[4.25rem]"
          >
            Plan the dive,
            <span className="block text-muted-foreground">not just the destination.</span>
          </motion.h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Compare dive destinations by marine life, season, conditions, experience level and trip
            format — with sources behind every claim.
          </p>

          <div className="mt-10">
            <DestinationFinder />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              Popular
            </span>
            {popular.map((g) => (
              <Link
                key={g!.slug}
                to="/species/$slug"
                params={{ slug: g!.slug }}
                onClick={() => logEvent("search_species", { species: g!.slug, from: "popular" })}
                className="text-xs text-muted-foreground underline decoration-white/15 underline-offset-4 transition hover:text-foreground hover:decoration-primary"
              >
                {g!.name}
              </Link>
            ))}
          </div>

          <div className="mt-8 max-w-2xl border-t border-white/[0.07] pt-5">
            <p className="text-xs tracking-wide text-muted-foreground">
              {DESTINATIONS.length} destinations · {SPECIES_GROUPS.length} species · 12 months ·
              source-backed
            </p>
            <div className="mt-4 max-w-xl">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-6xl px-6 pb-16 lg:px-10">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-medium lg:text-4xl">Explore the world</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {DESTINATIONS.length} researched dive destinations
          </p>
        </div>
        <WorldMap
          destinations={DESTINATIONS}
          onSelect={(d) => {
            logEvent("click_map_pin", { destination: d.id });
            navigate({ to: "/destinations/$slug", params: { slug: d.id } });
          }}
        />
      </section>

      {/* DESTINATION LIST */}
      <section className="mx-auto max-w-6xl px-6 pb-28 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Reference</p>
            <h2 className="font-display mt-2 text-3xl font-medium lg:text-4xl">All destinations</h2>
          </div>
          <MonthStripLegend />
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setRegion(null)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              region === null ? "bg-primary text-primary-foreground" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
            }`}
          >
            All regions
          </button>
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                region === r ? "bg-primary text-primary-foreground" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((d) => (
            <Link
              key={d.id}
              to="/destinations/$slug"
              params={{ slug: d.id }}
              onClick={() => logEvent("view_destination", { destination: d.id, from: "home_list" })}
              className="glass-subtle group rounded-3xl p-6 transition hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="eyebrow !text-[0.65rem]">
                  {d.region}, {d.country}
                </span>
              </div>
              <h3 className="font-display mt-2 text-2xl font-medium group-hover:text-primary">
                {d.name}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {d.summary}
              </p>
              <div className="mt-5">
                <MonthStrip months={d.best_months_overall} operating={d.operating_months} height={18} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {d.species.length} species tracked · min cert {d.conditions.min_cert}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
