import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { SearchBar } from "@/components/sightline/SearchBar";
import { WorldMap } from "@/components/sightline/WorldMap";
import { MonthStrip, MonthStripLegend } from "@/components/sightline/MonthStrip";
import { logEvent } from "@/lib/analytics";
import { DESTINATIONS, SPECIES_GROUPS } from "@/lib/destinations";

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

const POPULAR = ["Manta ray", "Whale shark", "Hammerhead shark", "Mola mola", "Thresher shark"];

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
      <section className="relative px-6 pt-36 pb-16 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full bg-primary/15 blur-[140px]"
        />
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">A reference, not a booking site</p>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-display mt-4 max-w-4xl text-5xl font-medium leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl"
          >
            I want to see mantas in September.
            <span className="block text-muted-foreground">Where should I go?</span>
          </motion.h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {DESTINATIONS.length} dive destinations, {SPECIES_GROUPS.length} species, twelve months
            each — with operating windows, conditions and the sources behind every claim.
          </p>

          <div className="mt-10">
            <SearchBar />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Popular</span>
            {popular.map((g) => (
              <Link
                key={g!.slug}
                to="/species/$slug"
                params={{ slug: g!.slug }}
                onClick={() => logEvent("search_species", { species: g!.slug, from: "popular" })}
                className="rounded-full bg-white/[0.05] px-4 py-1.5 text-xs text-muted-foreground ring-1 ring-inset ring-white/10 transition hover:text-foreground"
              >
                {g!.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-6xl px-6 pb-16 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The world</p>
            <h2 className="font-display mt-2 text-3xl font-medium lg:text-4xl">
              Every destination on the map
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">Click a pin to open its guide.</p>
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
