# Sightline: resume material

Every number below is measured and reproducible from the repo as of 2026-09-22. Rules-path
numbers come from `bun run eval`. Claude numbers come from the paid evals, replayed free
from `evals/cache/llm/`. Each one is pinned in `src/lib/about-results.ts`, so a change that
moves it fails the test suite. They're test results, not usage figures. Where a Claude number
comes after tuning, the untuned first run is given too. The work described here reaches the
live site when this branch is merged.

**Project line**
Sightline: dive-trip planning reference · independent, live at sightline-dive-planner.lovable.app ·
TypeScript, TanStack Start, Supabase, Claude API

## Bullets: product-judgment variant (AI PM, product roles)

- **Diagnosed a logic bug before reaching for AI.** Wrote 29 trip scenarios across four
  user journeys before building. The shipped search got 11 of 29 fully right. A rebuilt
  deterministic ranking engine gets 29 of 29, with plain-language caveats and "close, but…"
  near misses instead of dead ends.
- **Measured vector search, then left it out.** On destinations held out from tuning, a
  curated vocabulary of diver worries finds relevant evidence for **93%** of them. Embeddings
  find **33–44%**, and BM25 **33–55%**. The vocabulary also correctly says "the record doesn't
  cover this" **85%** of the time.
- **Checked the data before building on it.** Source-checked the 78 highest-stakes claims.
  Five were contradicted, including the product's headline example, which was corrected with
  verbatim evidence.
- **Put the language model only where rules measurably failed.** Keyword rules found 65% of
  the worries divers stated in held-out trip descriptions. Claude found **87%** on its first,
  untuned run and **100%** after one round of tuning on the dev set. Everything a diver reads
  is still a verbatim sentence from the record.
- **Let thresholds set before any results overrule an impressive headline.** Claude's
  question answering found a relevant sentence **100%** of the time (rules: 61%) but missed
  its precision bar (75% vs 80%). I traced that to its third sentence, relevant less than
  half the time, capped answers at two sentences (**89%**), then confirmed the fix on 30 fresh
  questions labelled before the run (**82%** precision, every question answered). The Claude fact-checker made
  zero dangerous errors but missed its accuracy bar by one claim, so it wasn't adopted.
- **Kept AI spend safe and small.** Built caps per session, per address and per day, a kill
  switch and per-route opt-in. The full paid evaluation (four evals plus tuning) cost
  **$7.63**, under a $15 budget the harness enforced by reserving each call's worst case.

## Bullets: AI and evaluation variant (AI engineer, applied AI roles)

- **Built and evaluated evidence retrieval over 1,095 sentences for 13 diver worries,**
  with every sentence labelled against every worry. Compared a curated vocabulary, BM25, two
  embedding models and RRF hybrids. On held-out destinations the vocabulary reached **93%**
  hit rate, **90%** top-sentence precision and **85%** correct abstention. Embeddings reached
  **33–44%**, and the hybrids **80–88%**.
- **Measured Claude against rules on thresholds set in advance.** Trip parsing found **87%**
  of worries on the first run (rules 65%) and **100%** after tuning on dev. Question answering
  had **100%** hit rate (rules 61%), with precision going from 75% to **89%** after a
  deterministic two-sentence cap, confirmed prospectively at **82%** on a fresh labelled set. An LLM verifier had **0 of 6** false supports but **59%**
  accuracy against a 60% bar, so it wasn't adopted.
- **Caught a safety regression that an unchanged score hid.** After prompt tuning, the
  44-case adversarial suite still read 25/27, but a certification-escalation injection had
  started to succeed. Fixed with a deterministic gate (the model may lower the level the rules
  read, never raise it). Claude now scores **26/27** and **17/17** (rules 24/27 and 16/17),
  with **0** safety-rule violations.
- **Kept answers grounded by construction.** Structured output, closed-list validation, and a
  gate that keeps at most two real sentences of that one record. A hostile-model test shows
  injected IDs, bogus sentence numbers and malformed output never reach the page.
- **Built an eval harness for paid runs.** Record/replay caching means each response is paid
  for once. It also has dry-run cost estimates, smoke-run limits, dev/test splits, and per-run
  and total budgets enforced by worst-case reservation. Total spend: **$7.78**. CI replays the
  committed responses to re-verify every published Claude number, with no key.
- **Found and fixed a misleading metric.** The verifier's "hallucinated quote" rate read
  17–19%. Error analysis showed **1** fabricated quote out of 376. The rest were real text
  that broke the 25-word quoting rule. The report now separates the two. 209 automated tests.

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
- Safety gate on model output: `safestCert()` in `src/lib/understand.ts`.
- Cost measurement: `docs/cost-model.md` (measured tokens and latency; ~$0.005 per cached Describe call).

**Evaluation**
- Gold sets: `evals/*.gold.*`, `evals/concerns.gold.json` (exhaustive: 1,095 sentences × 13 concerns).
- Held-out splits: destination-level concern split, `evals/understand.heldout.ts`, ask dev/test halves.
- Abstention metrics, precision@k: `evals/concern-metrics.ts`, `evals/ask.ts`.
- Regression gates and CI: `.github/workflows/ci.yml`, 209 tests.
- Contract tests: `evals/llm-contract.test.ts`, `evals/llm-harness.test.ts` (local API stand-in behind the real SDK).
- Pinned results: `evals/about-results.test.ts`.
- Adversarial testing and threat model: `evals/adversarial*.ts`, `docs/threat-model.md`.
- Inter-annotator agreement: blind labelling tool and Cohen's kappa with bootstrap intervals (`evals/label/`, `evals/agreement.ts`). *Built; the second labeller's labels and the kappa are still pending.*
- Pre-registered decision rules, paid-eval harness and error analysis: `docs/paid-evals.md` (results and every post-hoc change disclosed), `evals/harness/`, `evals/reports/*.record.json`.
- LLM-as-judge, measured: the Claude verifier against 78 human-reviewed claims (`evals/verifier.ts`), not adopted.
- Replay-verified results: `evals/about-results.test.ts` recomputes Claude's numbers from `evals/cache/llm/` in CI.

**Product**
- User journeys and goldens-first: four journeys, scenario goldens written before the engine (`evals/scenarios.ts`).
- Instrumentation: event design with no raw text, and one query per product question (`docs/metrics.sql`, tested against the schema).
- Experiment design: `docs/experiment-describe.md` (unbiased denominator, power analysis, guardrails; concludes a five-diver study should come first at current traffic).
- Cost modelling: `docs/cost-model.md`.

## Deliberately not used

- **Chat UI.** Divers need a shortlist and its catch, not a conversation. A chat window would hide the editable brief and make answers impossible to check against the record.
- **Agents.** Each AI job is one bounded step (text → brief; question → up to three sentences). An agent loop would add cost, latency and failure modes with nothing to plan.
- **Vector database.** The whole corpus is about 17k words and fits in memory, and measured dense retrieval lost to the vocabulary by about 50 points.
- **Fine-tuning.** Around 100 labelled examples, a strong rules baseline, and the base model not yet measured. A prompt plus validation gates is cheaper to iterate and evaluate.
- **RAG for ranking.** Choosing which notes matter for a trip is a linking problem. Deterministic linking by species, site and month surfaces 39 of 39 must-read catches.
