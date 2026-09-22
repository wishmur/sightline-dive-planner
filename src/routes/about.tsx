import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  CircleSlash,
  Layers,
  ListChecks,
  MessageSquareQuote,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { SiteFooter } from "@/components/sightline/SiteFooter";
import { FeedbackDialog } from "@/components/sightline/FeedbackDialog";
import { DESTINATIONS, SPECIES_GROUPS } from "@/lib/destinations";
import { claimsFor } from "@/lib/claims";
import { CONCERNS } from "@/lib/concerns";
import { allPassages, getPassage } from "@/lib/passages";
import { getReview, type VerificationVerdict } from "@/lib/verification";
import { MEASURED_ON, RESULTS } from "@/lib/about-results";

export const Route = createFileRoute("/about")({
  head: () => {
    const title = "About Sightline — Independent dive destination reference";
    const description =
      "How Sightline works: what's decided by rules and where AI helps, how answers are found, how it's tested and where it falls short. Independent and non-commercial; no operator pays for inclusion or ranking.";
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
const SENTENCES = allPassages().length;
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

const HOW_IT_WORKS = [
  {
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: "Your trip becomes a brief",
    body: "Month, the animals you want, your certification, how much current you'll take, and what's on your mind. Set them as filters or describe the trip in a sentence; either way you end up with the same editable filters. Asks the reference can't answer, like cost or visas, are named as such.",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Rules judge the fit",
    body: "Every destination is checked against each part of the brief: is the animal there that month, is the place open, is it within your level. Good fits come first. Caveats such as thin evidence, snorkel-only encounters or rough water in your month can move a destination down, never up. Places that miss by one thing show when they would fit.",
  },
  {
    icon: <MessageSquareQuote className="h-5 w-5" />,
    title: "Answers are quotes",
    body: "Worries and questions are answered with sentences from the destination's record, word for word, each with its source check. Nothing you read is paraphrased or generated.",
  },
  {
    icon: <CircleSlash className="h-5 w-5" />,
    title: "Silence is an answer",
    body: "When a record doesn't cover something, Sightline says so rather than showing something that merely sounds related.",
  },
];

const DIVISION = [
  {
    icon: <ListChecks className="h-5 w-5" />,
    title: "Decided by rules",
    items: [
      "Whether an animal is there in your month",
      "Access, closures and seasons",
      "Certification and current limits",
      "Ranking and every caveat",
      "Which notes to read for your trip",
      "Which sentences answer a worry",
    ],
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Where AI helps",
    items: [
      "Reading a trip you describe in your own words",
      "Choosing which sentences of one record answer a question you type",
    ],
  },
  {
    icon: <Ban className="h-5 w-5" />,
    title: "Never done by a model",
    items: [
      "Writing a fact you read",
      "Ranking destinations",
      "Changing the data: a person approves every correction",
    ],
  },
];

const STEPS = [
  { label: "Research", note: "Operator pages, dive guides, marine research and regional reports." },
  { label: "Cross-check", note: "Claims are compared across independent sources before use." },
  { label: "Structure", note: "Findings are encoded into a consistent, comparable schema." },
  { label: "Source", note: "Every claim keeps the links it came from." },
  {
    label: "Verify",
    note: "Key claims are checked against the exact passage in their source. The quote and check date sit next to the claim; claims the sources contradict are corrected and marked as corrected.",
  },
  { label: "Update", note: "Diver corrections and new evidence are reviewed, then merged." },
];

const PRINCIPLES = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "Researched independently",
    body: "Destinations are added because they are worth comparing, not because anyone asked for them to be listed.",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Conflicts stay visible",
    body: "Where sources disagree, the record is encoded conservatively rather than silently resolved in favour of one claim.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Confidence, not certainty",
    body: "Confidence levels sit next to claims where the evidence is thin, seasonal or regionally variable.",
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: "Rechecked when sources change",
    body: "Every cited page is fingerprinted when it's checked. Re-fetching shows which sources have changed, and the checks that rest on them are marked for recheck; access and certification rules come due after a year regardless.",
  },
];

const c = RESULTS.concerns;

const TESTED: { figure: string; title: string; body: string; pending?: boolean }[] = [
  {
    figure: `${RESULTS.scenarios.passed}/${RESULTS.scenarios.total}`,
    title: "Finding where a trip fits",
    body: `Test trips answered fully correctly: which destinations fit, which don't, and which miss by one thing. The trips were written before the rules that answer them, apart from two added later with a dated reason. The search Sightline used before got ${RESULTS.scenarios.previousSearch}.`,
  },
  {
    figure: `${RESULTS.catches.found}/${RESULTS.catches.total}`,
    title: "Showing the catch",
    body: `Must-read catches (a closed season, a format that can't reach the site, a snorkel-only encounter) that appear on the destination page for the trip they matter to, in a median of ${RESULTS.catches.medianShown} notes rather than the page's 15 or so.`,
  },
  {
    figure: `${c.hit}%`,
    title: "Finding what the record says about a worry",
    body: `Worries a record covers where a relevant sentence is shown, on ${c.testDestinations} destinations kept out of all tuning. The top sentence is on point ${c.topSentence}% of the time, and when a record says nothing about a worry it says so ${c.abstain}% of the time. Embedding search, the usual way to match meaning, found the evidence ${c.embeddingHit[0]}–${c.embeddingHit[1]}% of the time on the same test.`,
  },
  {
    figure: String(CHECKS.checked),
    title: "Checking claims against their sources",
    body: `Key claims checked against the exact passage in their cited sources. At first check ${CHECKS.supported} were confirmed, ${CHECKS.partial} partly confirmed, ${CHECKS.contradicted} contradicted and ${CHECKS.notFound} not found. Corrections followed for ${CHECKS.corrected} claims, each showing on its page what changed and why.`,
  },
  {
    figure: `${RESULTS.parser.worries}%`,
    title: "Reading a described trip with keyword rules",
    body: `Worries caught in ${RESULTS.parser.cases} descriptions written after the rules were finished. The rules got ${RESULTS.parser.otherFields}% of everything else right (month, animals, certification, place) but miss worries put indirectly, like “I've never dived dry”. That gap is why Claude does this reading when it's available.`,
  },
  {
    figure: "Not yet",
    title: "Claude reading trips and answering questions",
    body: "Tests for both are written and ready but haven't been run. Until they are, no result on this page comes from Claude.",
    pending: true,
  },
];

const LIMITS = [
  "One person wrote every test case and checked every source. No other divers have reviewed the results yet.",
  `${CHECKS.checked} of ${CLAIMS.length} claims have been checked against their sources so far; the rest say “Not yet checked”.`,
  "The Claude-assisted features haven't been measured (see above). Every reading and answer says on screen whether Claude or keyword rules produced it.",
  `Without Claude, typed questions fall back to keyword search, which found a relevant sentence for ${RESULTS.ask.specificHit}% of specific test questions.`,
  `Seasickness is the hardest worry to find evidence for (${c.seasicknessHit}%): boat time is usually implied by how a place is dived rather than stated.`,
  "Water temperatures are yearly ranges. Cold-water and rough-water warnings appear only when a note ties them to your month.",
  "No prices, hotels, visas or operator ratings. There's no evidence here for them, so they play no part in any result.",
];

function AboutPage() {
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
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sightline
          </Link>
          <p className="eyebrow mt-6 text-primary">Sightline · The world, from below.</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl">
            Built by a diver, for better dive trips.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Sightline started because planning my own dive travel meant piecing together operator
            sites, research papers, forums, trip reports, and word of mouth. I wanted one place that
            made the useful parts comparable: what you can actually see, when to go, what conditions
            to expect, and whether the diving fits your experience.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
              `${DESTINATIONS.length} destinations`,
              `${SPECIES_GROUPS.length} species tracked by month`,
              `${SOURCES} cited sources`,
              `${CHECKS.checked} key claims checked against them`,
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
        <div className="page-frame space-y-16 py-16 lg:py-20">
          {/* WHY */}
          <section>
            <p className="eyebrow">Why it exists</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              Dive information is scattered
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              What you need to plan a dive trip is spread across operator pages, travel listicles,
              forum threads and research papers — each with its own agenda, vintage and level of
              rigour. Sightline attempts to structure that information into one source-backed
              reference, so the comparison is between destinations rather than between marketing
              pages.
            </p>

            <div className="mt-8 max-w-3xl rounded-3xl bg-primary/[0.07] p-6 ring-1 ring-inset ring-primary/25 lg:p-8">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display text-xl leading-snug text-foreground">
                Sightline is independent, non-commercial, and free to use. No destination, dive
                operator, or booking platform pays for inclusion or ranking.
              </p>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" className="scroll-mt-20">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              From your trip to the catch
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              The expensive mistakes in dive travel are predictable: the right place in the wrong
              month, a day boat that can't reach the famous site, diving beyond your experience, an
              encounter that turns out to be baited or snorkel-only. Sightline is built to surface
              those before you book.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {HOW_IT_WORKS.map((p) => (
                <div
                  key={p.title}
                  className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-inset ring-border"
                >
                  <span className="mt-0.5 shrink-0 text-primary">{p.icon}</span>
                  <div>
                    <h3 className="font-display text-lg text-foreground">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RULES AND AI */}
          <section id="rules-and-ai" className="scroll-mt-20">
            <p className="eyebrow">Rules and AI</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              What's decided by rules, and where AI helps
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Anything that decides whether a trip fits is a rule that can be tested case by case. A
              language model is used only where the job is reading language, and never to write
              something you're asked to trust.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {DIVISION.map((col) => (
                <div
                  key={col.title}
                  className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-inset ring-border"
                >
                  <span className="text-primary">{col.icon}</span>
                  <h3 className="mt-3 font-display text-lg leading-snug text-foreground">
                    {col.title}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {col.items.map((item) => (
                      <li
                        key={item}
                        className="border-t border-border pt-2 text-sm leading-snug text-muted-foreground first:border-t-0 first:pt-0"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The AI is Claude, and it's switched on only where it's configured. Without it, keyword
              rules do both jobs, and every reading and answer says on screen which of the two
              produced it.
            </p>
          </section>

          {/* FINDING THE EVIDENCE */}
          <section id="finding-evidence" className="scroll-mt-20">
            <p className="eyebrow">Finding the evidence</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              How answers are found
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Divers and researchers describe the same thing in different words. Nobody writing up a
              destination says “seasick”; they describe the crossing.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
              {EXAMPLE && (
                <figure className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border lg:p-7">
                  <p className="eyebrow">You ask</p>
                  <p className="mt-1.5 font-display text-lg text-foreground">
                    “Will I get seasick?”
                  </p>
                  <p className="eyebrow mt-5">The Tubbataha record says</p>
                  <blockquote className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                    “{EXAMPLE.text}”
                  </blockquote>
                  <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
                    {EXAMPLE.claim.label}
                  </figcaption>
                </figure>
              )}
              <div>
                <p className="text-base leading-relaxed text-muted-foreground">
                  So every record is split into its sentences ({SENTENCES.toLocaleString("en-GB")}{" "}
                  across the reference), and for each of the {CONCERNS.length} worries Sightline
                  looks for the words the records actually use: crossings, swell and surf launches
                  for seasickness; thermoclines and suit thickness for the cold. I also tried
                  embedding search, the usual way to match meaning. On the same test it found the
                  right evidence far less often, so it isn't used.
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  A question you type is matched against one destination's sentences, by Claude when
                  it's available and by keyword search when it isn't. Either way, what you see is
                  the record's own sentences with their source check.
                </p>
              </div>
            </div>
          </section>

          {/* METHODOLOGY */}
          <section id="methodology" className="scroll-mt-20">
            <p className="eyebrow">Methodology</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              How the data is maintained
            </h2>

            <ol className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.label}
                  className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-inset ring-border"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {s.label}
                      {i < STEPS.length - 1 && (
                        <ArrowRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.note}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map((p) => (
                <div
                  key={p.title}
                  className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border"
                >
                  <span className="text-primary">{p.icon}</span>
                  <h3 className="mt-3 font-display text-lg text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* TESTING */}
          <section id="testing" className="scroll-mt-20">
            <p className="eyebrow">Testing</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              How it's tested
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Each behaviour is checked against test cases written before the code that handles
              them, and scored on cases it wasn't tuned on. Where a simpler or more conventional
              approach exists, it's measured on the same test. These are results on test cases, not
              figures from people using the site.
            </p>
            <ul className="mt-6 grid gap-3 lg:grid-cols-2">
              {TESTED.map((t) => (
                <li
                  key={t.title}
                  className="grid content-start gap-2 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-inset ring-border sm:grid-cols-[7.5rem_1fr] sm:gap-6 sm:p-6"
                >
                  <p
                    className={`font-display text-3xl leading-none tabular-nums ${
                      t.pending ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {t.figure}
                  </p>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Measured {MEASURED_ON}. The figures above are re-checked against the tests every time
              the test suite runs.
            </p>
          </section>

          {/* LIMITS */}
          <section id="limits" className="scroll-mt-20">
            <p className="eyebrow">Limits</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              What it can't tell you yet
            </h2>
            <ul className="mt-6 max-w-3xl space-y-3">
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

          {/* MAINTAINER */}
          <section>
            <p className="eyebrow">About the diver</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              About the diver
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              115+ logged dives across multiple regions, with experience across deep, drift, wreck,
              night, Nitrox, and a lot of dive-trip planning. Sightline is the reference I wanted
              for myself, and I'm keeping it useful for other divers too.
            </p>
            <dl className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                ["115+", "logged dives"],
                ["PADI AOW", "certification"],
                ["Nitrox", "plus deep, drift, wreck, night"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-secondary p-5 ring-1 ring-inset ring-border"
                >
                  <dt className="font-display text-xl text-foreground">{value}</dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* FEEDBACK */}
          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border lg:p-8">
            <p className="eyebrow">Help improve it</p>
            <h2 className="mt-2 font-display text-2xl text-foreground">
              Help make Sightline better
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Been somewhere listed here? Spot something outdated? Want a destination added? Have an
              idea for a feature that would make planning easier?
            </p>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Send it my way. I review new information, verify it against reliable sources, and
              update the dataset when it holds up.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
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
            </div>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              Explore destinations <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
