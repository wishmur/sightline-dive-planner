import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { MonthStrip, MonthStripLegend } from "@/components/sightline/MonthStrip";
import { ConfidenceTag } from "@/components/sightline/Confidence";
import { Sources } from "@/components/sightline/Sources";
import { logEvent } from "@/lib/analytics";
import { MONTHS, getSpeciesGroup } from "@/lib/destinations";

export const Route = createFileRoute("/species/$slug")({
  head: ({ params }) => {
    const g = getSpeciesGroup(params.slug);
    const title = g ? `${g.name} — where to dive | Sightline` : "Species — Sightline";
    const description = g
      ? `${g.matches.length} dive destinations with month-by-month ${g.name.toLowerCase()} seasonality, operating windows and sources.`
      : "Species seasonality across dive destinations.";
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
  loader: ({ params }) => {
    const group = getSpeciesGroup(params.slug);
    if (!group) throw notFound();
    return group;
  },
  errorComponent: () => <Fallback text="Something went wrong loading this species." />,
  notFoundComponent: () => <Fallback text="We have no records for that species yet." />,
  component: SpeciesPage,
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

function SpeciesPage() {
  const group = Route.useLoaderData();
  const [month, setMonth] = useState<number | null>(null);

  useEffect(() => {
    logEvent("search_species", { species: group.slug, source: "species_page" });
  }, [group.slug]);

  const matches = month === null
    ? group.matches
    : group.matches.filter((m) => m.species.months[month] !== "absent");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SightlineNav />

      <header className="border-b border-white/5 px-6 pt-36 pb-12 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All destinations
          </Link>
          <p className="eyebrow">Species results</p>
          <h1 className="font-display mt-3 text-5xl font-medium tracking-tight lg:text-6xl">
            {group.name}
          </h1>
          <p className="mt-2 italic text-muted-foreground">{group.scientific}</p>
          <p className="mt-6 max-w-2xl text-muted-foreground">
            {group.matches.length} destinations in the reference mention this species. Listed
            alphabetically — confidence is shown as metadata and never used to rank.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setMonth(null);
                logEvent("filter_month", { species: group.slug, month: null });
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
                  logEvent("filter_month", { species: group.slug, month: i + 1 });
                }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                  month === i ? "bg-primary text-primary-foreground" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <MonthStripLegend />

        <div className="mt-8 space-y-4">
          {matches.map(({ destination, species }) => (
            <article key={destination.id} className="glass-subtle rounded-3xl p-6 lg:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/destinations/$slug"
                      params={{ slug: destination.id }}
                      onClick={() => logEvent("view_destination", { destination: destination.id, from: "species_results" })}
                      className="font-display text-2xl font-medium hover:text-primary"
                    >
                      {destination.name}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {destination.region}, {destination.country}
                    </span>
                    <ConfidenceTag value={species.confidence} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{species.note}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="rounded-full bg-white/[0.05] px-3 py-1">{species.reliability}</span>
                    <span className="rounded-full bg-white/[0.05] px-3 py-1">{species.encounter_type}</span>
                  </div>
                  <div className="mt-4">
                    <Sources urls={species.sources} context="species_result" destinationId={destination.id} />
                  </div>
                </div>

                <div>
                  <MonthStrip
                    months={species.months}
                    operating={destination.operating_months}
                    onMonthClick={(i) => {
                      setMonth(i);
                      logEvent("filter_month", { species: group.slug, month: i + 1, destination: destination.id });
                    }}
                  />
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    {destination.operating_note}{" "}
                    <ConfidenceTag value={destination.operating_confidence} label="operating" />
                  </p>
                  <Link
                    to="/destinations/$slug"
                    params={{ slug: destination.id }}
                    onClick={() => logEvent("view_destination", { destination: destination.id, from: "species_results" })}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:gap-3"
                  >
                    Destination detail <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {matches.length === 0 && (
            <p className="glass-subtle rounded-3xl p-10 text-center text-muted-foreground">
              No destinations record this species in {month !== null ? MONTHS[month] : "any month"}.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}