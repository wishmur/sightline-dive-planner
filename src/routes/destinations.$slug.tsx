import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Droplets, Eye, Wind, Waves, ThermometerSun, Calendar, Award, DollarSign } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { DESTINATIONS, MONTHS, SIGHTINGS } from "@/lib/sightline-data";

export const Route = createFileRoute("/destinations/$slug")({
  head: ({ params }) => {
    const d = DESTINATIONS.find((x) => x.slug === params.slug);
    const title = d ? `${d.name}, ${d.country} — Sightline` : "Destination — Sightline";
    return {
      meta: [
        { title },
        { name: "description", content: d?.whyParagraph.slice(0, 150) ?? "" },
        { property: "og:title", content: title },
        { property: "og:image", content: d?.image ?? "" },
      ],
    };
  },
  loader: ({ params }) => {
    const d = DESTINATIONS.find((x) => x.slug === params.slug);
    if (!d) throw notFound();
    return d;
  },
  component: DestinationPage,
});

const TABS = ["Overview", "Sightings", "Conditions", "Operators"] as const;

function DestinationPage() {
  const d = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <SightlineNav />

      {/* HERO */}
      <section className="relative h-[78vh] min-h-[560px] w-full overflow-hidden">
        <motion.img
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          src={d.image}
          alt={d.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-10">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to planner
            </Link>
            <p className="eyebrow">{d.country}</p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-display mt-3 text-6xl font-medium leading-none tracking-tight sm:text-7xl lg:text-8xl"
            >
              {d.name}
            </motion.h1>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-6 lg:px-10">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative whitespace-nowrap px-4 py-5 text-sm font-medium transition ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-3 -bottom-px h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        {tab === "Overview" && <OverviewTab d={d} />}
        {tab !== "Overview" && (
          <div className="glass-subtle flex h-72 items-center justify-center rounded-3xl text-muted-foreground">
            {tab} content — coming soon.
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="glass flex flex-col items-start justify-between gap-6 rounded-3xl p-10 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h3 className="font-display mt-2 text-3xl font-medium md:text-4xl">
              Plan a trip to {d.name}
            </h3>
          </div>
          <button className="rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
            Plan a trip to {d.name} →
          </button>
        </div>
      </section>
    </div>
  );
}

function OverviewTab({ d }: { d: (typeof DESTINATIONS)[number] }) {
  return (
    <div className="space-y-16">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Calendar className="h-4 w-4" />} label="Best months">
          <div className="mt-4 flex items-end gap-1">
            {d.bestMonths.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm ${
                    v >= 3 ? "bg-accent" : v >= 2 ? "bg-primary/80" : v >= 1 ? "bg-primary/30" : "bg-white/10"
                  }`}
                  style={{ height: `${10 + v * 14}px` }}
                />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {MONTHS[i][0]}
                </span>
              </div>
            ))}
          </div>
        </StatCard>
        <StatCard icon={<Award className="h-4 w-4" />} label="Skill level required">
          <p className="font-display mt-4 text-3xl font-medium">{d.skill}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Drift &amp; current experience recommended.
          </p>
        </StatCard>
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Avg trip cost">
          <p className="font-display mt-4 text-3xl font-medium">{d.cost}</p>
          <p className="mt-2 text-sm text-muted-foreground">7–10 day liveaboard, all-in.</p>
        </StatCard>
      </div>

      {/* Why */}
      <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="eyebrow">The window</p>
          <h2 className="font-display mt-3 text-4xl font-medium leading-tight">
            Why September?
          </h2>
        </div>
        <p className="text-lg leading-relaxed text-muted-foreground">{d.whyParagraph}</p>
      </div>

      {/* Recent sightings */}
      <div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow">Live from the water</p>
            <h2 className="font-display mt-2 text-3xl font-medium">Recent sightings</h2>
          </div>
        </div>
        <div className="divide-y divide-white/5 overflow-hidden rounded-3xl ring-1 ring-white/10">
          {SIGHTINGS.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-center gap-4 bg-card/40 p-5 transition hover:bg-card/70">
              <img src={s.avatar} alt="" className="h-10 w-10 rounded-full ring-1 ring-white/15" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {s.diver} <span className="text-muted-foreground">saw</span>{" "}
                  <span className="text-primary">{s.saw}</span>
                </p>
                <p className="text-xs text-muted-foreground">{s.location} · {s.ago}</p>
              </div>
              <img src={s.photo} alt="" className="hidden h-14 w-20 rounded-lg object-cover ring-1 ring-white/10 sm:block" />
            </div>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <p className="eyebrow">Right now</p>
        <h2 className="font-display mt-2 text-3xl font-medium">Conditions snapshot</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <ConditionCard icon={<ThermometerSun className="h-5 w-5" />} label="Water temp" value={d.conditions.waterTemp} />
          <ConditionCard icon={<Eye className="h-5 w-5" />} label="Visibility" value={d.conditions.visibility} />
          <ConditionCard icon={<Waves className="h-5 w-5" />} label="Current" value={d.conditions.current} />
          <ConditionCard icon={<Wind className="h-5 w-5" />} label="Surface" value={d.conditions.surface} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="glass-subtle rounded-2xl p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="eyebrow !text-[0.65rem]">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ConditionCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-subtle rounded-2xl p-5">
      <span className="text-primary">{icon}</span>
      <p className="eyebrow mt-3">{label}</p>
      <p className="mt-2 text-lg font-medium leading-snug">{value}</p>
    </div>
  );
}