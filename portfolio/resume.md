# Sightline: resume material

Every number below is measured and reproducible from the repo (`bun run eval`,
`bun run test`) as of 2026-09-22. Each one is pinned in `src/lib/about-results.ts`, so a
change that moves it fails the test suite. None comes from the Claude paths: their evals
are built and dry-run but not yet paid for. The results are test results, not usage
figures. Update this file after the paid runs (`docs/paid-evals.md`). The work described
here reaches the live site when this branch is merged.

**Project line**
Sightline: dive-trip planning reference · independent, live at sightline-dive-planner.lovable.app ·
TypeScript, TanStack Start, Supabase, Claude API

## Bullets: product-judgment variant (AI PM, product roles)

- **Diagnosed a logic bug before reaching for AI.** Wrote 29 trip scenarios across four
  user journeys before building. The shipped search got 11 of 29 fully right. A rebuilt
  deterministic ranking engine gets 29 of 29, with plain-language caveats and "close, but…"
  near misses instead of dead ends.
- **Measured vector search, then left it out.** On destinations held out from tuning, a
  curated vocabulary of diver worries finds relevant evidence for **93%** of them. Two
  embedding models find **33–44%**, and keyword search (BM25) **33–55%**. The vocabulary
  also correctly says "the record doesn't cover this" **85%** of the time. Shipping
  embeddings would have added a ~25 MB model to the product for a measured loss.
- **Checked the data before building on it.** Source-checked the 78 highest-stakes claims
  against their cited pages. Five were contradicted, including the product's headline
  example, which was corrected with verbatim evidence and dated before/after values.
- **Scoped the language model to the one job rules couldn't do.** On held-out
  descriptions, keyword rules got 97% of trip fields right but found only 65% of stated
  worries ("she doesn't dive" → non-diving partner). Claude now does that reading, with
  rules as the fallback. Every answer a diver reads is a verbatim sentence from the
  record, never model-written text.
- **Made the AI spend-safe and measurable before paying for it.** Built session, address
  and daily spend caps, a kill switch and per-route opt-in. Logging never stores what a
  visitor typed. Wrote the adoption criteria before any Claude result existed, and set up
  record/replay so each paid eval run is paid for once.
- **Planned how to measure the product, and flagged when a test would be underpowered.**
  Designed the A/B for the trip-description feature: the primary metric divides by exposed
  sessions, because the feature itself changes who creates a brief. Sample sizes showed a
  five-diver usability study should come first at current traffic.

## Bullets: AI and evaluation variant (AI engineer, applied AI roles)

- **Built evidence retrieval over 1,095 sentences for 13 diver worries, labelled against
  every sentence.** Compared a curated vocabulary, BM25, two dense embedding models and RRF
  hybrids. On a held-out split, the vocabulary reached **93%** hit rate, **90%** precision
  on the top sentence and **85%** correct abstention. The embedding models reached
  **33–44%**, and the hybrids **80–88%**.
- **Kept model-selected answers grounded.** Claude picks sentence numbers with structured
  output. A deterministic gate keeps at most three real sentences from that one record, and
  trip parsing is validated against closed lists. A hostile-model test confirms that
  injected IDs, out-of-range numbers and malformed output never reach the page.
- **Ran an adversarial suite against both text inputs.** 44 cases covering prompt
  injection, off-topic, abusive, overlong, other languages, made-up places and markup:
  **0** safety-rule violations. The keyword fallback handled 24 of 27 and 16 of 17 as
  expected, and each miss is documented in a threat model.
- **Built production guardrails for the Claude routes.** Worst-case spend is reserved
  under a database row lock and settled to actual token cost. Everything fails closed to
  rules. Prompt caching, a server-side refusal fallback, and one telemetry event per call
  (tokens, latency, cost, prompt version) with no stored user text.
- **Built an eval harness for paid runs.** Record/replay caching means each response is
  paid for once. A dry-run mode prints the exact prompts and a cost estimate. Adds smoke-run
  limits, dev/test splits, a hard budget, and adoption thresholds written before the first
  run.
- **Guarded the published numbers with tests.** 195 automated tests, including gold sets,
  held-out splits, contract tests against a local API stand-in, and a check that fails CI if
  the About page's numbers drift from the evals. The quota migration is tested in embedded
  Postgres.

## Skills, and where the evidence is

**Retrieval**
- Lexical / BM25: `src/lib/retrieve.ts`, `scripts/lib/retrieval.ts`. Source-passage BM25 recall@5 **95%** vs 41% with no retrieval (92 gold quotes).
- Dense embeddings, evaluated: `bun evals/concerns.ts --dense` (bge-small, MiniLM): **33–44%** hit vs 93% for the vocabulary.
- RRF hybrid: `evals/concerns.ts` (`rrf()`): fusion scored **80–88%**, worse than the vocabulary alone.
- Extractive grounded answers: `src/lib/ask.ts`, `selectWithClaude` + `validateSelection` in `src/lib/llm.server.ts`.

**LLM engineering**
- Structured outputs: `betaZodOutputFormat` schemas in `src/lib/llm.server.ts`.
- Validation gates: `normalizeTrip()` (`src/lib/understand.ts`), `validateSelection()`, the verifier's verbatim-quote gate (`scripts/verify/verifiers.ts`).
- Fallbacks: `src/lib/llm-route.ts`. Every failure is answered by rules, with the reason logged.
- Refusal fallback: `fallbacks: "default"` (server-side) plus a typed `LlmError("refusal")` → rules.
- Prompt caching: a cached system prompt for Describe; the destination record as its own cached block for Ask (`docs/cost-model.md` has the break-even).
- Cost and abuse controls: `src/lib/llm-guard.ts`, `supabase/migrations/20260921180000_llm_quota.sql`.

**Evaluation**
- Gold sets: `evals/*.gold.*`, `evals/concerns.gold.json` (exhaustive: 1,095 sentences × 13 concerns).
- Held-out splits: destination-level concern split, `evals/understand.heldout.ts`, ask dev/test halves.
- Abstention metrics, precision@k: `evals/concern-metrics.ts`, `evals/ask.ts`.
- Regression gates and CI: `.github/workflows/ci.yml`, 195 tests.
- Contract tests: `evals/llm-contract.test.ts`, `evals/llm-harness.test.ts` (local API stand-in behind the real SDK).
- Pinned results: `evals/about-results.test.ts`.
- Adversarial testing and threat model: `evals/adversarial*.ts`, `docs/threat-model.md`.
- Inter-annotator agreement: blind labelling tool and Cohen's kappa with bootstrap intervals (`evals/label/`, `evals/agreement.ts`). *Built; the second labeller's labels and the kappa are still pending.*
- Pre-registered decision rules and paid-eval harness: `docs/paid-evals.md`, `evals/harness/`.

**Product**
- User journeys and goldens-first: four journeys, scenario goldens written before the engine (`evals/scenarios.ts`).
- Instrumentation: event design with no raw text, and one query per product question (`docs/metrics.sql`, tested against the schema).
- Experiment design: `docs/experiment-describe.md` (unbiased denominator, power analysis, guardrails).
- Cost modelling: `docs/cost-model.md`.

## Deliberately not used

- **Chat UI.** Divers need a shortlist and its catch, not a conversation. A chat window would hide the editable brief and make answers impossible to check against the record.
- **Agents.** Each AI job is one bounded step (text → brief; question → up to three sentences). An agent loop would add cost, latency and failure modes with nothing to plan.
- **Vector database.** The whole corpus is about 17k words and fits in memory, and measured dense retrieval lost to the vocabulary by about 50 points.
- **Fine-tuning.** Around 100 labelled examples, a strong rules baseline, and the base model not yet measured. A prompt plus validation gates is cheaper to iterate and evaluate.
- **RAG for ranking.** Choosing which notes matter for a trip is a linking problem. Deterministic linking by species, site and month surfaces 39 of 39 must-read catches.
