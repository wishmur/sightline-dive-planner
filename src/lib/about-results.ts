/**
 * Measured results quoted on the About page, in the README and in portfolio/.
 * Test-case results, not usage data.
 *
 * Every figure except the embedding comparison is recomputed and checked by
 * evals/about-results.test.ts, so the page fails the test suite if it drifts
 * from the evals. The embedding figures need a model download and come from
 * `bun evals/concerns.ts --dense`. Source-check counts are read from the data
 * on the page itself. Claude's numbers are replayed from the recorded paid runs.
 */
export const MEASURED_ON = "22 Sep 2026";

export const RESULTS = {
  /** Trip-fit scenario briefs fully correct (evals/scenarios.ts). */
  scenarios: { passed: 29, total: 29, previousSearch: 11 },
  /** Must-read catches surfaced on the destination panel (evals/catches.gold.ts). */
  catches: { found: 39, total: 39, medianShown: 4 },
  /** Concern evidence on the 18 test-split destinations (evals/concerns.gold.json). */
  concerns: {
    testDestinations: 18,
    hit: 93,
    /** Precision of the first sentence shown. */
    topSentence: 90,
    abstain: 85,
    seasicknessHit: 75,
    embeddingHit: [33, 44] as const,
  },
  /** Keyword-rules reading of 30 held-out trip descriptions (evals/understand.heldout.ts). */
  parser: { worries: 65, worryPrecision: 94, fields: 97 },
  /** Keyword fallback on specific questions, ask test half (evals/ask.gold.ts). */
  ask: { specificHit: 56, specificPrecision: 64, testHit: 61, testPrecision: 69 },
  /**
   * Claude, first paid runs 2026-09-22. `final` is the shipped prompt and gates,
   * replayed from evals/cache/llm by the test; `untuned` is the pre-registered
   * first run, read from its report. Describe was tuned on dev and Ask capped at
   * two sentences on dev; held-out errors had been viewed (docs/paid-evals.md).
   */
  claude: {
    parser: { final: { worries: 100, worryPrecision: 92, fields: 98 }, untuned: { worries: 87 } },
    ask: {
      final: { testHit: 100, testPrecision: 89, abstain: 100 },
      untuned: { testPrecision: 75 },
      /** Fresh 30-question set written and labelled after the cap was chosen, scored once. */
      confirmed: { cases: 30, hit: 100, precision: 82, abstain: 100, rulesHit: 48 },
    },
    adversarial: { violations: 0, trip: [26, 27] as const, ask: [17, 17] as const },
    verifier: { falseSupport: [0, 6] as const, contradictions: [4, 5] as const, accuracy: 59 },
    /** Test cases behind the Claude numbers (both splits). */
    cases: { descriptions: 74, questions: 73 },
  },
  /** Adversarial inputs on the keyword path (evals/adversarial.gold.ts). */
  adversarial: { cases: 44, violations: 0, trip: [24, 27] as const, ask: [16, 17] as const },
  /**
   * Blind re-labelling of 60 frozen destination × concern pairs, 2026-09-23
   * (`bun run label`, then `bun run agreement`).
   *
   * NOT inter-annotator agreement. The re-labeller is the same person who wrote
   * the concern gold and the lexicon, re-labelling two days later without sight
   * of the gold (the labelling module never loads it; evals/agreement.test.ts
   * enforces that). So this measures test–retest repeatability of one labeller's
   * notion of relevance, not independence from it. The one-labeller limitation
   * stands until someone else labels the sample.
   *
   * The disagreement runs one way: the later pass marked 236 sentences relevant
   * to the gold's 134, and at the pair level it added 7 while dropping none. The
   * gold is the stricter pass, which is the pass `concerns.hit` is measured on.
   */
  agreement: {
    pairs: { n: 60, kappa: 0.61, ci: [0.33, 0.84] as const, observed: 88 },
    sentences: { n: 1790, kappa: 0.64, ci: [0.51, 0.77] as const, observed: 93, positive: 68 },
    /** Sentences each pass marked and the other didn't. */
    goldOnly: 9,
    relabelOnly: 111,
  },
};
