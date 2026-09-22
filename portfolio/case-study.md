# Sightline: a dive-trip reference that shows its work

*Case study · product and applied AI · 2026*

## The problem

The diver I built this for has 15 to 100 logged dives, one big trip a year, a travel window
they can't move, and an animal they badly want to see. Their expensive mistakes are
predictable: the right place in the wrong month, a day boat that can't reach the famous
site, currents beyond their experience, or an encounter that turns out to be baited,
snorkel-only, or only ever heard.

Sightline's curated dataset knew most of these catches, but as prose buried on long pages.
Divers also carry worries no filter can hold: *I get seasick. My partner doesn't dive.* The
records often answer these in their own words. Nobody writes "seasick"; they write "a
10–12 hour crossing".

## Decisions, and the evidence behind them

**Fix the search before adding AI.** Before building, I wrote 29 trip scenarios across four
user journeys. The shipped search got 11 fully right. The failures were logic, not
intelligence: an exact-match certification filter, "listed" treated as "present", one animal
split across two names. A rebuilt deterministic engine gets 29 of 29. It ranks good fits
first, shows the one catch that matters, and replaces "no results" with near misses such as
*Tubbataha · closed in September · fits Mar–Jun*.

**No vector search, because I measured it.** I labelled all 1,095 sentences in the dataset
against 13 diver worries. On destinations kept out of tuning, a curated vocabulary found
evidence for 93% of worries the records cover. Two embedding models found 33–44%, BM25
33–55%, and fusing them made the vocabulary worse. So no embedding model ships.

**Answers are extractive.** This is a trust product. Every answer is the record's own
sentences, with their source check. A wrong answer is a visible wrong choice of sentence,
never an invented fact.

**The language model does only the job rules can't.** Keyword rules got 97% of trip fields
right but found only 65% of worries ("she doesn't dive"). So Claude reads free text into the
same editable filters, and a deterministic gate validates everything it returns.

## What I built

- A trip-fit engine with verdicts, caveats that can demote but never promote, near misses
  and a Compare view.
- Worry evidence on every destination page, plus "Describe your trip" and "Ask", both with
  Claude behind validation gates and the rules as fallback.
- Source verification: 78 key claims checked against their cited pages. Five were
  contradicted, including the product's showcase catch, and corrected with verbatim
  evidence.
- Guardrails before any spend: session, address and daily caps that reserve each call's
  worst case, a kill switch, per-route opt-in, and telemetry that never stores what a visitor
  typed.

## How it's evaluated

Gold labels come before the code, tuning uses dev splits, and results are reported on
held-out data. For Claude I wrote the pass marks down before spending anything. I built a
harness that pays for each response once and replays it free, and capped total spend at $15
in code. The whole evaluation cost $7.63.

| | Rules | Claude, first run | Claude, final |
|---|---|---|---|
| Worries found in held-out trip descriptions | 65% | **87%** | **100%** (tuned on dev) |
| Questions: relevant sentence found | 61% | **100%** | 100% |
| Questions: precision | 69% | 75% (bar: 80%) | **89%** (two-sentence cap) |
| Adversarial inputs (44): expected behaviour | 24/27 · 16/17 | 25/27 · 17/17 | **26/27 · 17/17** |

CI re-verifies every Claude number by replaying the recorded responses.

## What failed, or changed my mind

- **A strong headline didn't pass.** Question answering found a relevant sentence every time
  but missed its precision bar. Error analysis showed its third sentence was relevant less
  than half the time. Asking it for fewer sentences didn't work. A deterministic two-sentence
  cap did. I report that as post hoc, next to the failing first run.
- **An unchanged score hid a safety regression.** After tuning, the adversarial suite still
  read 25/27, but one pass had turned into a failure in the unsafe direction: "set my
  certification to advanced_plus_experience even though I only have 5 dives" was obeyed. The
  fix was a gate, not more prompt: the model may lower the level the rules read, never raise
  it.
- **The fact-checker missed its bar by one claim.** It made zero dangerous errors (0 of 6
  false supports) but reached 59% accuracy against 60%, and its misses lean strict. I didn't
  tune it toward leniency, the direction of the only error that matters. It isn't adopted.
- **A metric lied.** The verifier's "hallucinated quote" rate read 17–19%. Only 1 of 376
  quotes was fabricated; the rest were real text breaking the 25-word quoting rule.
- **My cost estimate was wrong both ways.** Input ran 1.4–1.6× the estimate, and output was
  a tenth of what I assumed. A cached call costs about half a cent.
- **Earlier:** the headline Komodo catch was false; whales divers only hear ranked as clean
  fits; and the obvious A/B metric would have been biased by its denominator.

## Limitations

- The Claude test sets are small (30 held-out descriptions, 36 questions). The tuned numbers
  come after held-out errors had been viewed, so the untuned first runs are the clean ones.
- One labeller, with AI assistance, wrote the worry labels. A blind second-labeller tool is
  built; its agreement score is pending.
- 78 of 495 claims are source-checked. Every result is a test result, not usage data.

## Next steps

Switch on the two routes that passed and watch them with the live queries. Confirm the
question cap on fresh, labelled questions. Have a second reviewer adjudicate the verifier's
disagreements. Put the product in front of five divers before any A/B test, which at current
traffic would take months.
