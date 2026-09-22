/**
 * Scoring for concern evidence, shared by the test and the report.
 *
 * A method returns, for (destination, concern), the sentences it would show
 * (at most 3, best first). Outcomes that matter to a diver:
 * - covered pair (the record addresses it): did we show something relevant?
 * - uncovered pair: did we say "this record doesn't say" instead of showing noise?
 * - every shown sentence: was it actually about the concern?
 */
import gold from "./concerns.gold.json";
import { DESTINATIONS, type Destination } from "@/lib/destinations";
import { CONCERNS, type ConcernId } from "@/lib/concerns";

export type Gold = Record<string, Partial<Record<ConcernId, string[]>>>;
export const GOLD = gold.gold as Gold;
export const SPLIT = gold.split as { dev: string[]; test: string[] };
export const GOLD_PASSAGE_COUNTS = gold.passageCounts as Record<string, number>;

export type Method = (d: Destination, concern: ConcernId) => string[];

export type Pair = { destination: string; concern: ConcernId; gold: string[]; shown: string[] };

export function runMethod(method: Method, destinations: string[]): Pair[] {
  const pairs: Pair[] = [];
  for (const id of destinations) {
    const d = DESTINATIONS.find((x) => x.id === id)!;
    for (const c of CONCERNS) {
      pairs.push({
        destination: id,
        concern: c.id,
        gold: GOLD[id]?.[c.id] ?? [],
        shown: method(d, c.id).slice(0, 3),
      });
    }
  }
  return pairs;
}

export type Scores = {
  pairs: number;
  covered: number;
  uncovered: number;
  /** Covered pairs where at least one shown sentence is relevant. */
  hit: number;
  /** Mean over covered pairs of |shown ∩ gold| / min(3, |gold|). */
  recall: number;
  /** Relevant shown / all shown, across every pair. */
  precision: number;
  shown: number;
  /** Uncovered pairs where nothing was shown. */
  abstain: number;
  /** Covered pairs where nothing was shown. */
  missedAnswer: number;
};

export function score(pairs: Pair[]): Scores {
  const covered = pairs.filter((p) => p.gold.length > 0);
  const uncovered = pairs.filter((p) => p.gold.length === 0);
  const relevantShown = pairs.reduce(
    (n, p) => n + p.shown.filter((s) => p.gold.includes(s)).length,
    0,
  );
  const shown = pairs.reduce((n, p) => n + p.shown.length, 0);
  return {
    pairs: pairs.length,
    covered: covered.length,
    uncovered: uncovered.length,
    hit: covered.filter((p) => p.shown.some((s) => p.gold.includes(s))).length / covered.length,
    recall:
      covered.reduce(
        (n, p) => n + p.shown.filter((s) => p.gold.includes(s)).length / Math.min(3, p.gold.length),
        0,
      ) / covered.length,
    precision: shown ? relevantShown / shown : 1,
    shown,
    abstain: uncovered.filter((p) => p.shown.length === 0).length / Math.max(1, uncovered.length),
    missedAnswer: covered.filter((p) => p.shown.length === 0).length / covered.length,
  };
}

export const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function row(name: string, s: Scores) {
  return `${name.padEnd(30)} hit ${pct(s.hit).padStart(4)} · recall@3 ${pct(s.recall).padStart(4)} · precision ${pct(s.precision).padStart(4)} (${s.shown} shown) · abstains ${pct(s.abstain).padStart(4)} of ${s.uncovered} uncovered`;
}
