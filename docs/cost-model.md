# Cost and latency model

Regenerate with `bun evals/cost-model.ts`. **Tokens and latency are measured.** They come
from 148 Describe and 110 Ask calls in the paid evals of 2026-09-22 (`evals/cache/llm/`).
**The traffic mix is an assumption**, and so are the monthly totals built on it. Replace the
mix with `docs/metrics.sql` queries 8, 11 and 14 once the site has visitors.

## Measured per call

| | Describe your trip | Ask |
|---|---|---|
| Input tokens (median) | **4,970**, of which 4,930 is the cached system prompt | **2,150**, of which 2,120 is the destination's record |
| Output tokens, adaptive thinking included (median / mean / max) | **87 / 97 / 231** | **23 / 28 / 78** |
| Cost, cache miss (write) | $0.033 | $0.014 |
| Cost, cache hit | **$0.005** | **$0.002** |
| Latency p50 / p95 (from a laptop) | 3.2 s / 4.7 s | 2.6 s / 3.4 s |
| Worst case (no cache, all 4,000 output tokens) | $0.125 | $0.111 |

Model `claude-opus-5`, effort `low`, list prices $5 / $25 per million input/output tokens,
cache writes $6.25, cache reads $0.50.

**The estimate I made before measuring was wrong in both directions.** Characters ÷ 3.5
undercounted input by 1.4–1.6×: the ID lists in the Describe prompt tokenize badly. The
assumed 150–1,000 output tokens was far too high: at effort `low`, the model barely thinks
on a structured-extraction task. The two errors roughly cancel at low traffic and don't at
scale.

## Monthly cost (traffic mix assumed)

Assumed mix: 40% of visitors describe a trip (1.3 times); 25% ask (2.5 questions, 2 per
page). Describe cache hits assume calls arrive at random over the month.

| Visitors / month | Claude calls | Describe cache hits | Monthly (measured tokens) | Per 1,000 visitors |
|---|---|---|---|---|
| 1,000 | 1,145 | 6% | **$22** | $22 |
| 10,000 | 11,450 | 45% | **$157** | $16 |
| 100,000 | 114,500 | ~100% | **$764** | $8 |

The rules engine answers in 0.14 ms (Describe) and 0.19 ms (Ask) per request.

## What the numbers say

- **At low traffic, input dominates, and most of it is the cache write.** A Describe call
  costs $0.033 on a miss and $0.005 on a hit. Caching the prompt pays off once more than 22%
  of calls land within five minutes of the previous one: about 4,000 visitors a month. Below
  that the cache-write premium costs about $2.40 a month at 1,000 visitors. Kept: it turns
  into a 6× saving as traffic grows, and removing it is a one-line change.
- **Ask's cache pays at any traffic**, because follow-up questions on one page reuse the
  record.
- **The $5/day cap covers about 6,900 visitors a month** before Claude switches off for the
  day and the rules answer (`SIGHTLINE_LLM_DAILY_USD`).
- **The whole paid evaluation cost $7.78.** That covers first runs of all four evals, one
  Describe and one Ask tuning iteration on dev, one held-out re-run, one adversarial re-run,
  and a 30-question confirmation set. The verifier was $5.59 of that (smoke run included): it reads whole source pages at default effort.

## Levers not pulled (each needs its own eval before adoption)

- **A smaller model** (e.g. Sonnet 5 at $2 / $10): about 60% cheaper per token, but only
  counts if it passes the same pre-registered decision rules.
- **Trimming the Describe prompt:** 4,930 tokens, mostly the allowed-ID lists the output
  gate depends on.
- **The verifier through the Message Batches API** (50% off): it's an offline curator tool.
