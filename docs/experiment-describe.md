# Experiment plan: "Describe your trip" vs filters only

Status: **plan only**. No traffic yet, and the assignment code isn't built. It's about an
hour's change once traffic justifies it (see "When to run it").
Written 2026-09-22; the decision rules below are fixed before any data exists.

## Question

Does offering "Describe your trip" help divers reach a trip they'd book, compared with the
filters alone? The feature costs money per use when Claude reads the text. It adds a second
way to do the same thing. It's the only way a worry typed in plain words ("I get seasick")
reaches the ranking. If it doesn't move people to a shortlist, it should earn its place some
other way or go.

**Hypothesis.** Showing the box raises the qualified-shortlist rate: starting from words
instead of five dropdowns gets more people to a brief, and the worries they mention surface
the catches that make a shortlist trustworthy.

## Design

| | |
|---|---|
| Arms | **Control:** filters only (the box hidden). **Treatment:** the current page, box above the filters. 50/50. |
| Unit of assignment | **Visitor**: a random ID in `localStorage`, hashed with the experiment name `describe-v1`. Not the per-tab session, which would let one person see both arms. |
| Exposure | An `experiment_exposure {experiment, arm}` event when the search section renders, in both arms. Only exposed sessions are analysed (triggered analysis). |
| Engine inside the box | Whichever route passed its eval (`docs/paid-evals.md`), fixed for the whole test. Switching engines mid-test starts a new experiment version. |
| Readout | `docs/metrics.sql` query 17 (metrics by arm) and 18 (sample-ratio check). Both run in CI against the migrated schema. |

## Metrics

**Primary: qualified-shortlist rate among exposed sessions.** A session counts if it made a
brief (`fit_results`), opened a "For your trip" panel (`fit_panel_view`), and followed the
evidence (`click_source`, `verification_open` or `concern_evidence_open`). That's query 6's
definition with one deliberate change. **The denominator is exposed sessions, not sessions
with a brief.** The treatment itself changes who makes a brief, so dividing by briefed
sessions would compare two differently selected groups.

*Fixed while writing this plan:* operator links weren't instrumented, although query 6's
comment counted them as evidence. They now log `click_source`. Queries 6 and 12 also
disagreed on whether concern evidence counts, and now both include it.

**Secondary (explain the primary; don't decide it):** brief rate · concerns raised per
exposed session (control can only toggle them, treatment can also type them) · compare
opens · empty parses (query 8).

**Guardrails (any breach stops the test and rolls back to control):**

| Guardrail | Threshold |
|---|---|
| Empty-result rate among briefed sessions | no rise of more than 3 points |
| "Something's off" rate | no significant rise (one-sided, α 0.05) |
| Describe p95 latency (query 14) | ≤ 6 s |
| Claude fallback rate (query 13) | ≤ 5% |
| Spend (query 15) | within `SIGHTLINE_LLM_DAILY_USD` |
| Sample ratio (query 18) | chi-square p ≥ 0.001; sessions in both arms < 1% |

## Sample size

The baseline rate is unknown until there is traffic. Two-sided α 0.05, power 0.80,
unpooled two-proportion test (`bun evals/experiment-power.ts`):

| Baseline | +20% relative | +30% relative | +50% relative |
|---|---|---|---|
| 5% | 8,155 per arm | 3,778 | 1,468 |
| 10% | 3,839 | 1,772 | 683 |
| 20% | 1,680 | 769 | 291 |

Smallest lift detectable at a 10% baseline: 500 sessions per arm → +59% relative;
2,500 → +25%; 5,000 → +17%.

**Procedure.**
1. Before the test, measure the baseline from 2–4 weeks of ordinary traffic (query 6 with
   exposed sessions as the denominator).
2. Fix the duration: sessions needed ÷ weekly exposed sessions, at least two full weeks so
   both weekday and weekend patterns appear.
3. Don't stop early on the primary. Guardrails are monitored daily and are the only reason
   to stop before the end.

## When to run it

At portfolio traffic (hundreds of sessions a month), even a +50% effect at a 10% baseline
needs about 1,400 exposed sessions: several months for an answer. So:

- **Run the A/B once traffic can detect +30% within eight weeks**: about 450 exposed
  sessions a week at a 10% baseline.
- **Until then, answer the question qualitatively**. Five divers who fit the target profile
  each plan a trip with a fixed constraint and a stated worry, once with each version, in
  alternating order. Measure task success (did they reach a destination that fits and name
  its catch?), time to first shortlist, and what they say. This is the external-diver review
  already in the README's next steps. Treat funnel numbers as directional in the meantime.

## Analysis and decision

The primary result is the difference between the arms in qualified-shortlist rate, with a
95% interval. If more than 10% of visitors have several sessions, analyse per visitor (a
visitor qualifies if any of their sessions does) rather than per session.

| Result | Decision |
|---|---|
| Primary up (interval above 0), no guardrail breached | Keep the box for everyone |
| Primary flat (interval includes 0), guardrails fine | Keep it only if concerns raised per session are clearly higher, because capturing worries is the job only the box does. Otherwise remove it and put its Claude budget elsewhere. |
| Primary down, or any guardrail breached | Roll back to filters only; read parse failures (queries 8, 16) and "something's off" first |

## Threats to validity

- **Novelty.** Run at least two weeks and compare week 1 with week 2 in the treatment arm.
- **Bots.** Events are anonymous. Exclude sessions with implausible event rates before
  reading results, using the same rule in both arms.
- **Shared links.** A brief lives in the URL. A control visitor opening a link a treatment
  visitor made gets a brief without the box. That's still the control experience, so it
  stays in the analysis.
- **Flicker.** Assignment lives in `localStorage`, which the server can't read. Render the
  box after mount in both arms so no one sees it appear and disappear.

## To build when it's time

- A visitor ID in `localStorage`, and `assign(visitorId, "describe-v1")`.
- `experiment_exposure` added to `EventType`.
- A prop that hides `TripDescriber` in the control arm.
- A kill switch: an env flag that forces everyone into the treatment.
