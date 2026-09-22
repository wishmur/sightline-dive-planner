import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, CircleSlash } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { SiteFooter } from "@/components/sightline/SiteFooter";
import { VerdictIcon } from "@/components/sightline/TripFit";
import { SentenceQuote } from "@/components/sightline/RecordEvidence";
import { logEvent } from "@/lib/analytics";
import {
  DESTINATIONS,
  MONTHS,
  bestMonthsLabel,
  formatFormat,
  getDestination,
  type Destination,
} from "@/lib/destinations";
import { getConcern } from "@/lib/concerns";
import {
  briefSearch,
  filtersFromSearch,
  searchFromFilters,
  targetLabel,
  validateFilterSearch,
  type BriefSearch,
  type Filters,
} from "@/lib/filters";
import {
  FLAG_LABEL,
  evaluate,
  fitSummary,
  hasBrief,
  monthRanges,
  topFlags,
  type Verdict,
} from "@/lib/fit";
import { answerConcern } from "@/lib/retrieve";
import { certLabel } from "@/lib/cards";
import { destinationChecks } from "@/lib/verification";
import { destinationImage, destinationImageAlt } from "@/lib/imagery";

type CompareSearch = BriefSearch & { ids?: string };

export const Route = createFileRoute("/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearch => {
    const { m, sp, cert, cur, cn } = validateFilterSearch(search);
    const ids = typeof search.ids === "string" ? search.ids : undefined;
    return { m, sp, cert, cur, cn, ids };
  },
  head: () => ({
    meta: [
      { title: "Compare destinations for your trip | Sightline" },
      {
        name: "description",
        content:
          "Two or three dive destinations side by side, judged against the same trip: season, access, certification, current and the catches.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComparePage,
});

/** A row of the comparison: one part of the brief, judged for every destination. */
type Row = { key: string; label: string; pick: (verdicts: Verdict[]) => Verdict | undefined };

function rowsFor(f: Filters): Row[] {
  const month = f.month === "any" ? null : Number(f.month);
  const rows: Row[] = [];
  if (month !== null)
    rows.push({
      key: "access",
      label: `Access in ${MONTHS[month]}`,
      pick: (v) => v.find((x) => x.kind === "access"),
    });
  for (const id of f.species)
    rows.push({
      key: `target:${id}`,
      label: targetLabel(id),
      pick: (v) => v.find((x) => x.kind === "target" && x.targetId === id),
    });
  if (month !== null && f.species.length === 0)
    rows.push({ key: "season", label: "Season", pick: (v) => v.find((x) => x.kind === "season") });
  if (f.cert !== "any") {
    rows.push({
      key: "cert",
      label: "Your certification",
      pick: (v) => v.find((x) => x.kind === "cert"),
    });
    rows.push({
      key: "required",
      label: "Extra certification",
      pick: (v) => v.find((x) => x.kind === "required_cert"),
    });
  }
  if (f.current !== "any")
    rows.push({
      key: "current",
      label: "Current",
      pick: (v) => v.find((x) => x.kind === "current"),
    });
  for (const c of f.concerns) {
    if (!["seasickness", "non_diver", "cold"].includes(c)) continue;
    rows.push({
      key: `concern:${c}`,
      label: getConcern(c)!.label,
      pick: (v) => v.find((x) => x.kind === "concern" && x.concern === c),
    });
  }
  return rows;
}

/** On phones a row's label spans the row above its cells; from md up it's the first column. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full border-t border-border pt-4 pb-1.5 pr-4 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:col-span-1 md:py-4">
      {children}
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 pb-4 pr-4 text-sm leading-snug md:border-t md:border-border md:py-4 md:pr-5">
      {children}
    </div>
  );
}

function ComparePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/compare" });
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const brief = briefSearch(filters);
  const destinations = useMemo(
    () =>
      [...new Set((search.ids ?? "").split(","))]
        .map((id) => getDestination(id))
        .filter((d): d is Destination => Boolean(d))
        .slice(0, 3),
    [search.ids],
  );
  const fits = useMemo(
    () => destinations.map((d) => evaluate(d, filters)),
    [destinations, filters],
  );
  // A row nobody has anything for (no extra cert anywhere) is noise.
  const rows = useMemo(
    () =>
      rowsFor(filters).filter((row) =>
        fits.some(
          (fit) =>
            row.pick(fit.verdicts) ||
            (row.key.startsWith("target:") && fit.unlisted.includes(row.key.slice(7))),
        ),
      ),
    [filters, fits],
  );
  const month = filters.month === "any" ? null : Number(filters.month);

  useEffect(() => {
    if (destinations.length)
      logEvent("compare_open", { from: "page", ids: destinations.map((d) => d.id), brief });
    // Once per set of destinations and brief.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.ids, JSON.stringify(brief)]);

  function setMonth(m: number | null) {
    navigate({
      search: (prev) => ({ ...prev, m: m === null ? undefined : m + 1 }),
      replace: true,
      resetScroll: false,
    });
  }

  const n = Math.max(1, destinations.length);
  const gridStyle = {
    "--cols-sm": `repeat(${n}, minmax(${n > 2 ? 8.5 : 9.5}rem, 1fr))`,
    "--cols-md": `11rem repeat(${n}, minmax(13rem, 1fr))`,
  } as React.CSSProperties;
  const title =
    destinations.length === 0
      ? "Nothing to compare yet"
      : destinations.map((d) => d.name).join(" vs ");

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SightlineNav />

      <header className="theme-deep px-6 pt-36 pb-12 lg:px-10 lg:pt-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-7xl"
        >
          <Link
            to="/"
            search={{ ...searchFromFilters(filters), cmp: search.ids }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to results
          </Link>
          <p className="eyebrow mt-6 text-primary">Compare for your trip</p>
          <h1 className="mt-3 font-display text-3xl leading-[1.08] text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {hasBrief(filters)
              ? "Every row is one part of your trip, judged the same way for each destination from its record."
              : "Set a month, what you want to see or your certification to compare how each one fits."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-0.5">
            <button onClick={() => setMonth(null)} className={chip(month === null)}>
              Any month
            </button>
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setMonth(i)} className={chip(month === i)}>
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </motion.div>
      </header>

      <main className="theme-light px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          {destinations.length < 2 ? (
            <div className="rounded-2xl bg-card p-10 text-center ring-1 ring-inset ring-border">
              <p className="text-sm font-medium">Pick two or three destinations to compare.</p>
              <Link
                to="/"
                search={searchFromFilters(filters)}
                className="mt-3 inline-block text-sm font-semibold text-primary underline decoration-dotted underline-offset-4"
              >
                Back to results
              </Link>
            </div>
          ) : (
            <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
              <div
                className="grid grid-cols-[var(--cols-sm)] md:min-w-[40rem] md:grid-cols-[var(--cols-md)]"
                style={gridStyle}
              >
                {/* Heads */}
                <div className="hidden md:block" />
                {fits.map(({ destination: d }) => (
                  <div key={d.id} className="pb-5 pr-5">
                    <Link
                      to="/destinations/$slug"
                      params={{ slug: d.id }}
                      search={brief}
                      className="group block"
                    >
                      <div className="aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-inset ring-border">
                        <img
                          src={destinationImage(d)}
                          alt={destinationImageAlt(d)}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      </div>
                      <p className="mt-3 inline-flex items-center gap-1.5 font-display text-xl text-foreground group-hover:text-primary">
                        {d.name} <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.region}, {d.country}
                      </p>
                    </Link>
                  </div>
                ))}

                {hasBrief(filters) && (
                  <>
                    <Label>Fit</Label>
                    {fits.map((fit) => (
                      <Cell key={fit.destination.id}>
                        <span className="font-display text-base text-foreground">
                          {fitSummary(fit, fit.destination.name)}
                        </span>
                        {fit.tier === "near_miss" && fit.fitsIn.length > 0 && (
                          <span className="mt-1 block text-xs font-medium text-primary">
                            Fits your brief in {monthRanges(fit.fitsIn)}
                          </span>
                        )}
                      </Cell>
                    ))}
                  </>
                )}

                {rows.map((row) => (
                  <Row key={row.key} label={row.label}>
                    {fits.map((fit) => {
                      const v = row.pick(fit.verdicts);
                      const unlisted =
                        row.key.startsWith("target:") && fit.unlisted.includes(row.key.slice(7));
                      return (
                        <Cell key={fit.destination.id}>
                          {v ? (
                            <span className="flex items-start gap-2">
                              <span className="mt-0.5 shrink-0">
                                <VerdictIcon v={v} />
                              </span>
                              <span
                                className={v.status === "violated" ? "text-muted-foreground" : ""}
                              >
                                {v.label}
                              </span>
                            </span>
                          ) : unlisted ? (
                            <span className="flex items-start gap-2 text-muted-foreground">
                              <CircleSlash className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                              No records here
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70">—</span>
                          )}
                        </Cell>
                      );
                    })}
                  </Row>
                ))}

                {hasBrief(filters) && (
                  <Row label="Watch for">
                    {fits.map((fit) => {
                      const flags = topFlags(fit);
                      return (
                        <Cell key={fit.destination.id}>
                          {flags.length === 0 ? (
                            <span className="text-muted-foreground">
                              Nothing flagged for this trip
                            </span>
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {flags.map((f) => (
                                <span
                                  key={f}
                                  className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
                                >
                                  {FLAG_LABEL[f]}
                                </span>
                              ))}
                            </span>
                          )}
                        </Cell>
                      );
                    })}
                  </Row>
                )}

                <Row label="Best season">
                  {fits.map(({ destination: d }) => (
                    <Cell key={d.id}>{bestMonthsLabel(d.best_months_overall) ?? "Varies"}</Cell>
                  ))}
                </Row>
                <Row label="Minimum cert">
                  {fits.map(({ destination: d }) => (
                    <Cell key={d.id}>{certLabel(d.conditions.min_cert)}</Cell>
                  ))}
                </Row>
                <Row label="Current">
                  {fits.map(({ destination: d }) => (
                    <Cell key={d.id}>
                      <span className="capitalize">{d.conditions.current}</span>
                    </Cell>
                  ))}
                </Row>
                <Row label="Water">
                  {fits.map(({ destination: d }) => (
                    <Cell key={d.id}>
                      {d.conditions.water_temp_c[0]}–{d.conditions.water_temp_c[1]}°C across the
                      year
                    </Cell>
                  ))}
                </Row>
                <Row label="How it's dived">
                  {fits.map(({ destination: d }) => (
                    <Cell key={d.id}>
                      {[...new Set(d.trip_formats.map((t) => formatFormat(t.format)))].join(" · ")}
                    </Cell>
                  ))}
                </Row>

                {filters.concerns.map((c) => (
                  <Row key={c} label={`${getConcern(c)!.label}, in the record's words`}>
                    {fits.map(({ destination: d }) => {
                      const [top] = answerConcern(d, c).hits;
                      return (
                        <Cell key={d.id}>
                          {top ? (
                            <SentenceQuote passage={top.passage} destinationId={d.id} />
                          ) : (
                            <span className="text-muted-foreground">The record doesn't say.</span>
                          )}
                        </Cell>
                      );
                    })}
                  </Row>
                ))}

                <Row label="Checked against sources">
                  {fits.map(({ destination: d }) => {
                    const c = destinationChecks(d.id);
                    return (
                      <Cell key={d.id}>
                        <span className="text-muted-foreground">
                          {c.checked === 0
                            ? "Not yet checked"
                            : `${c.checked} key claims: ${c.confirmed} confirmed${c.partial ? `, ${c.partial} partly` : ""}${c.corrected ? `, ${c.corrected} corrected` : ""}`}
                        </span>
                      </Cell>
                    );
                  })}
                </Row>
              </div>
            </div>
          )}
          <p className="mt-8 text-xs text-muted-foreground">
            {DESTINATIONS.length} destinations in the reference. Comparisons use the same records,
            rules and source checks as each destination page.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <Label>{label}</Label>
      {children}
    </>
  );
}

function chip(on: boolean) {
  return `rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 transition ${
    on
      ? "bg-primary/12 text-primary ring-1 ring-inset ring-primary/30"
      : "text-muted-foreground/80 hover:bg-secondary/70 hover:text-foreground"
  }`;
}
