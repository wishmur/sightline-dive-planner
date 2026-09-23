import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  MessageSquareQuote,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SightlineNav } from "@/components/sightline/Nav";
import { SiteFooter } from "@/components/sightline/SiteFooter";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";
import { DESTINATIONS, SPECIES_GROUPS } from "@/lib/destinations";
import { claimsFor } from "@/lib/claims";
import { CONCERNS, getConcern, type ConcernId } from "@/lib/concerns";
import { getPassage } from "@/lib/passages";
import { CONCERN_PHRASES } from "@/lib/retrieve";
import { getReview, type VerificationVerdict } from "@/lib/verification";
import { MEASURED_ON, RESULTS } from "@/lib/about-results";

export const Route = createFileRoute("/about")({
  head: () => {
    const title = "About Sightline — Independent dive destination reference";
    const description =
      "How Sightline judges where a dive trip fits, where it uses AI and where it doesn't, how its claims and logic are checked, and what it can't tell you yet. Independent; no operator pays for inclusion or ranking.";
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
  component: AboutPage,
});

// ---------------------------------------------------------------------------
// Counts read from the data, so they can't go stale.

const CLAIMS = DESTINATIONS.flatMap((d) => claimsFor(d));
const SOURCES = new Set(
  DESTINATIONS.flatMap((d) => [
    ...d.sources,
    ...d.operating_sources,
    ...d.conditions.sources,
    ...d.species.flatMap((s) => s.sources),
    ...d.highlights.flatMap((h) => h.sources),
  ]),
).size;

/** Source checks as first found, before any correction was applied. */
const CHECKS = (() => {
  const reviews = CLAIMS.map((c) => getReview(c.id)).filter((r) => r !== undefined);
  const first = (v: VerificationVerdict) =>
    reviews.filter((r) => (r.correction?.previousVerdict ?? r.verdict) === v).length;
  return {
    checked: reviews.length,
    supported: first("supported"),
    partial: first("partial"),
    contradicted: first("contradicted"),
    notFound: first("not_found"),
    corrected: reviews.filter((r) => r.correction).length,
  };
})();

/** The vocabulary gap, in the record's own words. */
const EXAMPLE = getPassage("tubbataha/format/0#1");

// ---------------------------------------------------------------------------
// House rules for this page: one section header, one card style. Prose keeps a
// reading width; cards and card rows always span the frame.

const CARD = "rounded-2xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border";
const TAG =
  "rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">{title}</h2>
      {children && (
        <div className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * The three stages, as a flow rather than three paragraphs. Each stage shows
 * what it actually holds — a sentence, chips, a ranked list — and the note is
 * the one thing about that stage a reader would otherwise have to be told.
 */
const STEPS = [
  {
    icon: <SlidersHorizontal className="h-5 w-5" />,
    tag: "You",
    title: "Say it how you'd say it",
    note: "Claude reads the sentence where it's switched on, keyword rules where it isn't, and the page says which. Nothing you type is kept.",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    tag: "Rules",
    title: "Rules judge the fit",
    note: "A catch can move a place down, never up. Places that miss by one thing show you the months they'd fit.",
  },
  {
    icon: <MessageSquareQuote className="h-5 w-5" />,
    tag: "The record",
    title: "The record answers",
    note: "Answers are sentences from the research notes, word for word. No model writes them or decides the order.",
  },
];

const c = RESULTS.concerns;
const a = RESULTS.agreement;

const RESULT_CARDS = [
  {
    figure: String(CHECKS.checked),
    title: "Claims checked against sources",
    body: `At first check, ${CHECKS.supported} were confirmed, ${CHECKS.partial} partly, ${CHECKS.contradicted} contradicted and ${CHECKS.notFound} not found in its source. ${CHECKS.corrected} have been corrected, and their pages show what changed.`,
  },
  {
    figure: `${RESULTS.scenarios.passed}/${RESULTS.scenarios.total}`,
    title: "Trips judged correctly",
    body: `Test trips where every fit, near miss and non-fit came out right. The search Sightline replaced got ${RESULTS.scenarios.previousSearch}.`,
  },
  {
    figure: `${RESULTS.catches.found}/${RESULTS.catches.total}`,
    title: "Catches shown",
    body: `Must-read catches that appear for the trip they matter to, in a median of ${RESULTS.catches.medianShown} notes rather than the 15 or so on a page.`,
  },
  {
    figure: `${c.hit}%`,
    title: "Worries answered from the record",
    body: `On ${c.testDestinations} destinations kept out of tuning. When a record is silent, it says so ${c.abstain}% of the time. Embedding search, the usual approach, managed ${c.embeddingHit[0]}–${c.embeddingHit[1]}%.`,
  },
];

// What a diver should know before trusting a page.
const LIMITS = [
  `${CHECKS.checked} of ${CLAIMS.length} claims have been checked against their sources so far. The rest are labelled “Not yet checked”.`,
  `Seasickness is the hardest worry to find evidence for (${c.seasicknessHit}%): boat time is usually implied, not stated. Water temperatures are yearly ranges.`,
  "No prices, hotels, visas or operator ratings. There's no evidence here for them.",
  "One diver researched and wrote all of it. Nobody else has reviewed it yet.",
];

// What someone reading the numbers should know about how they were got.
const TESTING_LIMITS = [
  "One person wrote every test and checked every source, and also wrote the vocabulary the tests score. A dev/test split guards against tuning on the answers; it does not guard against that.",
  `That same person re-labelled 60 relevance judgements blind two days later and agreed with themselves ${a.pairs.observed}% of the time (κ ${a.pairs.kappa}, 95% CI ${a.pairs.ci[0]}–${a.pairs.ci[1]}). That is repeatability, not independence: an unrelated labeller has not done it.`,
  `The language model is measured on ${RESULTS.claude.cases.descriptions} test descriptions and ${RESULTS.claude.cases.questions} test questions, not on real visitors' words. Nothing here is usage data.`,
  `The tuned prompt drops one genuine request it used to catch. It is left unpatched, because fixing an error found on held-out data would spend the held-out set.`,
];

const TABS = [
  {
    value: "how",
    label: "How it works",
    blurb: "What Sightline does with your trip, and where the answers come from.",
  },
  {
    value: "testing",
    label: "How it's tested",
    blurb: "The evaluation behind the product, and what it doesn't cover.",
  },
];

/** Anchors that belong to the testing tab, so an old deep link still lands. */
const TESTING_HASHES = new Set(["testing", "limits-testing", "how-its-tested"]);

/** The chips a described trip turns into, and the tiers it comes back sorted by. */
const FLOW_CHIPS = ["September", "Manta ray", "Advanced", "Seasickness"];
const FLOW_TIERS = [
  { tone: "bg-primary", label: "Good fit" },
  { tone: "bg-accent", label: "Fits, with a catch" },
  { tone: "bg-muted-foreground/40", label: "Misses by one thing" },
];

/**
 * What happens to a diver's sentence, drawn rather than described.
 *
 * Laid out in HTML rather than as one SVG so it reflows: three stages across on
 * a wide screen, stacked on a phone, with the connector turning with it. An SVG
 * wide enough to read on a laptop would scale down to unreadable text at 375px.
 */
function HowItWorksFlow() {
  return (
    <ol className="mt-8 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-0">
      {STEPS.map((step, i) => (
        <Fragment key={step.title}>
          {i > 0 && (
            <li aria-hidden className="flex items-center justify-center lg:px-3">
              <ChevronDown className="h-5 w-5 text-muted-foreground/40 lg:-rotate-90" />
            </li>
          )}
          <li className={`${CARD} flex flex-col`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-primary">{step.icon}</span>
              <span className={TAG}>{step.tag}</span>
            </div>
            <h3 className="mt-4 font-display text-lg text-foreground">{step.title}</h3>

            <div className="mt-4 flex-1">
              {i === 0 && (
                <p className="font-display text-base leading-snug text-foreground/85">
                  “Mantas in September. I'm Advanced, and I get seasick.”
                </p>
              )}
              {i === 1 && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {FLOW_CHIPS.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/20"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {FLOW_TIERS.map((t) => (
                      <li key={t.label} className="flex items-center gap-2 text-[11px]">
                        <span aria-hidden className={`h-1.5 w-6 shrink-0 rounded-full ${t.tone}`} />
                        <span className="text-muted-foreground">{t.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {i === 2 && EXAMPLE && (
                <blockquote className="border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-foreground/85 italic">
                  “{EXAMPLE.text.length > 120 ? `${EXAMPLE.text.slice(0, 117)}…` : EXAMPLE.text}”
                </blockquote>
              )}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{step.note}</p>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/**
 * One measure, three methods, same test set — so one colour and no legend; the
 * caption names what is being counted. Bars are plain divs rather than an SVG
 * so the labels stay real text at any width, and every bar carries its own
 * number, so nothing here is read from colour alone.
 */
function RetrievalChart() {
  const rows = [
    { name: "Curated vocabulary", hit: RESULTS.concerns.hit, ships: true },
    ...RESULTS.concerns.embeddingModels.map((m) => ({
      name: `${m.name} embeddings`,
      hit: m.hit,
      ships: false,
    })),
  ];
  return (
    <figure className={`${CARD} mt-4`}>
      <figcaption className="max-w-2xl">
        <p className="font-display text-lg text-foreground">
          The obvious approach lost, so it isn't in the product.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Share of worries where a relevant sentence was found, across the{" "}
          {RESULTS.concerns.testDestinations} destinations held out of tuning. Embedding search is
          the usual answer to this problem; a hand-written vocabulary of the words dive notes
          actually use beat both models by more than double, so no embedding model ships.
        </p>
      </figcaption>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[11rem_1fr]">
            <div className="flex items-baseline gap-2 text-sm">
              <span className={r.ships ? "font-semibold text-foreground" : "text-muted-foreground"}>
                {r.name}
              </span>
              {r.ships && <span className={TAG}>ships</span>}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${r.name}: ${r.hit} percent`}
              >
                <div
                  className={`h-full rounded-full ${r.ships ? "bg-primary" : "bg-primary/35"}`}
                  style={{ width: `${r.hit}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-display text-base tabular-nums text-foreground">
                {r.hit}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

function AboutPage() {
  const [tab, setTab] = useState("how");
  const [pendingHash, setPendingHash] = useState<string | null>(null);

  // A link to a testing anchor has to open that tab first: until it does, the
  // target sits in an unmounted panel and there is nothing to scroll to.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    if (TESTING_HASHES.has(hash)) setTab("testing");
    setPendingHash(hash);
  }, []);

  // Runs again after the tab switch, so the panel exists by the time we look.
  useEffect(() => {
    if (!pendingHash) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(pendingHash)?.scrollIntoView({ block: "start" });
      setPendingHash(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingHash, tab]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SightlineNav />

      {/* INTRO */}
      <header className="theme-deep pt-36 pb-16 lg:pt-40 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="page-frame"
        >
          <p className="eyebrow text-primary">About Sightline</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl">
            A dive reference that shows its work.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            What you need to plan a dive trip is scattered across operator pages, forums, trip
            reports and research papers, each with its own agenda. Sightline puts the useful parts
            into one comparable reference: what you'll see, when to go, and what the diving demands,
            with every claim tied to its source.
          </p>
          <p className="mt-4 flex max-w-3xl items-start gap-2 text-sm text-foreground/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            Independent and free. No destination, operator or booking platform pays for inclusion or
            ranking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
              `${DESTINATIONS.length} destinations`,
              `${SPECIES_GROUPS.length} species tracked by month`,
              `${SOURCES} cited sources`,
            ].map((label) => (
              <span
                key={label}
                className="rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-inset ring-white/15"
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>
      </header>

      <div className="theme-light">
        <div className="page-frame py-16 lg:py-20">
          <Tabs value={tab} onValueChange={setTab}>
            {/* Reads as a section rule, not a settings control: the stock pill track
                (a grey capsule with equal-width slabs) belongs to a preferences
                panel, not to a page set in display type on a pale ground. */}
            <TabsList className="flex h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="relative rounded-none border-0 bg-transparent px-0 pt-0 pb-3 font-display text-lg text-muted-foreground shadow-none transition after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:opacity-0 after:transition hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:opacity-100 sm:text-xl"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
              {TABS.find((t) => t.value === tab)?.blurb}
            </p>

            <TabsContent
              value="how"
              className="mt-12 space-y-16 focus-visible:outline-none lg:space-y-20"
            >
              {/* HOW IT WORKS */}
              <section id="how-it-works" className="scroll-mt-20">
                <SectionHeader eyebrow="How it works" title="Rules decide, and the record speaks">
                  <p>
                    Sightline is built to catch the expensive mistakes before you book: the right
                    place in the wrong month, a day boat that can't reach the famous site, diving
                    beyond your experience, an encounter that turns out to be baited, snorkel-only,
                    or heard rather than seen.
                  </p>
                </SectionHeader>

                <HowItWorksFlow />

                <figure className={`${CARD} mt-4`}>
                  <figcaption className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Nobody writing up a dive site says “seasick”; they describe the crossing. So for
                    each of {CONCERNS.length} worries, Sightline looks for the words the notes
                    actually use.
                  </figcaption>
                  <dl className="mt-5 space-y-3">
                    {Object.entries(CONCERN_PHRASES).map(([id, phrases]) => (
                      <div
                        key={id}
                        className="grid items-baseline gap-x-4 gap-y-1.5 border-t border-border pt-3 sm:grid-cols-[10rem_1fr]"
                      >
                        <dt className="font-display text-base text-foreground">
                          {getConcern(id as ConcernId)?.label.split(" & ")[0]}
                        </dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {phrases!.map((phrase) => (
                            <span
                              key={phrase}
                              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground"
                            >
                              “{phrase}”
                            </span>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-5 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">You say it your way.</span> The
                    record is searched for its way. A question you type is matched against one
                    destination's sentences the same way, or by Claude where it's switched on.
                  </p>
                </figure>
              </section>

              {/* HOW IT'S CHECKED */}
              <section id="how-its-checked" className="scroll-mt-20">
                <SectionHeader eyebrow="How it's checked" title="Every claim keeps its sources">
                  <p>
                    Every claim keeps the sources it came from, and key claims are checked against
                    the exact passage. A claim that held up says nothing: the section's source links
                    are there if you want to look. A claim the check found only partly supported,
                    corrected, or missing from its source says so on the spot, with the passage and
                    the date. Where sources disagree, both sides stay visible. When a source
                    changes, the checks that rest on it come up for review.
                  </p>
                  <p>
                    The logic is tested too, against cases written before the code.{" "}
                    <button
                      type="button"
                      onClick={() => setTab("testing")}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      See how it's tested
                    </button>{" "}
                    for the numbers and what they don't cover.
                  </p>
                </SectionHeader>
              </section>

              {/* LIMITS */}
              <section id="limits" className="scroll-mt-20">
                <SectionHeader eyebrow="Limits" title="What it can't tell you yet" />
                <ul className={`${CARD} mt-8 grid gap-x-10 gap-y-4 lg:grid-cols-2`}>
                  {LIMITS.map((limit) => (
                    <li key={limit} className="flex items-start gap-3 text-sm leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      />
                      <span className="text-muted-foreground">{limit}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* WHO'S BEHIND IT */}
              <section id="who" className="scroll-mt-20">
                <SectionHeader
                  eyebrow="Who's behind it"
                  title="Built by a diver, for better dive trips"
                />
                <div className={`${CARD} mt-8 lg:p-8`}>
                  <div className="max-w-3xl space-y-3 text-base leading-relaxed text-muted-foreground">
                    <p>
                      I started Sightline because planning my own dive trips meant piecing together
                      operator sites, research papers, forums and word of mouth. I've logged 115+
                      dives across several regions, PADI Advanced with Nitrox, including plenty of
                      deep, drift, wreck and night diving. This is the reference I wanted for
                      myself.
                    </p>
                    <p>
                      Been somewhere listed here, spotted something out of date, or want a
                      destination added? Tell me. New information is checked against reliable
                      sources before anything changes.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {[
                      { label: "Suggest a correction", kind: "edit" as const },
                      { label: "Request a destination", kind: "request" as const },
                      { label: "Suggest a feature", kind: "feature" as const },
                    ].map((a) => (
                      <FeedbackDialog
                        key={a.kind}
                        kind={a.kind}
                        triggerClassName="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/25 transition hover:bg-primary/15"
                        trigger={
                          <>
                            {a.label} <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        }
                      />
                    ))}
                    <Link
                      to="/"
                      className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-primary"
                    >
                      Explore destinations <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent
              value="testing"
              className="mt-12 space-y-16 focus-visible:outline-none lg:space-y-20"
            >
              <section id="testing" className="scroll-mt-20">
                <SectionHeader
                  eyebrow="How it's tested"
                  title="Checked against its sources, and against tests"
                >
                  <p>
                    Every figure below is a result on test cases, written before the code they test
                    and scored on cases the logic was never tuned on. None of it is usage data, and
                    no number here comes from anyone's visit. Measured {MEASURED_ON}.
                  </p>
                </SectionHeader>

                <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {RESULT_CARDS.map((r) => (
                    <li key={r.title} className={CARD}>
                      <p className="font-display text-3xl leading-none tabular-nums text-foreground">
                        {r.figure}
                      </p>
                      <h3 className="mt-4 text-sm font-semibold text-foreground">{r.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {r.body}
                      </p>
                    </li>
                  ))}
                </ul>

                <RetrievalChart />

                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    The language model, on test cases:{" "}
                  </span>
                  reading described trips, it caught {RESULTS.claude.parser.untuned.worries}% of the
                  worries people stated on its first run, against {RESULTS.parser.worries}% for
                  keyword rules. Answering questions, it found a relevant sentence for every test
                  question the record could answer, against {RESULTS.ask.testHit}% for keyword
                  search, and said so when the record was silent. Measured {MEASURED_ON}.
                </p>
              </section>

              <section id="limits-testing" className="scroll-mt-20">
                <SectionHeader eyebrow="Limits" title="What these numbers don't cover" />
                <ul className={`${CARD} mt-8 grid gap-x-10 gap-y-4 lg:grid-cols-2`}>
                  {TESTING_LIMITS.map((limit) => (
                    <li key={limit} className="flex items-start gap-3 text-sm leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                      />
                      <span className="text-muted-foreground">{limit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
