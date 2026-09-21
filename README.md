# Sightline

**An independent dive-trip reference that tells you where your trip actually fits, what the catch is, and exactly where each claim comes from.**

Live: https://sightline-dive-planner.lovable.app

---

## The problem

The diver this is built for has 15–100 logged dives, one trip a year, a travel window they can't move, and one or two animals they badly want to see. Their expensive mistakes are predictable:

- **Wrong season.** They book the right place in the wrong month.
- **Wrong format.** A day-boat package can't reach the site the destination is famous for.
- **Beyond their skill.** The currents, depth or entries ask more than their experience covers.
- **Wrong kind of encounter.** It turns out to be baited, or snorkel-only.

Operator pages don't warn about any of this. Everything is "great year-round".

Sightline's curated dataset already knew most of these catches, but only as prose buried on long detail pages. Before this work, the search also answered the core question wrongly:

- **The certification filter was an exact match.** An Advanced diver saw 12 of the 30 destinations they qualify for.
- **"Listed" was treated as "present".** Raja Ampat came up for whale sharks, although its own note says "you are booking the wrong itinerary".
- **"Mantas" was split across two species names.**
- **Filters vanished** when you opened a destination and came back.

## What it does now

1. **Trip fit.** You tell it the month, the animals, your certification and the most current you're comfortable with. It ranks destinations by fit:
   - Good fits first.
   - Then fits with caveats, fewest first. Thin or disputed evidence counts as a caveat, so it can demote a destination but never promote one.
   - Each card shows the one catch that matters most, e.g. *Snorkel-only encounter* or *Limited access in Jan*.
2. **Close, but…** Instead of a dead-end "no results", you see destinations that break exactly one part of your brief, and when they would fit. For example: *Tubbataha · Closed in September · fits Mar–Jun*.
3. **For your trip.** On every destination page:
   - A verdict for each part of your brief.
   - The few notes in the record that bear on your trip, quoted verbatim: a median of 4 out of about 15.
4. **Source checks.** Key claims show whether their cited sources support them:
   - The status, the verbatim passage, and the date of the check.
   - When a claim was wrong, the page says it was corrected and why.
   - When sources disagree, both sides are shown.

All of this sits inside the original design: same components, same type, same palette, no chat window.

## Decisions, and the evidence behind them

Each decision below was made on evidence, and several reversed an earlier plan.

| Decision | Evidence |
|---|---|
| **Fix the deterministic search before adding any AI.** | Against 26 scenario briefs (24 written before the engine; 2 added later, each with a dated reason in the file), the shipped filter was fully correct on 10. The new engine gets 26. The wrong answers came from logic bugs, not missing intelligence. |
| **No RAG over Sightline's own dataset.** | The whole curated corpus is ~19k words and fits in one prompt. Selecting evidence for a brief is a linking problem: catches sit across species, highlight, format and experience notes. Deterministic linking by species aliases, site names and month mentions finds **39 of 39** must-see catches, with a median of 4 notes shown out of ~15 (ablation: 95% → 97% → 100%). |
| **Verify the data before building on it.** | Snapshotting the 80 cited sources and reviewing the 78 claims the product leans on hardest found: **50** supported, **22** partial, **5** contradicted, **1** unsourced, and **2** undeclared conflicts between cited sources. |
| **The showcase catch was false, and it's now fixed.** | The Komodo record said the best manta window (Dec–Feb) was the worst southern access window. All three cited sources say the opposite: the south is rough mid-May to early September and at its best mid-November to March. Six claims were corrected, each with before/after values and verbatim evidence in `data/verification/corrections.json`. The page says so. |
| **Claim-as-query retrieval is confirmation-biased, so the verifier reads whole pages.** | Claim-scoped BM25 finds the supporting passage in the top 5 for 95% of gold quotes, but it misses precisely the facts that refute or sharpen a claim. Examples: Hanifaru's scuba ban, Komodo's access window, Socorro's April–June whale sharks. A wrong claim doesn't resemble the text that refutes it. Cited pages are small (median 16 passages), so the verifier reads them whole. Retrieval is kept for pinpointing the quote a diver sees, and for long documents. |
| **The support judgement needs an LLM, and it's gated by deterministic checks.** | A lexical-overlap verifier ranks supported claims above contradicted ones with probability **0.52**, a coin flip: contradicted claims share their refuters' vocabulary. So judgement goes to Claude, and every quote must be verbatim in the page it names or it is rejected and counted. Verifier output is a proposal for a human reviewer; it never edits data. |
| **Defer "describe your trip in words".** | The filter bar already captures the structured brief. Free text mainly adds soft concerns (crowds, boat time, seasickness), and the evidence for those is thin and unverified. A parser would mostly produce confident-sounding abstentions. Revisit once coverage of those notes is verified. |

## Architecture

```
curated data (src/data/destinations.json, versioned in git)
   │
   ├─ taxonomy.ts      canonical species + diver-facing groups ("Manta rays")
   ├─ claims.ts        every note as an addressable claim with a stable ID
   ├─ fit.ts           deterministic verdicts, tiers, near misses, evidence linking
   └─ verification.ts  review status, quotes, corrections, recheck policy
        │
        └─ UI: filter bar (URL state) → ranked cards → Close, but… → For your trip

offline, curator-side (never in the request path)
   scripts/sources/fetch.ts         snapshot cited pages (robots.txt respected; text stays private)
   scripts/lib/retrieval.ts         passages + BM25
   scripts/verify/packets.ts        review packets
   scripts/verify/verifiers.ts      lexical baseline · Claude verifier · verbatim-quote gate
   scripts/verify/merge-reviews.ts  validated reviews → data/verification/reviews.json
   scripts/verify/apply-corrections.ts  source-backed fixes, with an audit trail
   scripts/verify/status.ts         stale reviews, recheck dates, unfetchable sources
```

### Where AI is and isn't used

| Job | Approach | Why |
|---|---|---|
| Is the animal there in my month? Is it open? Is it within my level? | Structured data + deterministic rules | Exact, testable, instant. |
| Ranking | Deterministic tiers | Explainable; confidence can only demote. |
| Which notes matter for this brief | Deterministic linking (aliases, sites, months) | 39/39 catches; no model needed at this corpus size. |
| Finding the passage to show | BM25 over the cited page | Cheap, and measured. |
| Does the source support the claim? | Claude (`claude-opus-5`), whole page, structured output | Semantic judgement; the lexical baseline is at chance. |
| Deciding what ships | Human reviewer | Verifier output is a proposal. |
| Cost, flights, hotels, operator quality | Not answered | No evidence in the corpus; the UI doesn't pretend otherwise. |

## Evaluation

```bash
bun run test        # 65 tests: integrity, scenario goldens, properties, evidence, verification invariants
bun run eval        # scenarios vs the shipped filter; evidence-linking ablation
bun scripts/sources/fetch.ts        # snapshot sources (needed by the next two)
bun evals/retrieval.ts              # source-passage retrieval vs gold quotes
bun evals/verifier.ts lexical       # baseline verifier
bun evals/verifier.ts llm           # Claude verifier (needs ANTHROPIC_API_KEY; ~$5–10 for all 78 claims)
bun scripts/verify/status.ts        # what needs rechecking
```

| Component | Result |
|---|---|
| Scenario goldens (26 briefs across four journeys) | trip fit 26/26 · shipped filter 10/26 |
| Individual checks | 115/115 · shipped filter 81/115 |
| Critical catches surfaced | 39/39 (plus 3/3 on cases written after the rule), median panel 4 notes |
| Source-passage retrieval (92 gold quotes) | BM25 R@3 90%, R@5 95% · no-retrieval baseline R@5 41% |
| Lexical verifier (78 reviewed claims) | 35% accuracy · 0% contradiction recall · separability 0.52 |
| Claude verifier | Built and gated by tests. **Not yet run**: needs an API key. |

**Rules the evals follow:**
- Gold was written before the code it tests; later additions are marked and dated.
- Changes to gold are dated and explained in the files: the Komodo expectations moved because the data was corrected, not to make tests pass.
- Evals score claims as they were reviewed, not as corrected, so fixes can't flatter the retriever or the verifier.
- Hard gates (false support, hallucinated quotes) are reported separately and never averaged into an accuracy number.

**Known limitations of the evidence:**
- **One labeller.** The builder wrote every gold label and reviewed every claim, with AI assistance. No external diver has reviewed the rankings or the panel yet.
- **Optimistic retrieval gold.** Quotes were found starting from BM25's top passages, so retrieval recall is optimistic.
- **Partial coverage.** 78 of 495 claims are reviewed: every access note, plus every claim behind a critical catch.

## Keeping it honest over time

- **Freshness.** Re-running `fetch.ts` hashes every source. A review whose source changed is marked *source changed since it was checked*. Access and cert claims come due for recheck after 12 months, everything else after 36.
- **Corrections.** "Something's off" on any panel lands in the `feedback` table. Triage follows the same path as the Komodo fix: review packet → review → `corrections.json` → `apply-corrections.ts` → evals → deploy. Every correction keeps its before, after, reason and verbatim evidence.
- **Measurement.** `docs/metrics.sql` holds one query per product question:
  - How many sessions use the brief?
  - How often is it empty, and do near misses rescue it?
  - Does the panel help, by tier?
  - Does anyone open the evidence?
  - The **qualified-shortlist rate**: sessions that brief, open a panel and follow the evidence.

  Ratings are never used as correctness labels. Divers rate optimistic answers higher.

## What's next

1. **External-diver review.** 3–5 divers who fit the target profile rate about 20 briefs and the panel. This is the largest gap: all quality judgements so far are one person's.
2. **Run the Claude verifier.** Run it against the 78 reviewed claims and adopt it only if false support is ≈0% with no hallucinated quotes. Then extend coverage beyond 78/495 claims, with humans confirming every *contradicted* verdict before data changes.
3. **Promote the curator's markers to schema fields.** "SNORKEL ONLY", "BAITED" and format reach ("only liveaboards reach the south") are read from prose today.
4. **Define month states.** What "peak" means for a resident species: 109 resident listings are uniform all year.
5. **Month ranges** for trips that span two months, and **monthly sea temperature** from climatology rather than annual ranges.

## Development

Built with TanStack Start (React 19, SSR) and Supabase, via [Lovable](https://lovable.dev/projects/ef4e86eb-5313-4472-8309-360be9180cf9). Changes pushed to `main` sync back to Lovable.

```bash
bun install
bun run dev         # http://localhost:8080
bun run typecheck
bun run build
```

Source snapshots live in `data/.source-cache/` and are never committed: page text belongs to its publishers. Only hashes, fetch status and short quotes (≤ 25 words) are in the repo.
