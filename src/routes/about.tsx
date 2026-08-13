import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Layers, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { SightlineNav } from "@/components/sightline/Nav";
import { SiteFooter } from "@/components/sightline/SiteFooter";
import { SuggestEdit } from "@/components/sightline/SuggestEdit";
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
          <p className="eyebrow text-primary">About</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl">
            An independent dive destination reference.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Sightline is a non-commercial reference built to help divers compare destinations by
            marine life, seasonality, conditions, experience requirements and trip format — with the
            sources behind each claim kept in view.
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
                Sightline is an independent, non-commercial project. No destination, dive operator,
                or booking platform pays for inclusion or ranking.
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
            <p className="eyebrow">Maintainer</p>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              Built and maintained by Shailvi Kumar
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              PADI Advanced Open Water diver with 110+ logged dives across multiple regions, and
              experience across recreational, deep, drift, wreck and night diving as well as Nitrox.
              Sightline started as a way to answer planning questions the existing sources kept
              answering badly.
            </p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["110+", "logged dives"],
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
            <h2 className="mt-2 font-display text-2xl text-foreground">Corrections welcome</h2>
            <div className="mt-4">
              <SuggestEdit />
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
