import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Droplets, Eye, Waves, ThermometerSun, Ship, GraduationCap } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { MonthStrip, MonthStripLegend } from "@/components/sightline/MonthStrip";
import { ConfidenceTag } from "@/components/sightline/Confidence";
import { Sources } from "@/components/sightline/Sources";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";
import { logEvent } from "@/lib/analytics";
import {
  MONTHS,
  formatFormat,
  getDestination,
  speciesSlug,
  type Destination,
} from "@/lib/destinations";

export const Route = createFileRoute("/destinations/$slug")({
  head: ({ params }) => {
    const d = getDestination(params.slug);
    const title = d ? `${d.name}, ${d.country} — dive guide | Sightline` : "Destination — Sightline";
    const description = d ? d.summary.slice(0, 155) : "Dive destination reference.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: ({ params }): Destination => {
    const d = getDestination(params.slug);
    if (!d) throw notFound();
    return d;
  },
  errorComponent: () => <Fallback text="Something went wrong loading this destination." />,
  notFoundComponent: () => <Fallback text="That destination isn't in the reference." />,
  component: DestinationPage,
});

function Fallback({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SightlineNav />
      <div className="mx-auto max-w-3xl px-6 pt-40 text-center">
        <h1 className="font-display text-4xl font-medium">Unavailable</h1>
        <p className="mt-3 text-muted-foreground">{text}</p>
        <Link to="/" className="mt-8 inline-block text-primary underline underline-offset-4">
          Back to search
        </Link>
      </div>
    </div>
  );
}

function DestinationPage() {
  const d = Route.useLoaderData() as Destination;
  const [month, setMonth] = useState<number | null>(null);

  useEffect(() => {
    logEvent("view_destination", { destination: d.id });
  }, [d.id]);

  const species = month === null
    ? d.species
    : d.species.filter((s) => s.months[month] !== "absent");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SightlineNav />

      {/* SUMMARY */}
      <header className="relative overflow-hidden border-b border-white/5 px-6 pt-36 pb-14 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[420px] rounded-full bg-primary/15 blur-[120px]"
        />
        <div className="mx-auto max-w-6xl">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All destinations
          </Link>
          <p className="eyebrow">{d.region}, {d.country}</p>
          <h1 className="font-display mt-3 text-5xl font-medium leading-none tracking-tight lg:text-7xl">
            {d.name}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">{d.summary}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span>
              {d.coordinates.lat.toFixed(3)}, {d.coordinates.lng.toFixed(3)}
            </span>
            <span>Last verified {d.last_verified}</span>
            <FeedbackDialog destinationId={d.id} destinationName={d.name} />
          </div>
          <div className="mt-5">
            <Sources urls={d.sources} context="destination_overview" destinationId={d.id} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-20 px-6 py-16 lg:px-10">
        {/* SEASON OVERVIEW */}
        <Section eyebrow="Season" title="Overall season and operating window">
          <div className="glass-subtle rounded-3xl p-6 lg:p-8">
            <MonthStrip months={d.best_months_overall} operating={d.operating_months} height={34} />
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {d.operating_note}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ConfidenceTag value={d.operating_confidence} label="operating" />
              <Sources urls={d.operating_sources} context="operating_months" destinationId={d.id} />
            </div>
            <div className="mt-8 border-t border-white/5 pt-6">
              <MonthStripLegend />
            </div>
          </div>
        </Section>

        {/* HIGHLIGHTS */}
        <Section eyebrow="Ranked highlights" title="What this place is actually known for">
          <ol className="space-y-4">
            {[...d.highlights].sort((a, b) => a.rank - b.rank).map((h) => (
              <li key={h.rank} className="glass-subtle rounded-3xl p-6 lg:p-8">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-3xl text-primary">
                    {String(h.rank).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-2xl font-medium">{h.label}</h3>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {h.type.replace(/_/g, " ")}
                  </span>
                  <ConfidenceTag value={h.confidence} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{h.note}</p>
                {h.seasonality && (
                  <p className="mt-3 text-sm text-accent">Seasonality — {h.seasonality}</p>
                )}
                <div className="mt-4">
                  <Sources urls={h.sources} context="highlight" destinationId={d.id} />
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* SPECIES MONTH STRIPS */}
        <Section
          eyebrow="Species by month"
          title="Twelve-month species strips"
          aside={
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setMonth(null);
                  logEvent("filter_month", { destination: d.id, month: null });
                }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  month === null ? "bg-primary text-primary-foreground" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
                }`}
              >
                Any month
              </button>
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => {
                    setMonth(i);
                    logEvent("filter_month", { destination: d.id, month: i + 1 });
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                    month === i ? "bg-primary text-primary-foreground" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          }
        >
          <div className="glass-subtle divide-y divide-white/5 rounded-3xl">
            {species.map((s) => (
              <div key={s.name} className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1fr] lg:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/species/$slug"
                      params={{ slug: speciesSlug(s.name) }}
                      onClick={() => logEvent("search_species", { species: speciesSlug(s.name), from: "destination" })}
                      className="text-base font-medium hover:text-primary"
                    >
                      {s.name}
                    </Link>
                    <span className="text-xs italic text-muted-foreground">{s.scientific}</span>
                    <ConfidenceTag value={s.confidence} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.note}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="rounded-full bg-white/[0.05] px-3 py-1">{s.reliability}</span>
                    <span className="rounded-full bg-white/[0.05] px-3 py-1">{s.encounter_type}</span>
                  </div>
                  <div className="mt-3">
                    <Sources urls={s.sources} context="species" destinationId={d.id} />
                  </div>
                </div>
                <MonthStrip
                  months={s.months}
                  operating={d.operating_months}
                  onMonthClick={(i) => {
                    setMonth(i);
                    logEvent("filter_month", { destination: d.id, month: i + 1, species: speciesSlug(s.name) });
                  }}
                />
              </div>
            ))}
            {species.length === 0 && (
              <p className="p-10 text-center text-muted-foreground">
                No species recorded for {month !== null ? MONTHS[month] : "this filter"}.
              </p>
            )}
          </div>
        </Section>

        {/* TRIP FORMATS */}
        <Section eyebrow="Logistics" title="Trip formats">
          <div className="grid gap-4 md:grid-cols-2">
            {d.trip_formats.map((t) => (
              <div key={t.format} className="glass-subtle rounded-3xl p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Ship className="h-4 w-4" />
                  <span className="eyebrow !text-[0.65rem]">{formatFormat(t.format)}</span>
                </div>
                <p className="font-display mt-3 text-2xl font-medium">{t.typical_duration}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.orientation}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.note}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* CONDITIONS */}
        <Section eyebrow="Conditions" title="Water, current and certification">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<ThermometerSun className="h-5 w-5" />} label="Water temp" value={`${d.conditions.water_temp_c[0]}–${d.conditions.water_temp_c[1]}°C`} />
            <Stat icon={<Eye className="h-5 w-5" />} label="Visibility" value={`${d.conditions.viz_range_m[0]}–${d.conditions.viz_range_m[1]} m`} />
            <Stat icon={<Waves className="h-5 w-5" />} label="Current" value={d.conditions.current} />
            <Stat icon={<Droplets className="h-5 w-5" />} label="Thermoclines" value={d.conditions.thermoclines ? "Expected" : "Not typical"} />
          </div>

          <div className="glass-subtle mt-4 rounded-3xl p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Minimum certification — {d.conditions.min_cert}</p>
              <ConfidenceTag value={d.conditions.confidence} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {d.conditions.experience_note}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Entries — {d.conditions.entry.join(", ")}
            </p>
            {d.conditions.required_certs.length > 0 && (
              <ul className="mt-6 space-y-3 border-t border-white/5 pt-6">
                {d.conditions.required_certs.map((c) => (
                  <li key={`${c.cert}-${c.requirement}`} className="text-sm">
                    <span className="font-medium">{c.cert}</span>{" "}
                    <span className="text-muted-foreground">— {c.requirement}. {c.note}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <Sources urls={d.conditions.sources} context="conditions" destinationId={d.id} />
            </div>
          </div>
        </Section>

        {/* SOURCES */}
        <Section eyebrow="Sources" title="Everything above is traceable">
          <div className="glass-subtle rounded-3xl p-6 lg:p-8">
            <Sources urls={d.sources} context="sources_section" destinationId={d.id} />
            <div className="mt-8 border-t border-white/5 pt-6">
              <FeedbackDialog destinationId={d.id} destinationName={d.name} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="font-display mt-2 text-3xl font-medium lg:text-4xl">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-subtle rounded-2xl p-5">
      <span className="text-primary">{icon}</span>
      <p className="eyebrow mt-3">{label}</p>
      <p className="mt-2 text-lg font-medium leading-snug">{value}</p>
    </div>
  );
}
