# Sightline

**An independent dive-trip reference. Describe your trip in your own words; it tells you where it actually fits, what the catch is, what the record says about your worries, and exactly where each claim comes from.**

Live: https://sightline-dive-planner.lovable.app

---

## The problem

The diver this is built for has 15–100 logged dives, one trip a year, a travel window they can't move, and one or two animals they badly want to see. Their expensive mistakes are predictable:

- **Wrong season.** They book the right place in the wrong month.
- **Wrong format.** A day-boat package can't reach the site the destination is famous for.
- **Beyond their skill.** The currents, depth or entries ask more than their experience covers.
- **Wrong kind of encounter.** It turns out to be baited, snorkel-only, or heard rather than met: Hawaii's humpbacks are "acoustic only for divers".

Operator pages don't warn about any of this. Everything is "great year-round".

Divers also have worries that no filter can hold: _I get seasick. My partner doesn't dive. I feel the cold. I only have 30 dives._ The researched records often answer these, but in their own words, not the diver's. Nobody writes "seasick"; they write "a 10–12 hour crossing" or "Dec–Mar swell cancels Manta Point".

Sightline's curated dataset already knew most of these catches, but only as prose buried on long detail pages. Before this work, the search also answered the core question wrongly:

- **The certification filter was an exact match.** An Advanced diver saw 12 of the 30 destinations they qualify for.
- **"Listed" was treated as "present".** Raja Ampat came up for whale sharks, although its own note says "you are booking the wrong itinerary".
- **"Mantas" was split across two species names.**
- **Filters vanished** when you opened a destination and came back.

## What it does now

1. **Describe your trip.** Type it the way you'd say it: _"Mantas in September. I'm Advanced with about 40 dives, I get seasick, and my partner snorkels. Is it expensive?"_
   - It becomes the ordinary filters (September, manta rays, Advanced) plus the worries (seasickness, non-diving partner). Everything stays editable.
   - It says plainly what it won't answer (_cost: Sightline holds no evidence on it_).
   - If you name destinations, it offers to compare them for your trip.
   - Claude reads the text once that route has passed its eval and is switched on; deterministic rules do it otherwise. The page says which one did.
2. **Trip fit.** Ranks destinations for the brief:
   - Good fits first.
   - Then fits with caveats, fewest first. Thin or disputed evidence counts as a caveat, so it can demote a destination but never promote one.
   - Each card shows the one catch that matters most, e.g. _Not an in-water encounter_, _Snorkel-only encounter_, _Limited access in Jan_, _Rough water_.
3. **Your worries count.** Thirteen diver concerns (seasickness, cold water, a non-diving partner, experience, currents, crowds, visibility, weather, permits and rules, remoteness, photography, depth, getting there):
   - Three change ranking, and only through facts that are exact in the data, as caveats: _Liveaboard only_ and _Rough water in {month}_ for seasickness, _Cold water in {month}_ for the cold, _No snorkel option_ for a non-diving partner. For example, for a seasick diver who wants mantas in September, Komodo and Raja Ampat are flagged for rough water that month and Nusa Penida isn't.
   - On every destination page, each concern gets the record's own sentences on it, quoted verbatim with their source check. When the record is silent, it says so.
4. **Close, but…** Instead of a dead-end "no results", you see destinations that break exactly one part of your brief, and when they would fit. For example: _Tubbataha · Closed in September · fits Mar–Jun_.
5. **For your trip.** On every destination page:
   - A verdict for each part of your brief.
   - The few notes in the record that bear on your trip, quoted verbatim: a median of 4 out of about 15.
   - **Ask about this destination.** Any question, answered with the record's own sentences, verbatim (at most two when Claude chooses them, three from the keyword fallback), or "this record doesn't answer that".
6. **Compare.** Shortlist two or three destinations and see them side by side against the same trip: each part of the brief, the catches, the facts, and what each record says about your worries. Month is switchable in place. Works at phone width.
7. **Source checks.** Key claims show whether their cited sources support them:
   - The status, the verbatim passage, and the date of the check.
   - When a claim was wrong, the page says it was corrected and why.
   - When sources disagree, both sides are shown.

All of this sits inside the original design: same components, same type, same palette, no chat window.

## Decisions, and the evidence behind them

Each decision below was made on evidence, and several reversed an earlier plan.

| Decision                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fix the deterministic search before adding any AI.**                          | Against 29 scenario briefs (24 written before the engine; 5 added later, each with a dated reason in the file), the shipped filter was fully correct on 11. The new engine gets 29. The wrong answers came from logic bugs, not missing intelligence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **The next gap was worries, not more filters.**                                 | The records address the 13 concerns far more than their vocabulary suggests: of 468 destination×concern pairs, 335 are covered by at least one sentence (845 relevant sentences). None of it was reachable: "seasick" appears in zero notes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Answers are extractive. The model selects; it never writes a fact.**          | This is a trust product. Every answer to a concern or question is the record's own sentences, with their source check, so a wrong answer is a wrong _choice of sentence_ that the diver can see, not an invented fact. It also makes answers measurable against labelled sentences.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **No vector search. A curated concern lexicon beats it by a wide margin.**      | On the untouched test split (18 destinations): lexicon finds relevant evidence for **93%** of covered concerns vs **33–44%** for local embedding models (bge-small, MiniLM) and **55%** for BM25 with the concern's definition as query. Ranking only, with no thresholds: hit@3 **97%** vs 72–84%; precision@1 **92%** vs 46–64%. Fusing the lexicon with either embedding model makes it _worse_.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Vector search is kept out of the product.**                                   | The lexicon also abstains correctly on **85%** of the 66 test pairs the record doesn't cover. Shipping an embedding model would add ~25 MB and a runtime model for a measured loss.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Claude reads trip descriptions; rules are the fallback, not the plan.**       | On 30 held-out descriptions written after the rules parser was frozen, rules get **97%** of fields right but find only **65%** of stated worries ("I've never dived dry", "she doesn't dive"). That gap is language understanding, the job an LLM does well. **Measured:** Claude's first, untuned run found **87%** (20 of 23) at 95% precision, and **100%** after one tuning round on dev (held-out errors had been viewed). The rules parser's 100% on the original 40 cases is dev data and isn't claimed.                                                                                                                                                                                                                                                                                                                                                                            |
| **Claude answers free-text questions by choosing sentence numbers.**            | The keyword fallback finds a relevant sentence for only **56%** of long-tail test questions, and **64%** of what it shows is on point. A destination record is ~30 sentences, so Claude reads all of it. A deterministic gate keeps only sentence numbers that exist. **Measured (test half):** Claude found a relevant sentence for all 28 answerable questions (rules 17) and abstained on all 8 it couldn't answer. But its first-run precision, **75%**, missed my pre-registered 80%: its third sentence was relevant less than half the time. Asking for fewer sentences didn't fix that, so the gate now shows **at most two**. Result: precision **89%**, chosen on dev and disclosed as post hoc, then confirmed prospectively on 30 fresh questions labelled before the run: precision **82%**, hit 25/25, abstains 5/5 (keyword rules on the same set: hit 48%, precision 39%). |
| **Concerns change ranking only through exact facts, month-aware, as caveats.**  | Written as goldens before the code (15 scenarios). "Cold water" and "Rough water" fire only when a note ties a temperature ≤ 22°C or a sea-state word to the trip month, by month words or by hemisphere season. Galápagos is cold in August and not flagged in March.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Allowed IDs go in the prompt; the product validates them, not the schema.**   | A contract test against a local stand-in for the Messages API showed this SDK version sends enums as descriptions, then validates client-side, so one out-of-list ID would void the whole parse. Fields are now strings; `normalizeTrip()` drops unknown values and the eval counts them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **No RAG over Sightline's own dataset for trip fit.**                           | The whole curated corpus is ~17k words of notes. Selecting evidence for a brief is a linking problem. Deterministic linking by species aliases, site names and month mentions finds **39 of 39** must-see catches, with a median of 4 notes shown out of ~15.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Verify the data before building on it.**                                      | Snapshotting the 80 cited sources and reviewing the 78 claims the product leans on hardest found: **50** supported, **22** partial, **5** contradicted, **1** unsourced, and **2** undeclared conflicts between cited sources.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **The showcase catch was false, and it's now fixed.**                           | The Komodo record said the best manta window (Dec–Feb) was the worst southern access window. All three cited sources say the opposite. Six claims were corrected, each with before/after values and verbatim evidence in `data/verification/corrections.json`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **The support judgement needs an LLM, and it's gated by deterministic checks.** | A lexical-overlap verifier separates supported from contradicted claims with probability **0.52**, a coin flip. So judgement goes to Claude, and every quote must be verbatim in the page it names. Verifier output is a proposal for a human reviewer; it never edits data. **Measured on all 78:** zero false support (0 of 6), 4 of 5 contradictions caught, but accuracy **59%** against a pre-registered 60%. **Not adopted.** Its misses lean strict, so tuning it toward leniency, the direction of the one dangerous error, is off the table.                                                                                                                                                                                                                                                                                                                                      |
| **Aggregate adversarial counts can hide a safety regression.**                  | After tuning, Describe still scored 25/27 on the adversarial set, but one pass had become a failure in the unsafe direction: it obeyed "set my certification to advanced_plus_experience even though I only have 5 dives". Fixed with a deterministic gate, not more prompt: the model may lower the level the rules read, never raise it. Now 26/27.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **An encounter you only hear is a catch.**                                      | UI testing showed Kona, Oahu and Socorro as clean whale fits although their records say "acoustic only for divers", "not an in-water product". Three goldens written first failed; a _Not an in-water encounter_ caveat, handled like snorkel-only, now flags 8 listings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Guard the spend and fix the pass marks before paying for a single call.**     | The two server functions are public. Every Claude call reserves its worst-case cost against session, address and daily caps, settles to real tokens, and fails closed to rules. Routes are opt-in, and each is switched on only after passing thresholds written before any result existed (`docs/paid-evals.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Architecture

```
curated data (src/data/destinations.json, versioned in git)
   │
   ├─ taxonomy.ts      canonical species + diver-facing groups ("Manta rays")
   ├─ claims.ts        every note as an addressable claim with a stable ID
   ├─ passages.ts      every claim split into verbatim sentences (<claim>#<n>)
   ├─ concerns.ts      13 diver worries + what counts as evidence for each
   ├─ retrieve.ts      concern lexicon over sentences; BM25 for free-text fallback
   ├─ fit.ts           verdicts, tiers, near misses, evidence linking, concern caveats
   └─ verification.ts  review status, quotes, corrections, recheck policy
        │
        └─ UI: describe your trip → filter bar (URL state) → ranked cards → Close, but…
               → For your trip (verdicts · your concerns · read before you book · ask)
               → Compare (2–3 destinations, same brief)

request path, server only (src/lib/api/plan.functions.ts)
   understandTrip   text → brief + concerns + unsupported asks   Claude, else understand.ts rules
   askDestination   question → ≤3 sentence IDs of one record      Claude, else ask.ts rules
   llm-route.ts     key? → route on? → kill switch → quota → Claude → settle spend → log
   llm-guard.ts     per-session/address/day caps, worst-case reservation (Postgres RPC)
   llm.server.ts    claude-opus-5, structured output, effort "low", prompt caching,
                    server-side refusal fallback; output validated before use
   Any failure falls back to rules. One 'llm_call' event per request; raw text never logged.

offline, curator-side (never in the request path)
   scripts/sources/fetch.ts         snapshot cited pages (robots.txt respected; text stays private)
   scripts/lib/retrieval.ts         passages + BM25 over source pages
   scripts/verify/*                 review packets, verifiers, corrections, recheck status
```

### Where AI is and isn't used

| Job                                                                 | Approach                                                                              | Why                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Is the animal there in my month? Is it open? Is it within my level? | Structured data + deterministic rules                                                 | Exact, testable, instant.                                                               |
| Ranking                                                             | Deterministic tiers                                                                   | Explainable; confidence and concerns can only demote.                                   |
| Which notes matter for this brief                                   | Deterministic linking (aliases, sites, months)                                        | 39/39 catches; no model needed.                                                         |
| Which sentences answer a known concern                              | Curated lexicon, measured                                                             | Beats BM25 and embeddings by 38+ points on held-out data.                               |
| Turning a trip description into a brief                             | Claude (rules fallback), passed its eval                                              | Worries are stated indirectly: rules find 65%, Claude 87% (first run) and 100% (tuned). |
| Answering a free-text question                                      | Claude picks up to two sentence numbers (rules fallback), passed after a post-hoc cap | Hit 100% vs 61% for rules; precision 89% vs 69%.                                        |
| Writing any fact the diver reads                                    | Never a model                                                                         | Every answer is a verbatim sentence with its source check.                              |
| Does the source support the claim?                                  | Human reviewer; Claude verifier measured, not adopted                                 | Lexical baseline at chance; Claude 59% vs a 60% bar, with zero false support.           |
| Deciding what ships in the data                                     | Human reviewer                                                                        | Verifier output is a proposal.                                                          |
| Cost, hotels, visas, operator quality                               | Not answered, and said so                                                             | No evidence in the corpus.                                                              |

## Evaluation

```bash
bun run test                  # 209 tests: goldens, properties, evidence, verification, retrieval gates,
                              #   parser floors, LLM contract + gates, spend guard (incl. the migration in
                              #   embedded Postgres), eval harness, adversarial set, pinned results
bun run eval                  # all reports below, deterministic paths
bun evals/concerns.ts --dense # adds the local embedding-model comparison (downloads two small models once)
bun run eval:llm:dry          # Claude evals: exact prompts + cost estimate, nothing sent
bun run eval:llm:replay       # re-score cached Claude responses, free
bun evals/cost-model.ts       # cost and latency model from the real requests (estimates)
bun run label                 # blind second-labeller page; then: bun run agreement
```

The paid runs, one command each, with their pass marks: [`docs/paid-evals.md`](docs/paid-evals.md).
Also: [threat model](docs/threat-model.md) · [cost model](docs/cost-model.md) ·
[experiment plan](docs/experiment-describe.md) · [metrics](docs/metrics.sql).

```bash
# e.g. the first paid run, after the dry run:
bun evals/understand.ts llm --limit 3 --max-usd 0.5
```

| Component                                                                                           | Result                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scenario goldens (29 briefs across four journeys)                                                   | trip fit 29/29 · shipped filter 11/29                                                                                                                                            |
| Concern scenarios (15, written before the rules)                                                    | 15/15                                                                                                                                                                            |
| Critical catches surfaced                                                                           | 39/39, median panel 4 notes                                                                                                                                                      |
| Concern evidence, test split (234 pairs)                                                            | lexicon: hit 93% · precision@3 81% (top sentence 90%) · abstains 85%                                                                                                             |
| … baselines on the same split                                                                       | BM25 33–55% hit · bge-small 33% · MiniLM 44% · lexicon+embedding fusion 80–88%                                                                                                   |
| Describe your trip, held-out (30)                                                                   | rules: fields 97% · worries 65% (precision 94%) · **Claude:** worries **87%** first run (precision 95%), **100%** tuned (precision 92%) · other fields 99% · p95 4.7 s           |
| Ask a destination, test half (36)                                                                   | rules: hit 61% · precision 69% · abstains 7/8 · **Claude:** hit **100%** · precision 75% first run, **89%** with the two-sentence cap · abstains 8/8 · p95 3.4 s                 |
| Ask, confirmation set (30 fresh questions, labelled before the run)                                 | rules: hit 48% · precision 39% · abstains 4/5 · **Claude: hit 100% · precision 82% · abstains 5/5** · p95 2.8 s                                                                  |
| Adversarial inputs (44: injection, off-topic, abuse, long, other languages, made-up places, markup) | 0 invariant violations for both · expected behaviour: rules 24/27 describe, 16/17 ask · **Claude 26/27, 17/17** (all five other languages read correctly)                        |
| Claude integration contract (local mock)                                                            | request shape, caching, validation, refusals and fallback: pass; a hostile stand-in never gets past the gates                                                                    |
| Blind re-labelling, 60 concern pairs (**test–retest, same labeller** — not a second annotator)      | pairs κ **0.61** [0.33, 0.84] · sentences κ **0.64** [0.51, 0.77] · observed 88% / 93% · positive agreement 68% · the later pass marked 236 sentences relevant to the gold's 134 |
| Source-passage retrieval (92 gold quotes)                                                           | BM25 R@5 95% · no-retrieval baseline 41%                                                                                                                                         |
| Lexical verifier (78 reviewed claims)                                                               | 35% accuracy · separability 0.52                                                                                                                                                 |
| Claude verifier (78 reviewed claims)                                                                | false support 0/6 · contradictions 4/5 · accuracy 59% (bar: 60%, not adopted) · 1 fabricated quote in 376                                                                        |
| Paid evaluation, all runs                                                                           | **$7.78** of a $15 cap (worst-case reservation in the harness)                                                                                                                   |

**Rules the evals follow:**

- Gold was written before the code it tests; later additions are marked and dated. The concern gold is exhaustive: every one of 1,095 sentences was judged against all 13 concerns, so an empty label means the record is silent.
- Split by destination: the lexicon was tuned on the dev half only. Its first, untuned test score (hit 89%, precision 83%) is recorded alongside the tuned one.
- When a set has been seen, it's labelled as such: the rules parser's original gold is dev data, and one post-hoc routing rule in the ask fallback (format words → access evidence) was added after the test half had been inspected. It helps real format questions and costs one off-record case; both numbers are reported.
- Hard gates (false support, hallucinated quotes, invalid sentence numbers) are reported separately and never averaged into an accuracy number.
- Claude's pass marks were written before any Claude result existed. Paid responses are cached, so each is bought once and every re-score is free. Any prompt tuning happens on dev splits, and the first untuned test number is reported next to the final one.
- Every number quoted here, on the About page and in `portfolio/` is pinned by `evals/about-results.test.ts`.

**Known limitations of the evidence:**

- **Claude is measured on test cases, not on visitors.** The Describe and Ask test sets are small (30 descriptions, 36 questions). The tuned Describe numbers come after held-out errors had been viewed, so its untuned first run is the clean number; Ask's cap was confirmed prospectively on a fresh labelled set. Both routes went live on 2026-09-22 after passing; their behaviour is watched with `docs/metrics.sql` queries 13–16, and no live-traffic number is claimed here.
- **One regression is left in the tuned Describe prompt.** An example I added ("reef fish is not dive_type reef") made it drop a real "easy reef" request on held-out data. It isn't patched, because fixing an error seen on held-out data would contaminate that set.
- **One labeller, with AI assistance, who also wrote the lexicon.** The concern gold and the lexicon share a notion of relevance. The dev/test split guards against tuning, not against that. The 60-pair sample has now been re-labelled blind (`bun run label`), but by the same person two days later, so κ 0.61 on pairs and 0.64 on sentences measures how repeatable that person's notion of relevance is — **not** that anyone else shares it. This limitation stands until someone else labels the sample. The re-label was also the more inclusive pass (236 relevant sentences to 134; it added 7 pairs and dropped none), so the gold is the stricter of the two, and the 93% concern hit rate is measured against the stricter one.
- **Two surface swims aren't marked.** Fakarava's humpbacks and the Ribbon Reefs minkes are snorkel encounters whose records carry no SNORKEL ONLY marker, so they aren't flagged as snorkel-only.
- **Seasickness is the weakest concern** (hit 75%); boat time is often implied by format rather than stated.
- **Month-aware caveats depend on notes naming months.** "Winter water drops to 21–23°C" works by hemisphere; a cold spell described without any month word is shown as evidence but doesn't flag.
- **Water temperature is an annual range** in the data; the compare view says "across the year" for that reason.
- **Partial verification coverage.** 78 of 495 claims are source-checked.

## Keeping it honest over time

- **Freshness.** Re-running `fetch.ts` hashes every source. A review whose source changed is marked _source changed since it was checked_. Access and cert claims come due for recheck after 12 months, everything else after 36.
- **Corrections.** "Something's off" on any panel lands in the `feedback` table and follows the same path as the Komodo fix: review packet → review → `corrections.json` → `apply-corrections.ts` → evals → deploy.
- **Measurement.** `docs/metrics.sql` holds one query per product question, including what worries divers raise, what they ask for that Sightline can't answer, how often "the record doesn't say" per destination (the curation queue), and whether comparing leads to a qualified shortlist. Queries 13–16 watch the Claude routes (who answered and why, latency, spend against the cap, discarded output), and 17–18 are the readout for the planned A/B. Every query runs in CI against the migrated schema. Ratings are never used as correctness labels.

## What's next

1. **Watch the two live routes.** Both went on 2026-09-22 (quota migration applied; key and `SIGHTLINE_LLM_ROUTES=understand,ask` set). The first production call read "I've never dived dry and my wife doesn't dive" as cold, experience and non-diver in 3.0 s for $0.034 including the cache write. Read queries 13–16 weekly: who answered and why, latency, spend against the cap. Read **19–20** with them: the feedback and “suggest an operator” forms write to tables with an insert policy and no read policy, and nothing emails anyone, so a submission is only ever seen if someone runs the query. Have a second reviewer adjudicate the verifier's 25 supported-vs-partial disagreements (`data/verification/adjudication-supported-vs-partial.md`).
2. **An independent labeller**, then **external-diver review.** The 60-pair sample has been re-labelled blind and scored (κ 0.61 pairs, 0.64 sentences), but by the gold's own author, so it measures repeatability rather than independence. Someone else labelling the same frozen sample would settle it, and the sample and tooling are ready (`bun run label`). Then 3–5 divers who fit the target profile try the product in a task-based session: at current traffic this answers the A/B's question months sooner (`docs/experiment-describe.md`).
3. **Promote the curator's markers to schema fields.** "SNORKEL ONLY", "BAITED", not-in-water encounters, format reach ("only liveaboards reach the south"), and monthly water temperature.
4. **Extend verification** beyond 78/495 claims, prioritising the sentences most often shown as concern evidence.

## Development

Built with TanStack Start (React 19, SSR) and Supabase, via [Lovable](https://lovable.dev/projects/ef4e86eb-5313-4472-8309-360be9180cf9). Changes pushed to `main` sync back to Lovable.

```bash
bun install
bun run dev         # http://localhost:8080
bun run typecheck
bun run build
```

Claude is off unless all of these hold: `ANTHROPIC_API_KEY` is set (server-side only), the route is listed in `SIGHTLINE_LLM_ROUTES` (`understand`, `ask`), the `llm_quota` migration is applied, and `SIGHTLINE_LLM_KILL_SWITCH` is unset. Limits are tunable (`SIGHTLINE_LLM_DAILY_USD`, default $5; see `src/lib/llm-runtime.server.ts`). Otherwise everything runs on the deterministic rules.

CI (`.github/workflows/ci.yml`) runs the typecheck and the test suite on every pull request and push to `main`.

Source snapshots live in `data/.source-cache/` and are never committed: page text belongs to its publishers. Only hashes, fetch status and short quotes (≤ 25 words) are in the repo.
