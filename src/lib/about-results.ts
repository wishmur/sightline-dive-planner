/**
 * Measured results quoted on the About page. Test-case results, not usage data.
 *
 * Every figure except the embedding comparison is recomputed and checked by
 * evals/about-results.test.ts, so the page fails the test suite if it drifts
 * from the evals. The embedding figures need a model download and come from
 * `bun evals/concerns.ts --dense`. Source-check counts are read from the data
 * on the page itself. Nothing here comes from the Claude paths: their evals
 * haven't run.
 */
export const MEASURED_ON = "21 Sep 2026";

export const RESULTS = {
  /** Trip-fit scenario briefs fully correct (evals/scenarios.ts). */
  scenarios: { passed: 26, total: 26, previousSearch: 10 },
  /** Must-read catches surfaced on the destination panel (evals/catches.gold.ts). */
  catches: { found: 39, total: 39, medianShown: 4 },
  /** Concern evidence on the 18 test-split destinations (evals/concerns.gold.json). */
  concerns: {
    testDestinations: 18,
    hit: 93,
    abstain: 85,
    seasicknessHit: 75,
    embeddingHit: [33, 44] as const,
  },
  /** Keyword-rules reading of 30 held-out trip descriptions (evals/understand.heldout.ts). */
  parser: { worries: 65 },
  /** Keyword fallback on specific questions, ask test half (evals/ask.gold.ts). */
  ask: { specificHit: 56 },
};
