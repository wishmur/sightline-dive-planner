import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Anchor,
  Droplets,
  Eye,
  GraduationCap,
  Home as HomeIcon,
  Ship,
  ThermometerSun,
  Waves,
} from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { MonthStrip, MonthStripLegend } from "@/components/sightline/MonthStrip";
import { ConfidenceTag } from "@/components/sightline/Confidence";
import { Sources } from "@/components/sightline/Sources";
import { SectionNav, type SectionLink } from "@/components/sightline/SectionNav";
import { ReadMore } from "@/components/sightline/ReadMore";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";
import { Operators } from "@/components/sightline/Operators";
import { LocatorMap } from "@/components/sightline/LocatorMap";
import { SiteFooter } from "@/components/sightline/SiteFooter";
import { logEvent } from "@/lib/analytics";
import {
  MONTHS,
  bestMonthsLabel,
  formatFormat,
  getDestination,
  speciesSlug,
  type Destination,
} from "@/lib/destinations";
import { certLabel, destinationTags } from "@/lib/cards";
import { destinationImage, destinationImageAlt, highlightImage } from "@/lib/imagery";

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
      links: d
        ? [
            {
              rel: "canonical",
              href: `https://sightline-dive-planner.lovable.app/destinations/${d.id}`,
            },
          ]
        : [],
      scripts: d
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "TouristDestination",
                name: `${d.name}, ${d.country}`,
                description: d.summary,
                url: `https://sightline-dive-planner.lovable.app/destinations/${d.id}`,
                address: {
                  "@type": "PostalAddress",
                  addressCountry: d.country,
                  addressRegion: d.region,
                },
                touristType: "Scuba divers",
              }),
            },
          ]
        : [],
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
    <div className="theme-light min-h-screen">
      <SightlineNav />
      <div className="mx-auto max-w-3xl px-6 pt-40 text-center">
        <h1 className="font-display text-4xl">Unavailable</h1>
        <p className="mt-3 text-muted-foreground">{text}</p>
        <Link to="/" className="mt-8 inline-block text-primary underline underline-offset-4">
          Back to search
        </Link>
      </div>
    </div>
  );
}

const SECTIONS: SectionLink[] = [
  { id: "overview", label: "Overview" },
  { id: "season", label: "Season" },
  { id: "why", label: "Why dive here" },
  { id: "marine-life", label: "Marine life" },
  { id: "conditions", label: "Conditions" },
  { id: "how-to-dive", label: "How to dive" },
  { id: "operators", label: "Operators" },
  { id: "sources", label: "Sources" },
];

function DestinationPage() {
  const d = Route.useLoaderData() as Destination;
  const [month, setMonth] = useState<number | null>(null);
  const [allHighlights, setAllHighlights] = useState(false);
  const [allSpecies, setAllSpecies] = useState(false);

  useEffect(() => {
    logEvent("view_destination", { destination: d.id });
  }, [d.id]);

  const highlights = [...d.highlights].sort((a, b) => a.rank - b.rank);
  const shownHighlights = allHighlights ? highlights : highlights.slice(0, 3);

  const species =
    month === null ? d.species : d.species.filter((s) => s.months[month] !== "absent");
  const shownSpecies = allSpecies ? species : species.slice(0, 6);

  return (
    <div className="min-h-screen">
      <SightlineNav />

      {/* HERO */}
      <header
        id="overview"
        className="theme-deep relative isolate flex min-h-[32rem] scroll-mt-16 items-end overflow-hidden"
      >
        <img
          src={destinationImage(d)}
          alt={destinationImageAlt(d)}
          width={1024}
          height={768}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,16,32,0.8)_0%,rgba(6,16,32,0.45)_40%,rgba(6,16,32,0.95)_100%)]"
        />
        <div className="mx-auto w-full max-w-6xl px-6 pt-32 pb-10 lg:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All destinations
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow mt-6 text-primary">
              {d.region}, {d.country}
            </p>
            <h1 className="mt-3 font-display text-4xl leading-[1.03] text-foreground sm:text-5xl lg:text-6xl">
              {d.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {d.summary}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {destinationTags(d).map((t) => (
                <li
                  key={t}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-white/15"
                >
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat label="Best season" value={bestMonthsLabel(d.best_months_overall) ?? "Varies"} />
            <HeroStat label="Minimum cert" value={certLabel(d.conditions.min_cert)} />
            <HeroStat
              label="Water"
              value={`${d.conditions.water_temp_c[0]}–${d.conditions.water_temp_c[1]}°C`}
            />
            <HeroStat label="Current" value={d.conditions.current} />
          </div>
        </div>
      </header>

      <SectionNav sections={SECTIONS} />

      <div className="theme-light">
        <div className="mx-auto max-w-6xl space-y-16 px-6 py-16 lg:px-10 lg:py-20">
          {/* SEASON */}
          <Section id="season" eyebrow="Season" title="When this place works">
            <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
            <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border lg:p-8">
              <MonthStrip
                months={d.best_months_overall}
                operating={d.operating_months}
                selectedMonth={month}
                height={36}
              />
              <div className="mt-6 max-w-3xl">
                <ReadMore text={d.operating_note} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ConfidenceTag value={d.operating_confidence} label="operating" />
                <Sources urls={d.operating_sources} context="operating_months" destinationId={d.id} />
              </div>
              <div className="mt-7 border-t border-border pt-6">
                <MonthStripLegend />
              </div>
            </div>
              <aside className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-inset ring-border">
                <LocatorMap lat={d.coordinates.lat} lng={d.coordinates.lng} label={d.name} />
                <p className="eyebrow mt-4">Where this is</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {d.region}, {d.country}
                </p>
              </aside>
            </div>
          </Section>

          {/* WHY DIVE HERE */}
          <Section id="why" eyebrow="Why dive here" title="What this place is known for">
            <ol className="space-y-4">
              {shownHighlights.map((h) => (
                <li
                  key={h.rank}
                  className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-inset ring-border sm:flex-row"
                >
                  <img
                    src={highlightImage(h.type, d)}
                    alt={`${h.type.replace(/_/g, " ")} diving at ${d.name}`}
                    loading="lazy"
                    className="h-40 w-full shrink-0 object-cover sm:h-auto sm:w-[30%] sm:self-stretch"
                  />
                  <div className="flex min-w-0 flex-1 flex-col p-6 lg:p-7">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                      {String(h.rank).padStart(2, "0")}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {h.type.replace(/_/g, " ")}
                    </span>
                    <ConfidenceTag value={h.confidence} />
                  </div>
                  <h3 className="mt-3 font-display text-xl text-foreground sm:text-2xl">{h.label}</h3>
                  <div className="mt-2 max-w-3xl">
                    <ReadMore text={h.note} limit={260} block />
                  </div>
                  {h.seasonality && (
                    <p className="mt-3 text-sm font-medium text-accent">Seasonality — {h.seasonality}</p>
                  )}
                  <div className="mt-5 border-t border-border pt-3">
                    <Sources urls={h.sources} context="highlight" destinationId={d.id} />
                  </div>
                  </div>
                </li>
              ))}
            </ol>
            {highlights.length > 3 && (
              <MoreButton
                open={allHighlights}
                onClick={() => setAllHighlights((v) => !v)}
                label={`${highlights.length - 3} more highlight${highlights.length - 3 === 1 ? "" : "s"}`}
              />
            )}
          </Section>

          {/* MARINE LIFE */}
          <Section
            id="marine-life"
            eyebrow="Marine life"
            title="Twelve-month species timelines"
            aside={
              <div className="flex flex-wrap items-center gap-0.5">
                <button
                  onClick={() => {
                    setMonth(null);
                    logEvent("filter_month", { destination: d.id, month: null });
                  }}
                  className={chip(month === null)}
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
                    className={chip(month === i)}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            }
          >
            <div className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-inset ring-border">
              {shownSpecies.map((s) => (
                <div key={s.name} className="grid gap-6 p-6 lg:grid-cols-[1.05fr_1fr] lg:p-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to="/species/$slug"
                        params={{ slug: speciesSlug(s.name) }}
                        onClick={() =>
                          logEvent("search_species", {
                            species: speciesSlug(s.name),
                            from: "destination",
                          })
                        }
                        className="text-base font-semibold hover:text-primary"
                      >
                        {s.name}
                      </Link>
                      <span className="text-xs italic text-muted-foreground">{s.scientific}</span>
                      <ConfidenceTag value={s.confidence} />
                    </div>
                    <div className="mt-2">
                      <ReadMore text={s.note} limit={200} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="rounded-full bg-secondary px-2.5 py-1">{s.reliability}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-1">{s.encounter_type}</span>
                    </div>
                    <div className="mt-3">
                      <Sources urls={s.sources} context="species" destinationId={d.id} />
                    </div>
                  </div>
                  <MonthStrip
                    months={s.months}
                    operating={d.operating_months}
                    selectedMonth={month}
                    onMonthClick={(i) => {
                      setMonth(i);
                      logEvent("filter_month", {
                        destination: d.id,
                        month: i + 1,
                        species: speciesSlug(s.name),
                      });
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
            {species.length > 6 && (
              <MoreButton
                open={allSpecies}
                onClick={() => setAllSpecies((v) => !v)}
                label={`${species.length - 6} more species`}
              />
            )}
          </Section>

          {/* CONDITIONS */}
          <Section id="conditions" eyebrow="Conditions" title="What the water is like">
            <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={<ThermometerSun className="h-5 w-5" />}
                label="Water temp"
                value={`${d.conditions.water_temp_c[0]}–${d.conditions.water_temp_c[1]}°C`}
                gauge={{
                  min: 15,
                  max: 32,
                  from: d.conditions.water_temp_c[0]!,
                  to: d.conditions.water_temp_c[1]!,
                  scale: "15°C — 32°C",
                }}
              />
              <Stat
                icon={<Eye className="h-5 w-5" />}
                label="Visibility"
                value={`${d.conditions.viz_range_m[0]}–${d.conditions.viz_range_m[1]} m`}
                gauge={{
                  min: 0,
                  max: 40,
                  from: d.conditions.viz_range_m[0]!,
                  to: d.conditions.viz_range_m[1]!,
                  scale: "0 m — 40 m",
                }}
              />
              <Stat
                icon={<Waves className="h-5 w-5" />}
                label="Current"
                value={d.conditions.current}
                steps={{ active: currentStep(d.conditions.current), total: 4, scale: "mild — strong" }}
              />
              <Stat
                icon={<Droplets className="h-5 w-5" />}
                label="Thermoclines"
                value={d.conditions.thermoclines ? "Expected" : "Not typical"}
                steps={{
                  active: d.conditions.thermoclines ? 2 : 1,
                  total: 2,
                  scale: d.conditions.thermoclines ? "likely" : "unlikely",
                }}
              />
            </div>

            <div className="mt-3 rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border lg:p-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm font-semibold">
                      Minimum certification — {certLabel(d.conditions.min_cert)}
                    </p>
                    <ConfidenceTag value={d.conditions.confidence} />
                  </div>
                  <div className="mt-3">
                    <ReadMore text={d.conditions.experience_note} block />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Entries</span> —{" "}
                    {d.conditions.entry.join(", ")}
                  </p>
                </div>
                {d.conditions.required_certs.length > 0 && (
                  <div className="min-w-0 lg:border-l lg:border-border lg:pl-6">
                    <p className="eyebrow">Recommended & required</p>
                    <ul className="mt-3 space-y-2.5">
                      {d.conditions.required_certs.map((c) => (
                        <li key={`${c.cert}-${c.requirement}`} className="text-sm leading-relaxed">
                          <span className="font-semibold">{c.cert}</span>{" "}
                          <span className="text-muted-foreground">
                            — {c.requirement}. {c.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-5 border-t border-border pt-4">
                <Sources urls={d.conditions.sources} context="conditions" destinationId={d.id} />
              </div>
            </div>
          </Section>

          {/* LOGISTICS */}
          <Section id="how-to-dive" eyebrow="Logistics" title="How people dive it">
            <div
              className={`grid gap-y-8 sm:grid-cols-2 sm:gap-x-8 ${
                d.trip_formats.length > 2 ? "lg:grid-cols-3" : ""
              }`}
            >
              {d.trip_formats.map((t, i) => {
                const boat = t.format === "liveaboard" || t.format === "expedition";
                const primary = i === 0;
                return (
                  <div
                    key={t.format}
                    className="flex flex-col border-t border-border pt-5 sm:border-t-0 sm:pt-0 [&:not(:first-child)]:sm:border-l [&:not(:first-child)]:sm:border-border [&:not(:first-child)]:sm:pl-8 first:border-t-0 first:pt-0"
                  >
                    <div
                      className={`flex items-center gap-2 ${boat ? "text-primary" : "text-accent"}`}
                    >
                      {boat ? <Ship className="h-4 w-4 shrink-0" /> : <HomeIcon className="h-4 w-4 shrink-0" />}
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                        {formatFormat(t.format)}
                      </span>
                      {primary && (
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
                          Most common
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-display text-2xl leading-tight text-foreground">
                      {t.typical_duration}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium capitalize text-muted-foreground">
                      <Anchor className="h-3.5 w-3.5 shrink-0" />
                      {t.orientation}
                    </p>
                    <div className="mt-4 h-px w-10 bg-border" />
                    <div className="mt-4">
                      <ReadMore text={t.note} limit={170} block />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* OPERATORS */}
          <Section id="operators" eyebrow="Operators" title="Who to book with">
            <Operators destinationId={d.id} destinationName={d.name} />
          </Section>

          {/* SOURCES */}
          <Section id="sources" eyebrow="Sources & verification" title="Check the evidence.">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <p className="eyebrow">Check the evidence</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {d.sources.length} source{d.sources.length === 1 ? "" : "s"} · Last reviewed{" "}
                  {d.last_verified}
                </p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Every destination is independently researched and major claims link back to their
                  sources.
                </p>
                <div className="mt-4">
                  <Sources
                    urls={d.sources}
                    context="sources_section"
                    destinationId={d.id}
                    variant="list"
                  />
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground/80">
                  {d.coordinates.lat.toFixed(3)}, {d.coordinates.lng.toFixed(3)}
                </p>
              </div>
              <div className="border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                <p className="eyebrow">Know this place?</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Spot something outdated, have local knowledge, or think something is missing?
                </p>
                <div className="mt-4">
                  <FeedbackDialog
                    kind="edit"
                    destinationId={d.id}
                    destinationName={d.name}
                    triggerClassName="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline decoration-dotted underline-offset-4 transition hover:brightness-110"
                    trigger="Suggest an edit →"
                  />
                </div>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Submissions are reviewed and verified before the dataset is updated.
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function chip(on: boolean) {
  return `rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 transition ${
    on
      ? "bg-primary/12 text-primary ring-1 ring-inset ring-primary/30"
      : "text-muted-foreground/80 hover:bg-secondary/70 hover:text-foreground"
  }`;
}

function MoreButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-4 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
    >
      {open ? "Show less" : `Show ${label}`}
    </button>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-inset ring-white/15 backdrop-blur-md">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  aside,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function currentStep(current: string) {
  const c = current.toLowerCase();
  if (c.includes("strong")) return 4;
  if (c.includes("moderate") || c.includes("variable")) return 3;
  if (c.includes("mild") || c.includes("light")) return 2;
  return 1;
}

function Stat({
  icon,
  label,
  value,
  gauge,
  steps,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gauge?: { min: number; max: number; from: number; to: number; scale: string };
  steps?: { active: number; total: number; scale: string };
}) {
  const pct = (n: number) =>
    gauge ? Math.max(0, Math.min(100, ((n - gauge.min) / (gauge.max - gauge.min)) * 100)) : 0;
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-inset ring-border">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="eyebrow text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-base font-semibold capitalize leading-snug sm:text-lg">{value}</p>
      {gauge && (
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
            <span
              className="absolute inset-y-0 rounded-full bg-primary"
              style={{ left: `${pct(gauge.from)}%`, width: `${Math.max(3, pct(gauge.to) - pct(gauge.from))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">{gauge.scale}</p>
        </div>
      )}
      {steps && (
        <div className="mt-3">
          <div className="flex gap-[3px]">
            {Array.from({ length: steps.total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < steps.active ? "bg-primary" : "bg-foreground/[0.07]"
                }`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">{steps.scale}</p>
        </div>
      )}
    </div>
  );
}
