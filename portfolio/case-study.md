# Sightline: a dive-trip reference that shows its work

*Case study · product and applied AI · 2026*

## The problem

The diver I built this for has somewhere between 15 and 100 logged dives, one big trip a
year, a travel window they can't move, and an animal they badly want to see. Their
expensive mistakes are predictable. They book the right place in the wrong month. They book
a day boat that can't reach the famous site. They sign up for currents beyond their
experience. Or they discover on arrival that the encounter is baited, snorkel-only, or, as
I found later, only heard, never seen.

Operator pages don't warn about any of this. Sightline's curated dataset knew most of these
catches, but only as prose buried on long detail pages. Divers also carry worries no filter
can hold: *I get seasick. My partner doesn't dive. I feel the cold.* The records often
answer these, but in their own words. Nobody writes "seasick". They write "a 10–12 hour
crossing".

## Decisions, and the evidence behind them

**Fix the search before adding AI.** My first plan was to put a language model in front of
the search. Before building anything, I wrote 29 trip scenarios across four user journeys,
each with the destinations that should and shouldn't appear. The shipped search got 11 of
29 fully right. The failures were logic, not intelligence. The certification filter was an
exact match, so an Advanced diver saw only 12 of the 30 destinations they qualify for.
"Listed" was treated as "present". "Mantas" was split across two species names. A rebuilt
deterministic engine gets 29 of 29. It puts good fits first, then fits with caveats, and it
replaces dead-end "no results" with near misses such as *Tubbataha · closed in September ·
fits Mar–Jun*.

**The next gap was worries, not more filters.** I labelled every one of the dataset's 1,095
sentences against 13 diver concerns. 335 of 468 destination–concern pairs are answered
somewhere in the records, yet the word "seasick" appears nowhere. The evidence existed and
was unreachable.

**No vector search, because I measured it.** I expected embeddings to win. On destinations
kept out of tuning, a curated concern vocabulary found relevant evidence for 93% of covered
worries. Two embedding models found 33–44%, and BM25 33–55%. The vocabulary also said "the
record doesn't cover this" correctly 85% of the time. Fusing it with embeddings (RRF) made
it worse, at 80–88%. So the product ships no embedding model: that would have been about
25 MB for a measured loss.

**Answers are extractive.** This is a trust product. Every answer to a worry or a question
is the record's own sentences, quoted verbatim with their source check. When Claude is on,
it chooses sentence numbers, and a deterministic gate keeps at most three that exist in that
one record. A wrong answer is then a visible wrong choice of sentence, not an invented fact.

**The model does the one job rules can't.** On 30 held-out trip descriptions, keyword rules
got 97% of fields right but found only 65% of stated worries ("she doesn't dive", "I've
never dived dry"). That gap is language understanding. So Claude reads free text into the
same editable filters, and the rules parser is the fallback.

## What I built

- A **trip-fit engine** with verdicts per part of the brief, caveats that can demote a
  destination but never promote it, and near misses with the months they would fit.
- **Concern evidence** on every destination page, plus caveats in the ranking where the
  data is exact, such as *Rough water in September* for a seasick diver.
- **Describe your trip**, **Ask about this destination** (Claude behind validation gates)
  and **Compare**.
- **Source verification.** I snapshotted the 80 cited pages and reviewed the 78 claims the
  product leans on hardest. Five were contradicted, including the product's showcase catch:
  the Komodo record put the best manta window in the worst access window, and all three
  cited sources say the opposite. Six claims were corrected with before/after values and
  verbatim evidence.
- **Production guardrails before any spend.** Per-session, per-address and daily spend caps
  reserve worst-case cost under a row lock and settle to actual tokens. There's a kill
  switch, and routes are opt-in. Every failure falls back to rules. Telemetry records tokens,
  latency, cost and prompt version, never what the visitor typed.

## How it's evaluated

Gold labels were written before the code they test, tuning used a dev split, and results
are reported on held-out data. Hard gates, like false support, invented quotes and invalid
sentence numbers, are reported separately rather than averaged into an accuracy. The
published numbers are pinned by a test that fails CI if they drift.

For the Claude paths I built the evaluation before paying for it. A record/replay harness
means each response is paid for once and re-scored free. A dry run prints the exact prompts
and estimates cost at about $6–18 for all four evals. The adoption thresholds were written
down before any result existed. A 44-case adversarial suite (injection, off-topic, abuse,
other languages, invented places) shows zero safety-rule violations on the rules path, and a
hostile stand-in for Claude shows the gates hold whatever the model returns.

## What failed, or changed my mind

- **The headline example was false.** The goldens had encoded the dataset's own error about
  Komodo. Source verification corrected the data, and three scenario expectations were
  updated with a dated note.
- **A lexical verifier was a coin flip.** It separated supported from contradicted claims
  with probability 0.52. Judging support needs a model, gated so that every quote must
  appear verbatim in the page it names.
- **The SDK sends enums as descriptions,** then validates client-side, so a single
  out-of-list ID voided a whole parse. A contract test against a local stand-in caught this,
  and validation moved into the product.
- **Whales ranked as clean fits where divers never meet them.** Oahu's record says "acoustic
  only for divers". I wrote goldens first, then added a *Not an in-water encounter* caveat.
- **My caching assumption was wrong at small scale.** The cost model showed that caching the
  trip prompt only pays above about 4,000 visitors a month.
- **The obvious A/B metric was biased.** Dividing by "sessions with a brief" would compare
  groups the feature itself selects, so the plan divides by exposed sessions.

## Limitations

- **The Claude paths aren't measured yet.** They're built, contract-tested and guarded; the
  paid runs come next, and no claim is made until then.
- **One labeller, with AI assistance,** wrote the concern gold and the lexicon. A blind
  second-labeller tool with Cohen's kappa is built, but the labels aren't in yet.
- **Coverage is partial.** 78 of 495 claims are source-checked.
- **All results are test results.** None of them are usage data.

## Next steps

Run the four paid evals under the pre-registered rules, and switch on only the routes that
pass. Get the second labeller's kappa. Put the product in front of five divers who fit the
profile before running an A/B, because at current traffic the A/B would take months to
detect a realistic effect.
