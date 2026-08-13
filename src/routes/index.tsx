import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, MapPin } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { WorldMap } from "@/components/sightline/WorldMap";
import { DestinationCard } from "@/components/sightline/DestinationCard";
import { FilterBar, ClearFiltersButton } from "@/components/sightline/FilterBar";
import { ActiveFilterChips } from "@/components/sightline/ActiveFilterChips";
import { logEvent } from "@/lib/analytics";
import { DESTINATIONS, MONTHS, SPECIES_GROUPS, type Destination } from "@/lib/destinations";
import { EMPTY_FILTERS, applyFilters, countActive, type Filters } from "@/lib/filters";
import { COLLECTIONS, COLLECTION_COUNTS } from "@/lib/collections";
import { HERO_IMAGE } from "@/lib/imagery";

const PAGE_SIZE = 6;

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Sightline — find your next dive by marine life and season";
    const description =
      "Compare 36 researched dive destinations by marine life, month, conditions, experience level and trip format — with sources behind every claim.";
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
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const shown = useMemo(() => applyFilters(filters), [filters]);
  const active = countActive(filters);

  // Any filter change resets the grid back to the first page.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters]);

  function patch(next: Partial<Filters>) {
    setFilters((f) => ({ ...f, ...next }));
    if (next.month && next.month !== "any") {
      logEvent("filter_month", { month: MONTHS[Number(next.month)], from: "explore" });
    }
  }

  function scrollToExplore() {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCollection(id: string) {
    setFilters((f) => ({ ...EMPTY_FILTERS, collection: f.collection === id ? "all" : id }));
    logEvent("search_destination", { collection: id, from: "discovery_tile" });
    scrollToExplore();
  }

  function openDestination(d: Destination) {
    logEvent("click_map_pin", { destination: d.id });
    navigate({ to: "/destinations/$slug", params: { slug: d.id } });
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SightlineNav />

      {/* HERO */}
      <section className="theme-deep relative isolate flex min-h-[38rem] items-end overflow-hidden lg:min-h-[42rem]">
        <img
          src={HERO_IMAGE}
          alt="Diver drifting above a coral reef wall in deep blue water"
          width={1920}
          height={1280}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,16,32,0.62)_0%,rgba(6,16,32,0.22)_38%,rgba(6,16,32,0.78)_100%)]"
        />
        <div className="mx-auto w-full max-w-7xl px-6 pt-36 pb-14 lg:px-10 lg:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <p className="eyebrow text-primary">Independent dive intelligence</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] text-white [text-shadow:0_2px_24px_rgba(6,16,32,0.55)] sm:text-6xl lg:text-7xl">
              Find your next dive.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/85 [text-shadow:0_1px_16px_rgba(6,16,32,0.6)] sm:text-lg">
              Search by what you want to see, when you can travel, and how you like to dive. Every
              claim is traceable to a source.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9"
          >
            <button
              onClick={scrollToExplore}
              className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-110"
            >
              Explore {DESTINATIONS.length} destinations
              <ArrowDown className="h-4 w-4 transition group-hover:translate-y-0.5" />
            </button>
            <p className="mt-5 text-xs tracking-wide text-white/60">
              {DESTINATIONS.length} destinations · {SPECIES_GROUPS.length} species · source-backed
            </p>
          </motion.div>
        </div>
      </section>

      {/* DISCOVERY SHORTCUTS */}
      <section className="theme-deep px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                Start with the kind of diving you want
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Four ways in. Each one filters the full reference.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLLECTIONS.map((c, i) => (
              <motion.button
                key={c.id}
                onClick={() => openCollection(c.id)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                aria-pressed={filters.collection === c.id}
                className={`group relative isolate flex h-64 flex-col justify-end overflow-hidden rounded-3xl p-5 text-left ring-1 ring-inset transition hover:ring-primary/50 ${
                  filters.collection === c.id ? "ring-2 ring-primary" : "ring-border"
                }`}
              >
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,16,32,0.15)_0%,rgba(6,16,32,0.88)_78%)]"
                />
                <span className="font-display text-xl text-foreground">{c.title}</span>
                <span className="mt-1.5 text-xs text-muted-foreground">{c.items.join(" · ")}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  {COLLECTION_COUNTS[c.id]} destinations
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORE */}
      <section id="explore" className="theme-light scroll-mt-20 px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                Explore destinations
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {shown.length} of {DESTINATIONS.length} destinations match
                {active > 0 ? " your filters" : ""}.
              </p>
            </div>
            {active > 0 && <ClearFiltersButton onClick={() => setFilters(EMPTY_FILTERS)} />}
          </div>

          <div className="mt-7">
            <FilterBar filters={filters} onChange={patch} />
          </div>

          {active > 0 && (
            <div className="mt-4">
              <ActiveFilterChips
                filters={filters}
                onChange={patch}
                onClearAll={() => setFilters(EMPTY_FILTERS)}
              />
            </div>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {shown.length === 0 ? (
                <div className="rounded-2xl bg-card p-10 text-center ring-1 ring-inset ring-border">
                  <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No destination matches every filter.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try widening the month or marine life selection.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {shown.map((d) => (
                    <li key={d.id}>
                      <DestinationCard
                        destination={d}
                        onHover={setHovered}
                        highlighted={hoveredPin === d.id}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-24">
                <WorldMap
                  destinations={shown}
                  activeId={hovered}
                  onHoverPin={setHoveredPin}
                  onSelect={openDestination}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Scroll to zoom, drag to pan. Pins reflect the active filters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="theme-light border-t border-border px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Sightline · {DESTINATIONS.length} researched destinations · every claim carries a source
            and a confidence value
          </p>
          <p>Reference only. Verify operating windows with your operator.</p>
        </div>
      </footer>
    </div>
  );
}
