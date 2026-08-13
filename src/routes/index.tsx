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

function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [month, setMonth] = useState<string>("any");

  const regions = useMemo(
    () => [...new Set(DESTINATIONS.map((d) => d.region))].sort(),
    [],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const m = month === "any" ? null : Number(month);
    return DESTINATIONS.filter((d) => {
      if (region !== "all" && d.region !== region) return false;
      if (
        q &&
        !`${d.name} ${d.region} ${d.country}`.toLowerCase().includes(q)
      )
        return false;
      if (m !== null) {
        if (d.operating_months[m] === "closed") return false;
        const s = d.best_months_overall[m];
        if (s !== "peak" && s !== "shoulder") return false;
      }
      return true;
    });
  }, [query, region, month]);

  return (
    <div className="theme-light min-h-screen overflow-x-hidden">
      <SightlineNav />

      {/* HERO */}
      <section className="relative px-6 pt-36 pb-20 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-display max-w-3xl text-5xl font-medium leading-[0.95] tracking-tight sm:text-6xl lg:text-[4.5rem]"
          >
            Plan the dive,
            <span className="block text-muted-foreground">not just the destination.</span>
          </motion.h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Find where to dive based on what you want to see and when you're going.
          </p>

          <div className="mt-12">
            <DestinationFinder />
          </div>

          <p className="mt-8 text-xs tracking-wide text-muted-foreground">
            {DESTINATIONS.length} destinations · {SPECIES_GROUPS.length} species · source-backed
          </p>
        </div>
      </section>

      {/* MAP */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-medium lg:text-4xl">Explore the world</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {DESTINATIONS.length} researched dive destinations
          </p>
        </div>
        <WorldMap
          bare
          destinations={DESTINATIONS}
          onSelect={(d) => {
            logEvent("click_map_pin", { destination: d.id });
            navigate({ to: "/destinations/$slug", params: { slug: d.id } });
          }}
        />
      </section>

      {/* DESTINATION LIST */}
      <section className="mx-auto max-w-6xl px-6 pb-32 lg:px-10">
        <h2 className="font-display text-3xl font-medium lg:text-4xl">Explore destinations</h2>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations"
              aria-label="Search destinations"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger aria-label="Region" className="w-[13rem] rounded-xl bg-card">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent className="theme-light max-h-72">
              <SelectItem value="all">All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={month}
            onValueChange={(v) => {
              setMonth(v);
              if (v !== "any") logEvent("filter_month", { month: MONTHS[Number(v)], from: "browse" });
            }}
          >
            <SelectTrigger aria-label="Month" className="w-[11rem] rounded-xl bg-card">
              <SelectValue placeholder="Month" />
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
                  Minimum certification: {d.conditions.min_cert}
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
