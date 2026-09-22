# Cost and latency model

**Every figure on this page is an estimate** until the paid evals measure it. Regenerate
with `bun evals/cost-model.ts`. The script builds the product's real requests from the
eval inputs, so a prompt change updates the numbers.

## Inputs

| | Value | Basis |
|---|---|---|
| Model and effort | `claude-opus-5`, effort `low`, `max_tokens` 4,000 | `src/lib/llm.server.ts` |
| Prices per million tokens | input $5 · output $25 · cache write $6.25 · cache read $0.50 | Anthropic list prices, checked 2026-09-21 |
| Input tokens | characters ÷ 3.5 | estimate; the first paid run records real `usage` |
| Describe your trip, input | median **3.0k** tokens, 2.5k of it the cacheable system prompt (ID lists) | 74 real requests |
| Ask, input | median **1.5k** tokens, 1.3k of it the destination's record (cacheable) | 73 real requests |
| Output tokens, adaptive thinking included | describe 150 / **400** / 1,000 · ask 100 / **300** / 800 (low / mid / high) | assumption |
| Usage per monthly visitor | 40% describe a trip (1.3 times) · 25% ask questions (2.5 each, 2 per page) | assumption; replace with `docs/metrics.sql` queries 8 and 11 |
| Cache | 5-minute TTL; Describe calls arrive at random over the month | conservative: real traffic is burstier |

## Results (estimates)

Cost per call:

| | Cache miss (write) | Cache hit | Worst case* |
|---|---|---|---|
| Describe your trip | $0.022 / **$0.028** / $0.043 | $0.008 / **$0.014** / $0.029 | $0.115 |
| Ask | $0.012 / **$0.017** / $0.029 | $0.004 / **$0.009** / $0.021 | $0.107 |

\*No cache and all 4,000 output tokens used. This is also what the spend guard reserves
before each call.

Monthly cost:

| Visitors / month | Claude calls | Describe cache hits | Low | **Mid** | High | Per 1,000 visitors (mid) |
|---|---|---|---|---|---|---|
| 1,000 | 1,145 | 6% | $16 | **$22** | $38 | $22 |
| 10,000 | 11,450 | 45% | $129 | **$192** | $348 | $19 |
| 100,000 | 114,500 | ~100% | $875 | **$1,513** | $3,074 | $15 |

The rules engine answers both routes in **0.14 ms** (describe) and **0.18 ms** (ask) per
request, measured on a laptop. Claude's latency is **not measured**. The harness records it
on the first paid run, and the decision rules require a p95 of at most 6 s.

## What the model says, and what I did about it

- **Caching the Describe prompt only pays above about 4,000 visitors a month.** A cache read
  costs 0.1× and a write 1.25×, so caching wins only when more than 22% of calls land within
  5 minutes of the previous one. At 1,000 visitors that's 6%. Kept anyway: the premium at
  that scale is about $1.20 a month, it becomes a saving as traffic grows, and removing it
  later is a one-line change. Revisit when query 14 shows the real cache-read share.
- **Caching the Ask record pays at any traffic.** Divers ask follow-up questions on the
  same page within minutes, so every question after the first reads the record at 0.1×.
  That's why the record is now its own cached block, ahead of the question.
- **The daily cap is sized for a portfolio site, not a launch.** At the mid estimate,
  $5/day covers about 6,800 visitors a month. Past that, Claude switches off for the rest
  of the day and the rules answer. That's a deliberate degradation, set by
  `SIGHTLINE_LLM_DAILY_USD`.
- **Output tokens are the biggest unknown.** They're 40–70% of the cost per call at the mid
  assumption, and thinking tokens at effort `low` haven't been observed. The first paid run
  replaces the assumption with measured `usage`, and query 14 tracks it in production.

## Levers not pulled (each needs its own eval before adoption)

- **A smaller model** (e.g. Sonnet 5 at $2 / $10) would cut per-token cost by about 60%, but
  only counts if it passes the same pre-registered decision rules.
- **The verifier through the Message Batches API** (50% off). It's an offline curator tool
  with no latency requirement. Not done because the full run is a one-off estimated at
  $5–13.
- **Trimming the Describe prompt.** Most of its 2.5k tokens are the lists of allowed IDs,
  which the output gate depends on. Shorter lists would trade accuracy for about $0.01 a
  call.
