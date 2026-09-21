/** Evidence-selection scoring, shared by the test and the report. */
import { getDestination } from "@/lib/destinations";
import { EMPTY_FILTERS } from "@/lib/filters";
import { evaluate, pageClaimCount, selectEvidence, type EvidenceOptions } from "@/lib/fit";
import { CATCHES, type CatchCase } from "./catches.gold";

export type CatchResult = {
  c: CatchCase;
  selected: string[];
  hit: number;
  total: number;
  missed: (string | string[])[];
  pageClaims: number;
};

export function scoreCatches(options: EvidenceOptions): CatchResult[] {
  return CATCHES.map((c) => {
    const d = getDestination(c.destination)!;
    const f = { ...EMPTY_FILTERS, ...c.brief };
    const selected = selectEvidence(evaluate(d, f), f, options).map((e) => e.claim.id);
    const missed = c.required.filter((r) =>
      Array.isArray(r) ? !r.some((x) => selected.includes(x)) : !selected.includes(r),
    );
    return {
      c,
      selected,
      hit: c.required.length - missed.length,
      total: c.required.length,
      missed,
      pageClaims: pageClaimCount(d),
    };
  });
}

export function summarize(results: CatchResult[]) {
  const hit = results.reduce((n, r) => n + r.hit, 0);
  const total = results.reduce((n, r) => n + r.total, 0);
  const sizes = results.map((r) => r.selected.length).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)]!;
  const casesFullyCovered = results.filter((r) => r.missed.length === 0).length;
  const shareOfPage =
    results.reduce((n, r) => n + r.selected.length / r.pageClaims, 0) / results.length;
  return {
    recall: hit / total,
    hit,
    total,
    median,
    max: sizes.at(-1)!,
    casesFullyCovered,
    cases: results.length,
    shareOfPage,
  };
}
