import { useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, TriangleAlert } from "lucide-react";
import { SourceCheck } from "@/components/sightline/SourceCheck";
import { getSessionId, logEvent } from "@/lib/analytics";
import type { Destination } from "@/lib/destinations";
import { getConcern, type ConcernId } from "@/lib/concerns";
import { getPassage, type Passage } from "@/lib/passages";
import { CLAIM_KIND_LABEL } from "@/lib/claims";
import { answerConcern, concernHits } from "@/lib/retrieve";
import { askRules, type AskAnswer } from "@/lib/ask";
import { FLAG_LABEL, type Verdict } from "@/lib/fit";
import { askDestination } from "@/lib/api/plan.functions";

/** One sentence of the record, verbatim, with where it comes from and its source check. */
export function SentenceQuote({
  passage,
  destinationId,
}: {
  passage: Passage;
  destinationId: string;
}) {
  const { claim } = passage;
  return (
    <figure>
      <blockquote className="max-w-3xl text-sm leading-relaxed text-foreground/85">
        “{passage.text}”
      </blockquote>
      <figcaption className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          {CLAIM_KIND_LABEL[claim.type]}
        </span>
        <span>{claim.label}</span>
      </figcaption>
      <div className="mt-1">
        <SourceCheck claimId={claim.id} destinationId={destinationId} />
      </div>
    </figure>
  );
}

function ConcernRow({
  d,
  concern,
  verdict,
}: {
  d: Destination;
  concern: ConcernId;
  verdict?: Verdict;
}) {
  const def = getConcern(concern)!;
  const hits = useMemo(() => answerConcern(d, concern).hits, [d, concern]);
  const total = useMemo(() => concernHits(d, concern).length, [d, concern]);
  const [more, setMore] = useState(false);
  const [first, ...rest] = hits;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{def.label}</span>
        {verdict && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              verdict.status === "caveat"
                ? "bg-accent/12 text-accent"
                : "bg-primary/10 text-primary"
            }`}
          >
            {verdict.flags[0] ? FLAG_LABEL[verdict.flags[0]] : verdict.short}
          </span>
        )}
      </div>
      {!first ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This record doesn't say anything about {def.label.toLowerCase()}.
        </p>
      ) : (
        <div className="mt-2.5 space-y-3">
          <SentenceQuote passage={first.passage} destinationId={d.id} />
          {more &&
            rest.map((h) => (
              <SentenceQuote key={h.passage.id} passage={h.passage} destinationId={d.id} />
            ))}
          {rest.length > 0 && (
            <button
              onClick={() => {
                setMore((v) => !v);
                if (!more) logEvent("concern_evidence_open", { destination: d.id, concern, total });
              }}
              className="text-xs font-semibold text-primary underline decoration-dotted underline-offset-4 hover:no-underline"
            >
              {more
                ? "Show less"
                : `${rest.length} more note${rest.length === 1 ? "" : "s"} on this`}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** What the record says about each of the diver's concerns, quoted, or that it says nothing. */
export function ConcernEvidence({
  d,
  concerns,
  verdicts,
}: {
  d: Destination;
  concerns: ConcernId[];
  verdicts: Verdict[];
}) {
  if (concerns.length === 0) return null;
  return (
    <div className="mt-7 border-t border-border pt-6">
      <p className="eyebrow">What the record says about your concerns</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        The sentences in this record that bear on each one, quoted as researched. Nothing is
        paraphrased; if the record is silent, it says so.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {concerns.map((c) => (
          <ConcernRow
            key={c}
            d={d}
            concern={c}
            verdict={verdicts.find((v) => v.kind === "concern" && v.concern === c)}
          />
        ))}
      </ul>
    </div>
  );
}

const PROMPTS = [
  "Can I do this without a liveaboard?",
  "How long are the boat rides?",
  "How cold does it get?",
];

/** A free-text question about one destination, answered with the record's own sentences. */
export function AskRecord({ d }: { d: Destination }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AskAnswer | null>(null);

  async function ask(q: string) {
    const value = q.trim();
    if (value.length < 2 || busy) return;
    setBusy(true);
    setAsked(value);
    let a: AskAnswer;
    try {
      a = await askDestination({
        data: { destination: d.id, question: value, session: getSessionId() },
      });
    } catch {
      a = askRules(d, value);
    }
    setBusy(false);
    setAnswer(a);
    logEvent("ask_question", {
      destination: d.id,
      engine: a.engine,
      status: a.status,
      shown: a.passageIds,
      concerns: a.concerns,
      length: value.length,
    });
  }

  const passages = (answer?.passageIds ?? [])
    .map((id) => getPassage(id))
    .filter(Boolean) as Passage[];

  return (
    <div className="mt-7 border-t border-border pt-6">
      <label htmlFor={`ask-${d.id}`} className="eyebrow block">
        Ask about {d.name}
      </label>
      <form
        className="mt-3 flex items-center gap-2 rounded-full bg-secondary/60 py-1 pl-4 pr-1 ring-1 ring-inset ring-border focus-within:ring-primary/40"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <input
          id={`ask-${d.id}`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="e.g. Can I see the mantas from a day boat?"
          className="w-full min-w-0 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={question.trim().length < 2 || busy}
          aria-label="Ask"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          Ask
        </button>
      </form>
      {!answer && !busy && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuestion(p);
                void ask(p);
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border transition hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {answer && !busy && (
        <div className="mt-4" aria-live="polite">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">“{asked}”</span>
          </p>
          {passages.length === 0 ? (
            <p className="mt-2 inline-flex items-start gap-2 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              This record doesn't answer that. Nothing here is a guess, so there's nothing to show.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {answer.status === "partly" && (
                <p className="text-xs text-muted-foreground">These answer part of it.</p>
              )}
              {passages.map((p) => (
                <SentenceQuote key={p.id} passage={p} destinationId={d.id} />
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            {answer.engine === "claude"
              ? "Sentences chosen by Claude from this record and shown verbatim; it writes none of the text."
              : "Sentences found by keyword search of this record, shown verbatim. It can miss a question put in other words."}
          </p>
        </div>
      )}
    </div>
  );
}
