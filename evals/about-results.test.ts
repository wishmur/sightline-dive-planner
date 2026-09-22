/**
 * The About page quotes measured results (src/lib/about-results.ts). This test
 * recomputes each one, so a change that moves a number fails here until the page
 * is updated. The embedding comparison needs a model download and is checked by
 * hand with `bun evals/concerns.ts --dense`.
 */
import { describe, expect, test } from "bun:test";
import { RESULTS } from "@/lib/about-results";
import { getDestination } from "@/lib/destinations";
import { EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { DEFAULT_EVIDENCE, runFit } from "@/lib/fit";
import { concernHits } from "@/lib/retrieve";
import { askRules } from "@/lib/ask";
import { parseTripRules } from "@/lib/understand";
import { BASELINE_EMPTY, baselineApplyFilters } from "./baseline-filters";
import { SCENARIOS, type Scenario } from "./scenarios";
import { scoreCatches, summarize as summarizeCatches } from "./catches";
import { SPLIT, runMethod, score } from "./concern-metrics";
import { HELDOUT_CASES } from "./understand.heldout";
import { scoreCase, summarize as summarizeParse } from "./understand-metrics";
import { ASK_CASES } from "./ask.gold";
import { isDev, scoreAsk } from "./ask";
import { runAskRules, runTripRules, summarizeRows } from "./adversarial";

const pct = (x: number) => Math.round(x * 100);

function fullyCorrect(s: Scenario, got: string[], near: Map<string, string | undefined>) {
  return (
    (s.mustInclude ?? []).every((id) => got.includes(id)) &&
    (s.mustExclude ?? []).every((id) => !got.includes(id)) &&
    (s.exactCount === undefined || got.length === s.exactCount) &&
    (s.nearMiss ?? []).every((n) => near.get(n.id) === n.reason)
  );
}

describe("About page results match the evals", () => {
  test("trip-fit scenarios, and the search they replaced", () => {
    const briefs = SCENARIOS.filter((s) => !s.sameAsBaseline);
    let fit = 0;
    let previous = 0;
    for (const s of briefs) {
      const f: Filters = { ...EMPTY_FILTERS, ...s.brief };
      const run = runFit(f);
      const near = new Map(run.nearMisses.map((n) => [n.destination.id, n.violation?.reason]));
      if (
        fullyCorrect(
          s,
          run.results.map((r) => r.destination.id),
          near,
        )
      )
        fit++;
      const base = baselineApplyFilters({
        ...BASELINE_EMPTY,
        ...s.brief,
        species: s.baselineSpecies ?? [],
      });
      if (
        fullyCorrect(
          s,
          base.map((d) => d.id),
          new Map(),
        )
      )
        previous++;
    }
    expect({ passed: fit, total: briefs.length, previousSearch: previous }).toEqual(
      RESULTS.scenarios,
    );
  });

  test("critical catches", () => {
    const s = summarizeCatches(scoreCatches(DEFAULT_EVIDENCE).filter((r) => !r.c.addedAfter));
    expect({ found: s.hit, total: s.total, medianShown: s.median }).toEqual(RESULTS.catches);
  });

  test("concern evidence, test split", () => {
    const all = score(runMethod((d, c) => concernHits(d, c).map((h) => h.passage.id), SPLIT.test));
    const seasick = score(
      runMethod((d, c) => concernHits(d, c).map((h) => h.passage.id), SPLIT.test).filter(
        (p) => p.concern === "seasickness",
      ),
    );
    expect(SPLIT.test.length).toBe(RESULTS.concerns.testDestinations);
    expect(pct(all.hit)).toBe(RESULTS.concerns.hit);
    const top = score(
      runMethod(
        (d, c) =>
          concernHits(d, c)
            .slice(0, 1)
            .map((h) => h.passage.id),
        SPLIT.test,
      ),
    );
    expect(pct(top.precision)).toBe(RESULTS.concerns.topSentence);
    expect(pct(all.abstain)).toBe(RESULTS.concerns.abstain);
    expect(pct(seasick.hit)).toBe(RESULTS.concerns.seasicknessHit);
  });

  test("keyword rules on held-out trip descriptions", () => {
    const s = summarizeParse(HELDOUT_CASES.map((c) => scoreCase(c, parseTripRules(c.text))));
    expect({
      worries: pct(s.concernRecall),
      worryPrecision: pct(s.concernPrecision),
      fields: pct(s.fieldAccuracy),
    }).toEqual(RESULTS.parser);
  });

  test("keyword fallback on specific questions, test half", () => {
    const results = ASK_CASES.filter((c) => !isDev(c) && c.kind === "specific").map((c) => ({
      c,
      a: askRules(getDestination(c.destination)!, c.question),
    }));
    expect(pct(scoreAsk(results).hit)).toBe(RESULTS.ask.specificHit);
    expect(pct(scoreAsk(results).precision)).toBe(RESULTS.ask.specificPrecision);
  });

  test("keyword fallback on the whole test half", () => {
    const results = ASK_CASES.filter((c) => !isDev(c)).map((c) => ({
      c,
      a: askRules(getDestination(c.destination)!, c.question),
    }));
    expect(pct(scoreAsk(results).hit)).toBe(RESULTS.ask.testHit);
    expect(pct(scoreAsk(results).precision)).toBe(RESULTS.ask.testPrecision);
  });

  test("adversarial inputs on the keyword path", () => {
    const s = summarizeRows(runTripRules(), runAskRules());
    expect({
      cases: s.trip.n + s.ask.n,
      violations: s.invariantViolations,
      trip: [s.trip.met, s.trip.n],
      ask: [s.ask.met, s.ask.n],
    }).toEqual({
      ...RESULTS.adversarial,
      trip: [...RESULTS.adversarial.trip],
      ask: [...RESULTS.adversarial.ask],
    });
  });
});
