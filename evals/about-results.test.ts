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
import { UNDERSTAND_CASES } from "./understand.gold";
import { scoreCase, summarize as summarizeParse } from "./understand-metrics";
import { ASK_CASES } from "./ask.gold";
import { isDev, scoreAsk } from "./ask";
import {
  askMet,
  askViolations,
  runAskRules,
  runTripRules,
  summarizeRows,
  tripMisses,
  tripViolations,
} from "./adversarial";
import { ASK_ADVERSARIAL, TRIP_ADVERSARIAL } from "./adversarial.gold";
import { LlmHarness, PRIVATE_CACHE_DIR } from "./harness/llm-harness";
import { existsSync, readFileSync } from "node:fs";

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

// Claude's numbers, recomputed by replaying the committed responses: no network,
// no key, and any change to a prompt or gate that moves them fails here.
describe("Claude results match the recorded runs", () => {
  const replay = (name: string) => {
    const h = new LlmHarness({ name, mode: "replay" });
    return { fetch: h.fetch, apiKey: "no-network" };
  };
  const report = (f: string) => JSON.parse(readFileSync(`evals/reports/${f}`, "utf8"));

  test("test cases behind the Claude numbers", () => {
    expect({
      descriptions: HELDOUT_CASES.length + UNDERSTAND_CASES.length,
      questions: ASK_CASES.length,
    }).toEqual(RESULTS.claude.cases);
  });

  test("describe your trip, held-out", async () => {
    const { understandWithClaude } = await import("@/lib/llm.server");
    const opts = replay("understand");
    const results = [];
    for (const c of HELDOUT_CASES)
      results.push(scoreCase(c, (await understandWithClaude(c.text, opts)).trip));
    const s = summarizeParse(results);
    expect({
      worries: pct(s.concernRecall),
      worryPrecision: pct(s.concernPrecision),
      fields: pct(s.fieldAccuracy),
    }).toEqual(RESULTS.claude.parser.final);
    const untuned = report("understand.record.json").sets.find(
      (x: { split: string }) => x.split === "test",
    );
    expect(pct(untuned.summary.concernRecall)).toBe(RESULTS.claude.parser.untuned.worries);
  });

  test("ask, test half", async () => {
    const { selectWithClaude } = await import("@/lib/llm.server");
    const opts = replay("ask");
    const results = [];
    for (const c of ASK_CASES.filter((x) => !isDev(x))) {
      const sel = await selectWithClaude(getDestination(c.destination)!, c.question, opts);
      results.push({
        c,
        a: {
          engine: "claude" as const,
          status: sel.status,
          passageIds: sel.passageIds,
          concerns: [],
        },
      });
    }
    const s = scoreAsk(results);
    expect({
      testHit: pct(s.hit),
      testPrecision: pct(s.precision),
      abstain: pct(s.abstain),
    }).toEqual(RESULTS.claude.ask.final);
    const untuned = report("ask.record.json").halves.find(
      (x: { split: string }) => x.split === "test",
    );
    expect(pct(untuned.byKind.all.precision)).toBe(RESULTS.claude.ask.untuned.testPrecision);
  });

  test("adversarial inputs", async () => {
    const { selectWithClaude, understandWithClaude } = await import("@/lib/llm.server");
    const opts = replay("adversarial");
    let violations = 0;
    let trip = 0;
    let ask = 0;
    for (const c of TRIP_ADVERSARIAL) {
      const t = (await understandWithClaude(c.text, opts)).trip;
      violations += tripViolations(t).length;
      if (!tripMisses(c, t).length) trip++;
    }
    for (const c of ASK_ADVERSARIAL) {
      const sel = await selectWithClaude(getDestination(c.destination)!, c.question, opts);
      const a = {
        engine: "claude" as const,
        status: sel.status,
        passageIds: sel.passageIds,
        concerns: [],
      };
      violations += askViolations(c.destination, a).length;
      if (askMet(c, a)) ask++;
    }
    expect({
      violations,
      trip: [trip, TRIP_ADVERSARIAL.length],
      ask: [ask, ASK_ADVERSARIAL.length],
    }).toEqual({
      ...RESULTS.claude.adversarial,
      trip: [...RESULTS.claude.adversarial.trip],
      ask: [...RESULTS.claude.adversarial.ask],
    });
  });

  // The verifier's responses quote source pages, so they're cached outside git:
  // this runs where that cache exists, and is skipped in CI.
  test.skipIf(!existsSync(PRIVATE_CACHE_DIR) || !existsSync("data/.source-cache"))(
    "source verifier, all reviewed claims",
    async () => {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const { goldCases, score } = await import("./verifier");
      const { llmVerifier } = await import("../scripts/verify/verifiers");
      const h = new LlmHarness({ name: "verifier", mode: "replay", cacheDir: PRIVATE_CACHE_DIR });
      const v = llmVerifier(new Anthropic({ fetch: h.fetch, apiKey: "no-network", maxRetries: 0 }));
      const s = await score(goldCases(), v);
      const bad = s.rows.filter((r) => r.gold === "contradicted" || r.gold === "not_found");
      const contra = s.rows.filter((r) => r.gold === "contradicted");
      expect({
        falseSupport: [bad.filter((r) => r.predicted === "supported").length, bad.length],
        contradictions: [
          contra.filter((r) => r.predicted === "contradicted").length,
          contra.length,
        ],
        accuracy: pct(s.accuracy),
      }).toEqual({
        falseSupport: [...RESULTS.claude.verifier.falseSupport],
        contradictions: [...RESULTS.claude.verifier.contradictions],
        accuracy: RESULTS.claude.verifier.accuracy,
      });
    },
    60_000,
  );
});
