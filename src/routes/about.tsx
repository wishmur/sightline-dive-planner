import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BadgeCheck, Layers, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { SiteFooter } from "@/components/sightline/SiteFooter";
import { feedbackUrl } from "@/lib/feedback";
import { DESTINATIONS, SPECIES_GROUPS } from "@/lib/destinations";

export const Route = createFileRoute("/about")({
  head: () => {
    const title = "About Sightline — an independent dive destination reference";
    const description =
      "How Sightline is researched, sourced and verified: an independent, non-commercial dive destination reference. No operator pays for inclusion or ranking.";
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

const STEPS = [
  { label: "Research", note: "Operator pages, dive guides, marine research and regional reports." },
  { label: "Cross-check", note: "Claims are compared across independent sources before use." },
  { label: "Structure", note: "Findings are encoded into a consistent, comparable schema." },
  { label: "Source", note: "Every claim keeps the links it came from." },
  { label: "Verify", note: "Records carry a last-verified date and confidence value." },
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
    title: "Rechecked periodically",
    body: "The dataset is revisited on a rolling basis, and diver submissions are verified before they change anything.",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SightlineNav />

      {/* INTRO */}
      <header className="theme-deep px-6 pt-36 pb-16 lg:px-10 lg:pt-40 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl"
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
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Sightline started because planning my own dive travel meant piecing together operator
            sites, research papers, forums, trip reports, and word of mouth. I wanted one place that
            made the useful parts comparable: what you can actually see, when to go, what conditions
            to expect, and whether the diving fits your experience.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-inset ring-white/15">
              {DESTINATIONS.length} destinations
            </span>
            <span className="rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-inset ring-white/15">
              {SPECIES_GROUPS.length} species tracked by month
            </span>
            <span className="rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-inset ring-white/15">
              Sources on every record
            </span>
          </div>
        </motion.div>
      </header>

      <div className="theme-light">
        <div className="mx-auto max-w-3xl space-y-16 px-6 py-16 lg:px-10 lg:py-20">
          {/* WHY */}
          <section>
            <p className="eyebrow">Why it exists</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              Dive information is scattered
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              What you need to plan a dive trip is spread across operator pages, travel listicles,
              forum threads and research papers — each with its own agenda, vintage and level of
              rigour. Sightline attempts to structure that information into one source-backed
              reference, so the comparison is between destinations rather than between marketing
              pages.
            </p>

            <div className="mt-8 rounded-3xl bg-primary/[0.07] p-6 ring-1 ring-inset ring-primary/25 lg:p-8">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 font-display text-xl leading-snug text-foreground">
                Sightline is independent, non-commercial, and free to use. No destination, dive
                operator, or booking platform pays for inclusion or ranking.
              </p>
            </div>
          </section>

          {/* METHODOLOGY */}
          <section id="methodology" className="scroll-mt-20">
            <p className="eyebrow">Methodology</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              How the data is maintained
            </h2>

            <ol className="mt-7 space-y-3">
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
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

          {/* MAINTAINER */}
          <section>
            <p className="eyebrow">About the diver</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              About the diver
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              115+ logged dives across multiple regions, with experience across deep, drift, wreck,
              night, Nitrox, and a lot of dive-trip planning. Sightline is the reference I wanted for
              myself, and I'm keeping it useful for other divers too.
            </p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
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
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Been somewhere listed here? Spot something outdated? Want a destination added? Have an
              idea for a feature that would make planning easier?
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              Send it my way. I review new information, verify it against reliable sources, and
              update the dataset when it holds up.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { label: "Suggest a correction", kind: "edit" as const },
                { label: "Request a destination", kind: "request" as const },
                { label: "Suggest a feature", kind: "feature" as const },
              ].map((a) => (
                <a
                  key={a.kind}
                  href={feedbackUrl(a.kind)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/25 transition hover:bg-primary/15"
                >
                  {a.label} <ArrowRight className="h-3.5 w-3.5" />
                </a>
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
