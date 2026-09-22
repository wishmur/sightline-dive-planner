# Threat model: the two public text boxes

Scope: **Describe your trip** (`understandTrip`) and **Ask about this destination**
(`askDestination`), the only places where a visitor's free text reaches a server
function and, when switched on, Claude. Written 2026-09-22 alongside
`evals/adversarial.gold.ts` (the cases) and `evals/adversarial.test.ts` (the gates).

## What's at stake

| Asset | Worst plausible outcome |
|---|---|
| Answer integrity | A diver trusts a wrong filter or a misleading sentence and books the wrong trip |
| Spend | Someone scripts the endpoints and runs up the Anthropic bill |
| Visitor privacy | Typed text ("my partner doesn't dive, I have 12 dives") is stored or leaked |
| Analytics integrity | Forged events skew the metrics that decide what to build |
| Secrets | API key or Supabase service key reaches the browser |

## What the gates contain

1. **The model's output has nowhere to put free text.** *Describe* returns only
   month numbers and IDs from closed lists. `normalizeTrip()` drops anything else and counts
   it. *Ask* returns only sentence numbers. `validateSelection()` keeps at most three
   distinct numbers that exist in that one record. So a successful injection can't make the
   page say something new: no leaked system prompt, no invented fact, nothing from another
   record. At worst it produces a wrong filter, which the diver sees and can edit, or a
   poorly chosen sentence, which is still verbatim and shown with its source check.
   *Test:* a hostile stand-in for Claude returns injected values, out-of-range and repeated
   sentence numbers, and schema-breaking output. Only closed-list values and real sentences
   survive, and schema-breaking output becomes a typed failure answered by the rules engine.
2. **No tools, no actions, no retrieval.** The model reads one prompt and returns
   structured output. It can't fetch, write, call anything, or see other visitors' data.
   The system prompt holds only public lists (destinations, animals, concern definitions),
   so extracting it would reveal nothing.
3. **Bounded input and output.** The validators cap text at 1,000 characters (describe),
   500 (ask) and 80 (destination ID), before any engine runs. `max_tokens` caps output at
   4,000. The rules engine handles the longest adversarial input in well under 100 ms.
4. **Spend is capped and fails closed.** Before each call, its worst case is reserved
   against per-session (20 an hour), per-address (60 a day) and site-wide (500 calls, $5 a
   day) limits under a row lock. Afterwards it's settled to the real cost. There's also a
   kill switch, and routes are opt-in. If the quota store is unreachable, Claude is off and
   the rules answer.
5. **Every failure has an answer.** Refusal, invalid output, timeout, API error, quota:
   the rules engine answers and the reason is logged. Availability never depends on Claude.
6. **Privacy by construction.** Raw text is never logged. The `llm_call` event records
   length, tokens, timing and versions, and a test checks every path. The address is kept
   only as an HMAC keyed with a server secret and the day. The session ID is random per
   tab. React renders all text as text, so markup in input can't execute.
7. **Server-only secrets, checked.** The Claude and Supabase-admin code lives in
   `*.server.ts`. A build check found no trace of the key names, the prompts or the quota
   RPC in the client bundle. The quota table and functions are denied to `anon` and
   `authenticated`, tested in embedded Postgres.
8. **Forged operational events are blocked.** Browsers can still log product events, but
   not `llm_call`, so spend and latency numbers can't be faked (same migration, tested).

## What they don't contain

- **A valid-but-wrong answer.** Injection or plain misunderstanding can set a wrong month,
  pick an irrelevant sentence, or abstain when the record does answer. The gates guarantee
  shape and provenance, not correctness. Correctness is what the evals measure, and why the
  filters stay visible and editable.
- **Distributed spend abuse.** Session IDs come from the client, so rotating them bypasses
  the per-session limit. Many addresses bypass the per-address limit. The site-wide $5 cap
  still holds: the attacker can switch Claude off for everyone until the day resets, but
  the product keeps working on rules. That's degradation, not an outage.
- **Third-party processing.** With a route on, the diver's text goes to Anthropic's API.
  The page says "Read by Claude" after the fact. It doesn't say beforehand that text leaves
  the site. *Open item: add one line under the box before switching a route on.*
- **Event spam in general.** Anonymous clients can insert unlimited product events
  (pre-existing), which can skew product metrics, though no longer the cost metrics. A
  payload size limit or server-side event logging would close this.
- **Semantic abuse of the curated data.** Feedback and operator suggestions are stored
  privately and published only after review. That's outside these two boxes, but it's the
  other place where visitor text enters the system.

## Measured on the rules path (2026-09-22, cases written first)

| | Result |
|---|---|
| Invariant violations (shape, closed lists, ≤ 3 real sentences of this record) | **0** across 44 cases |
| Describe your trip: expected safe behaviour | 24 / 27 |
| Ask: expected safe behaviour | 16 / 17 (abstained on 9 of 10 unanswerable) |

The four misses are keyword-parser limits, not gate failures:
- The parser obeys a dictated `"January"` inside a quoted JSON instruction.
- "Narnia **Reef**" sets a reef dive type.
- A past hotel mishap flags accommodation as unanswerable.
- "Weather in Paris?" on Komodo shows Komodo's weather sentence.

All five other-language cases pass only because the rules stay silent: safe, but useless.
These are the cases Claude is expected to handle. `bun evals/adversarial.ts llm` measures
that through the harness (dry run first). Until it runs, no claim is made.
