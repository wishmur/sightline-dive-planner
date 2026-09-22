# Paid Claude evals: runbook and decision rules

Everything on this page runs through the eval harness (`evals/harness/llm-harness.ts`).
Each response is paid for once, stored in `evals/cache/llm/`, and replayed free from then on.
Dry runs and replays never touch the network. The decision rules below were written
**on 2026-09-22, before any Claude result existed**, and are not to be edited after the runs.

## Before spending anything (free)

```bash
bun run eval:llm:dry          # all three: exact prompts, token and cost estimates, nothing sent
```

Dry-run estimates, 2026-09-22 (characters ÷ 3.5 for tokens; output tokens assumed, not measured):

| Eval | Requests | Estimated cost | Worst case* |
|---|---|---|---|
| Describe your trip (`understand`) | 74 | $0.57–$2.14 | $8.51 |
| Ask about this destination (`ask`) | 73 | $0.55–$1.83 | $7.84 |
| Source verifier (`verifier`) | 78 | $4.89–$12.69 | $34.14 |
| **All three** | 225 | **≈ $6–17** | $50.49 |

\*No cache hits and every allowed output token used. Each run also has a hard budget
(`--max-usd`, default $5): once it's spent, no further paid calls are made.

## The runs, in order

Set the key in your shell first (`export ANTHROPIC_API_KEY=…`). Each line is one run.

```bash
# 1. Smoke test: key, request shape, caching (≈ $0.05). Run it twice; the second is free.
bun evals/understand.ts llm --limit 3 --max-usd 0.5
bun evals/understand.ts llm --limit 3 --replay

# 2. Describe your trip: both sets, untuned (≈ $0.6–2.1)
bun evals/understand.ts llm --max-usd 3

# 3. Ask: both halves, untuned (≈ $0.6–1.8)
bun evals/ask.ts llm --limit 3 --max-usd 0.5
bun evals/ask.ts llm --max-usd 3

# 4. Verifier: all 78 reviewed claims, untuned (≈ $5–13)
bun evals/verifier.ts llm --limit 2 --max-usd 1
bun evals/verifier.ts llm --max-usd 15

# 5. Re-score everything from the cache, free, as often as needed
bun run eval:llm:replay
bun evals/understand.ts llm --replay --errors
bun evals/ask.ts llm --replay --errors
```

Reports land in `evals/reports/<eval>.record.json` (or `.replay.json`). They hold per-case
rows, token usage, the dollars actually spent, and latency as recorded.

## Decision rules (pre-registered)

Scored as shipped: a failed Claude call counts as the rules engine's answer, and failures
are counted as well. A route is switched on (`SIGHTLINE_LLM_ROUTES`) only if it passes
**every** line for it. Test sets are small, so each threshold is also given as a count.

### Describe your trip → route `understand`
Held-out test set: 30 descriptions, 23 stated worries. Rules baseline: worries 15/23 (65%),
worry precision 15/16 (94%), other fields 99.3%.

| | Threshold |
|---|---|
| Primary: worries found (recall) | **≥ 19 of 23 (83%)** |
| Worry precision | ≥ 85% |
| Other fields (month, animals, cert, …) | ≥ 97% (at most ~2 more field errors than rules) |
| Failed calls (refusal, invalid output, timeout) | ≤ 1 of 30 |
| p95 latency, as recorded | ≤ 6 s |

### Ask about this destination → route `ask`
Test half: 36 questions (28 answerable, 8 the record can't answer). Rules baseline: hit 17/28
(61%), precision 69%, abstains 7/8.

| | Threshold |
|---|---|
| Primary: precision of sentences shown | **≥ 80%** |
| Hit (a relevant sentence shown) | ≥ 17 of 28 (no worse than rules) |
| Abstains when the record is silent | ≥ 7 of 8 |
| Failed calls | ≤ 1 of 36 |
| p95 latency, as recorded | ≤ 6 s |

### Source verifier → curator triage (never in the request path)
All 78 reviewed claims (5 contradicted, 1 not found). Lexical baseline: accuracy 35%,
contradiction recall 0/5.

| | Threshold |
|---|---|
| Hard gate: false support (says "supported" for a contradicted or unsourced claim) | **≤ 1 of 6** |
| Contradiction recall | ≥ 3 of 5 |
| Accuracy | ≥ 60% |
| Hallucinated quotes | reported; each is rejected by the verbatim gate |

Passing makes the verifier a proposal tool for the next batch of unchecked claims. A
reviewer still confirms every verdict before anything changes in the data.

## After the runs

1. **Error analysis first, from the cache (free).** Label every miss with one cause:
   - parse: missed indirect worry · over-eager worry · month or window · out-of-list ID;
   - ask: wrong sentence · abstained when answerable · answered off-record;
   - verifier: false support · missed contradiction · partial vs supported.
2. **Tuning, if any, happens on dev only** (`--split dev`), with at most three prompt
   iterations. Then one final test run. Report the first, untuned test number next to the
   final one, and say that the dev set has been seen.
3. **Adopt route by route.** Set `SIGHTLINE_LLM_ROUTES` to the routes that passed.
4. **Update the numbers everywhere**: `src/lib/about-results.ts` (pinned by
   `evals/about-results.test.ts`), the README tables and the resume bullets in `portfolio/`.

## Turning it on in production

Order matters: without the quota table every Claude call fails closed to the rules.

1. Apply `supabase/migrations/20260921180000_llm_quota.sql` (owner approval needed).
2. Add Lovable project secrets: `ANTHROPIC_API_KEY`, `SIGHTLINE_LLM_ROUTES` (only the
   routes that passed), and optionally `SIGHTLINE_HASH_SALT` and the limits
   (`SIGHTLINE_LLM_DAILY_USD`, default $5).
3. Watch `docs/metrics.sql` queries 13–16: who answered and why, latency, spend against
   the cap, and discarded output.
4. To switch Claude off at once, without a deploy: `SIGHTLINE_LLM_KILL_SWITCH=1`.
