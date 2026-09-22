# Screenshots to capture

Capture after the merge (live site) or from `bun run dev` at `http://localhost:8080`.
Desktop at 1440 × 900 unless noted; phone at 390 × 844. Suggested file names in brackets.

| # | Screen | How to get there | What it shows |
|---|---|---|---|
| 1 | Describe box, filled in, before submitting [`01-describe.png`] | Home → *Describe your trip* → type the demo text | Plain-language input inside the original design |
| 2 | Parsed brief [`02-brief.png`] | Press *Plan it* | Editable filters, the two worries, "no evidence on cost", the engine line |
| 3 | Ranked results with catches [`03-results.png`] | `/?m=9&sp=manta-rays&cert=advanced&cn=seasickness%2Cnon_diver` | Good fits first; Komodo *Rough water*; Baa *Snorkel-only encounter* |
| 4 | Close, but… [`04-near-miss.png`] | Same URL, scroll down | *Tubbataha · Closed in Sep · fits Mar–Jun* |
| 5 | Wrong kind of encounter [`05-whales.png`] | `/?m=2&sp=whales` | Kona, Oahu, Socorro, Cabo Pulmo: *Not an in-water encounter* |
| 6 | For your trip panel [`06-for-your-trip.png`] | Open Komodo from screen 3 | A verdict per part of the brief; the few notes that matter |
| 7 | Worry evidence [`07-concerns.png`] | Komodo → *What the record says about your concerns* | The record's own sentences on seasickness, with source checks |
| 8 | Ask, answered [`08-ask.png`] | Komodo → *Ask about Komodo*: "How rough is the crossing?" | Three verbatim sentences |
| 9 | Ask, not covered [`09-ask-silent.png`] | Ask: "Is there good nightlife?" | "This record doesn't answer that" |
| 10 | Corrected source check [`10-correction.png`] | Komodo → access note marked *Corrected after a source check* | Status, verbatim passage, date, correction note |
| 11 | Compare, desktop [`11-compare.png`] | Tick Compare on Nusa Penida, Komodo, Baa Atoll → open | Three destinations against one trip |
| 12 | Compare, phone [`12-compare-phone.png`] | Same, at 390 px | Works at phone width |
| 13 | About: How it's checked [`13-about.png`] | `/about#how-its-checked` | Pinned test results, labelled as test results |
| 14 | Eval output [`14-evals.png`] | Terminal: `bun run eval \| head -40` | 29/29 vs 11/29; catches 39/39 |
| 15 | Retrieval comparison [`15-retrieval.png`] | Terminal: `bun evals/concerns.ts` (test split block) | Vocabulary 93% vs BM25; add `--dense` for embeddings |
| 16 | Dry-run cost estimate [`16-dry-run.png`] | Terminal: `bun run eval:llm:dry` | Exact prompts and cost estimate before any spend |
| 17 | Adversarial report [`17-adversarial.png`] | Terminal: `bun evals/adversarial.ts --errors` | 0 violations; each miss named |
| 18 | CI passing [`18-ci.png`] | The pull request's checks tab | Typecheck and tests on every PR |
| 19 | Decision rules [`19-rules.png`] | `docs/paid-evals.md` rendered on GitHub | Pass marks written before any result |

After the paid runs, add the Claude-vs-rules comparison from `evals/reports/*.record.json`.
