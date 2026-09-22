/**
 * "Ask about this destination", deterministic path. Used when Claude isn't
 * configured, and as the fallback when a Claude call fails.
 *
 * 1. If the question raises a known concern ("is the boat ride rough?"), answer
 *    it with that concern's evidence (the measured lexicon in retrieve.ts).
 * 2. Otherwise, BM25 over the destination's sentences, with a threshold below
 *    which the answer is "this record doesn't say".
 *
 * Either way the answer is the record's own sentences, verbatim.
 */
import type { Destination } from "@/lib/destinations";
import type { ConcernId } from "@/lib/concerns";
import { bm25Hits, concernHits, MAX_EVIDENCE, type Hit } from "@/lib/retrieve";
import { parseTripRules } from "@/lib/understand";

export type AskEngine = "claude" | "rules";

export type AskAnswer = {
  engine: AskEngine;
  status: "answered" | "partly" | "not_covered";
  passageIds: string[];
  /** Concerns the question was routed to (rules path only). */
  concerns: ConcernId[];
};

/** BM25 score below which a free-text match is treated as noise. Tuned on the ask dev split. */
export const ASK_BM25_THRESHOLD = 9;

/**
 * Questions about how a place is dived ("without a liveaboard?", "on a day
 * trip?") are access questions. Added 2026-09-21 from UI testing, after the ask
 * test half had been inspected, so later ask numbers for rules are not blind.
 */
const FORMAT_QUESTION =
  /\b(?:liveaboards?|day ?boats?|day[- ]trips?|land[- ]based|shore (?:dive|diving|entry))\b/i;

export function askRules(d: Destination, question: string): AskAnswer {
  const concerns = parseTripRules(question).concerns;
  if (FORMAT_QUESTION.test(question) && !concerns.includes("getting_there"))
    concerns.push("getting_there");
  let hits: Hit[] = [];
  if (concerns.length) {
    // Interleave so two concerns each get their best sentence.
    const lists = concerns.map((c) => concernHits(d, c));
    for (let i = 0; hits.length < MAX_EVIDENCE && lists.some((l) => l[i]); i++)
      for (const l of lists)
        if (l[i] && !hits.some((h) => h.passage.id === l[i]!.passage.id)) hits.push(l[i]!);
  } else {
    hits = bm25Hits(d, question).filter((h) => h.score >= ASK_BM25_THRESHOLD);
  }
  const passageIds = hits.slice(0, MAX_EVIDENCE).map((h) => h.passage.id);
  return {
    engine: "rules",
    status: passageIds.length ? "answered" : "not_covered",
    passageIds,
    concerns,
  };
}
