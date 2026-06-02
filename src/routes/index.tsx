import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ChevronDown, Search, MapPin, Eye, Droplets, ArrowRight, Clock } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { DESTINATIONS, MARINE_LIFE, MONTHS, SIGHTINGS } from "@/lib/sightline-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sightline — Plan dives by what you'll see" },
      { name: "description", content: "Marine life seasonality, real diver sightings, and live conditions — in one place." },
      { property: "og:title", content: "Sightline — Plan dives by what you'll see" },
      { property: "og:description", content: "Plan dive trips around what's actually in the water." },
    ],
  }),
  component: Index,
});

function Index() {
  const [species, setSpecies] = useState(MARINE_LIFE[0]);
  const [month, setMonth] = useState(8); // September
  const [openSpecies, setOpenSpecies] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);

  const results = useMemo(() => DESTINATIONS, [species, month]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <SightlineNav />

      {/* HERO */}
      <section className="relative isolate overflow-hidden pb-24 pt-40 lg:pt-52">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2400&q=80"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            — A trip planner for divers
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.05 }}
            className="font-display mt-6 max-w-4xl text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Plan dives by what you'll see,{" "}
            <span className="italic text-muted-foreground">not just where you'll go.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            Marine life seasonality, real diver sightings, and live conditions —
            in one place.
          </motion.p>

          {/* SEARCH PILL */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="glass mt-12 flex flex-col gap-2 rounded-3xl p-2 sm:flex-row sm:items-center sm:rounded-full"
          >
            {/* Species */}
            <div className="relative flex-1">
              <button
                onClick={() => { setOpenSpecies((o) => !o); setOpenMonth(false); }}
                className="group flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-left transition hover:bg-white/5 sm:rounded-full"
              >
                <div>
                  <p className="eyebrow">What to see</p>
                  <p className="mt-1 flex items-center gap-2 text-base font-medium">
                    <span className="text-xl">{species.icon}</span>
                    {species.name}
                  </p>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
              </button>
              {openSpecies && (
                <div className="glass absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl p-2">
                  {MARINE_LIFE.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSpecies(m); setOpenSpecies(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-white/5"
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-sm font-medium">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden h-12 w-px bg-white/10 sm:block" />

            {/* Month */}
            <div className="relative flex-1">
              <button
                onClick={() => { setOpenMonth((o) => !o); setOpenSpecies(false); }}
                className="group flex w-full items-center gap-4 rounded-2xl px-6 py-4 text-left transition hover:bg-white/5 sm:rounded-full"
              >
                <div>
                  <p className="eyebrow">When</p>
                  <p className="mt-1 text-base font-medium">{MONTHS[month]}</p>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
              </button>
              {openMonth && (
                <div className="glass absolute left-0 right-0 top-full z-30 mt-2 grid grid-cols-3 gap-1 rounded-2xl p-2">
                  {MONTHS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => { setMonth(i); setOpenMonth(false); }}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                        i === month ? "bg-primary text-primary-foreground" : "hover:bg-white/5"
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="group flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:rounded-full">
              <Search className="h-4 w-4" />
              Find dives
            </button>
          </motion.div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow">Results</p>
            <h2 className="font-display mt-2 text-3xl font-medium sm:text-4xl">
              {results.length} destinations match
            </h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {species.name} · {MONTHS[month]}
          </p>
        </div>

        <div className="space-y-6">
          {results.map((d, i) => (
            <motion.div
              key={d.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
            >
              <Link
                to="/destinations/$slug"
                params={{ slug: d.slug }}
                className="group relative block h-[440px] w-full overflow-hidden rounded-3xl ring-1 ring-white/10 transition hover:ring-white/25"
              >
                <img
                  src={d.image}
                  alt={d.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/30 to-transparent" />

                {/* Status badge */}
                <div className="absolute left-6 top-6 z-10">
                  {d.status === "peak" ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent ring-1 ring-accent/30 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Peak Season
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground ring-1 ring-white/15 backdrop-blur">
                      Occasional Sightings
                    </span>
                  )}
                </div>

                {/* Glass content */}
                <div className="absolute inset-x-4 bottom-4 z-10 rounded-2xl glass p-6 md:inset-x-6 md:bottom-6 md:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">{d.country}</p>
                      <h3 className="font-display mt-1 text-4xl font-medium md:text-5xl">{d.name}</h3>
                    </div>
                    <span className="text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                      View details →
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                    <DataPoint icon={<Eye className="h-4 w-4" />} label={`${d.sightings} ${species.name.toLowerCase()} sightings this week`} highlight />
                    <DataPoint icon={<Droplets className="h-4 w-4" />} label={`Visibility: ${d.visibility}`} />
                    <DataPoint icon={<MapPin className="h-4 w-4" />} label={`Water temp: ${d.waterTemp}`} />
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {d.avatars.map((a, idx) => (
                          <img
                            key={idx}
                            src={a}
                            alt=""
                            className="h-7 w-7 rounded-full ring-2 ring-[#0F1F33]"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">Recent divers</span>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-white/10">
                      {d.skill}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SIGHTINGS NEAR YOU */}
      <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow">Live feed</p>
            <h2 className="font-display mt-2 text-2xl font-medium sm:text-3xl">
              Sightings near you this week
            </h2>
          </div>
          <button className="text-sm font-medium text-primary hover:underline">See all</button>
        </div>

        <div className="-mx-6 overflow-x-auto px-6 pb-2 lg:-mx-10 lg:px-10">
          <div className="flex gap-4">
            {SIGHTINGS.map((s, i) => (
              <div
                key={i}
                className="glass-subtle group flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl transition hover:-translate-y-1"
              >
                <div className="h-36 w-full overflow-hidden">
                  <img src={s.photo} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <img src={s.avatar} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/15" />
                    <span className="text-sm font-medium">{s.diver}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{s.saw}</p>
                  <p className="text-xs text-muted-foreground">{s.location}</p>
                  <p className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {s.ago}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground lg:flex-row lg:px-10">
          <span className="font-display text-lg text-foreground">Sightline<span className="text-primary">.</span></span>
          <span>Built for divers chasing the right water at the right time.</span>
        </div>
      </footer>
    </div>
  );
}

function DataPoint({ icon, label, highlight }: { icon: React.ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <span className={highlight ? "font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
