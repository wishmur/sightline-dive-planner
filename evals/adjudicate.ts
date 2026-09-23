/**
 * Adjudication round trip for the verifier's disagreements with the review:
 *   bun evals/adjudicate.ts                    progress and what each decision would do
 *   bun evals/adjudicate.ts --score            pre- vs post-adjudication metrics (replay, free)
 *   bun evals/adjudicate.ts --apply --by NAME  write the decisions into reviews.json
 *
 * Fill in data/verification/adjudication-supported-vs-partial.md first: mark one
 * box per claim and give a reason for anything but "keep".
 *
 * This never rewrites a reviewed verdict and never edits a published number. The
 * adjudicated label is stored alongside the original, and --score prints both
 * golds side by side so the post-adjudication accuracy is reported as its own
 * number. That matters here: the verifier missed its 60% accuracy bar by a single
 * claim, so one flip among the 25 crosses the line. A result that decides adoption
 * has to say which gold produced it.
 *
 * Makes no API calls. --score replays the recorded responses from the private
 * cache (data/.llm-cache), so it only runs where that cache exists.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { RESULTS } from "@/lib/about-results";
import { REVIEWS, type ReviewFile } from "../scripts/verify/merge-reviews";
import { llmVerifier, type Verdict } from "../scripts/verify/verifiers";
import {
  PACKET,
  applyDecisions,
  decidedItems,
  flipsToBar,
  parsePacket,
  summarise,
  validatePacket,
} from "./adjudication";
import { LlmHarness, PRIVATE_CACHE_DIR } from "./harness/llm-harness";
import { goldCases, score, type GoldCase } from "./verifier";

/** The pre-registered accuracy line for adopting the verifier (docs/paid-evals.md). */
const ACCURACY_BAR = 0.6;

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const has = (name: string) => process.argv.includes(name);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

const file: ReviewFile = JSON.parse(readFileSync(REVIEWS, "utf8"));
const { items, problems } = parsePacket(readFileSync(PACKET, "utf8"));
const allProblems = [...problems, ...validatePacket(items, file.reviews)];
if (allProblems.length) {
  console.error(`The packet needs fixing before anything can use it:`);
  for (const p of allProblems) console.error(`  ${p}`);
  process.exit(1);
}

const decided = decidedItems(items);
const s = summarise(items);
console.log(`\n=== Adjudication · ${PACKET} ===`);
console.log(
  `${s.total} disputed claims · decided ${s.total - s.undecided} (keep ${s.keep}, flip ${s.flip}, unclear ${s.unclear}) · still to review ${s.undecided}`,
);
for (const d of decided)
  console.log(
    `  ${d.decision === "flip" ? "flip →" : d.decision === "keep" ? "keep  " : "unclear"} ${d.claimId.padEnd(40)} ${
      d.decision === "flip" ? `${d.reviewerVerdict} → ${d.proposedVerdict}` : d.reviewerVerdict
    }`,
  );
if (s.undecided && !has("--score"))
  console.log(
    `\nMark one box per claim in the packet, then re-run. Nothing is written until --apply.`,
  );

if (has("--apply")) {
  if (!decided.length) {
    console.error(`\nNothing to apply: no box is marked in the packet.`);
    process.exit(1);
  }
  const by = arg("--by");
  if (!by) {
    console.error(`\n--apply needs --by "who adjudicated": the record is dated and attributed.`);
    process.exit(1);
  }
  const date = arg("--date") ?? new Date().toISOString().slice(0, 10);
  const out: ReviewFile = {
    ...file,
    reviews: applyDecisions(file.reviews, decided, date, by),
  };
  writeFileSync(REVIEWS, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `\nWrote ${decided.length} adjudications to ${REVIEWS} (${date}, ${by}). The reviewed verdicts are unchanged.`,
  );
  if (s.undecided) console.log(`${s.undecided} claims are still undecided and were left alone.`);
}

if (has("--score")) {
  if (!existsSync(PRIVATE_CACHE_DIR) || !existsSync("data/.source-cache")) {
    console.error(
      `\n--score replays the recorded verifier responses; needs ${PRIVATE_CACHE_DIR} and data/.source-cache.`,
    );
    process.exit(1);
  }
  const h = new LlmHarness({ name: "verifier", mode: "replay", cacheDir: PRIVATE_CACHE_DIR });
  const verifier = llmVerifier(
    new Anthropic({ fetch: h.fetch, apiKey: "no-network", maxRetries: 0 }),
  );

  // Run the cached verifier once, then score the same outputs against both golds.
  const cases = goldCases();
  const outputs = new Map<string, Awaited<ReturnType<typeof verifier>>>();
  for (const c of cases) outputs.set(c.input.claimId, await verifier(c.input));
  const replay = async (input: { claimId: string }) => outputs.get(input.claimId)!;
  const withGold = (pick: (c: GoldCase) => Verdict) => cases.map((c) => ({ ...c, gold: pick(c) }));

  const pre = await score(
    withGold((c) => c.gold),
    replay,
  );

  console.log(`\n=== Verifier against the reviewed gold · ${cases.length} claims ===`);
  console.log(
    `accuracy ${pct(pre.accuracy)} · false support ${pct(pre.falseSupportRate)} · contradiction recall ${pct(pre.contradictionRecall)}`,
  );
  console.log(
    `Published (pre-adjudication) accuracy is ${RESULTS.claude.verifier.accuracy}%; this run reproduces ${pct(pre.accuracy)}.` +
      (pct(pre.accuracy) === `${RESULTS.claude.verifier.accuracy}%`
        ? ""
        : `  ⚠ MISMATCH — the pinned number and the replay disagree; do not report either until that is explained.`),
  );

  const disputed = new Map(items.map((i) => [i.claimId, i.proposedVerdict]));
  const sens = flipsToBar(pre.rows, disputed, ACCURACY_BAR);
  console.log(`\n--- How much rests on this adjudication ---`);
  console.log(
    `${sens.correct}/${sens.n} correct. ${sens.gainable} of the ${items.length} disputed claims are ones the verifier already called the proposed way,`,
  );
  console.log(
    sens.needed === 0
      ? `and the ${pct(ACCURACY_BAR)} bar is already met.`
      : sens.reachable
        ? `so ${sens.needed} flip${sens.needed === 1 ? "" : "s"} would carry it over the ${pct(ACCURACY_BAR)} adoption bar.`
        : `and even flipping all of them would not reach the ${pct(ACCURACY_BAR)} bar (${sens.needed} needed).`,
  );
  if (sens.reachable && sens.needed > 0 && sens.needed <= 3)
    console.log(
      `That is a thin margin. Decide all ${items.length} against the cited pages before looking at any recomputed number.`,
    );

  if (s.undecided) {
    console.log(
      `\nNo post-adjudication number yet: ${s.undecided} of ${items.length} claims are undecided.`,
    );
    console.log(
      `It is withheld on purpose. With the bar ${sens.needed} flip${sens.needed === 1 ? "" : "s"} away, seeing the number move mid-review would let the` +
        `\nremaining decisions be made to reach it. Finish the packet, then re-run.`,
    );
    process.exit(0);
  }

  const post = await score(
    withGold((c) => c.adjudicatedGold),
    replay,
  );
  const moved = cases.filter((c) => c.gold !== c.adjudicatedGold);
  console.log(`\n=== Post-adjudication, reported separately ===`);
  const row = (name: string, a: number, b: number, bar?: number) =>
    console.log(
      `${name.padEnd(22)} ${pct(a).padStart(5)} → ${pct(b).padStart(5)}${
        bar === undefined
          ? ""
          : `   (bar ${pct(bar)}: ${b >= bar ? "passes" : "misses"} after, ${a >= bar ? "passed" : "missed"} before)`
      }`,
    );
  console.log(`${"".padEnd(22)}   pre    post`);
  row("accuracy", pre.accuracy, post.accuracy, ACCURACY_BAR);
  row("false-support rate", pre.falseSupportRate, post.falseSupportRate);
  row("contradiction recall", pre.contradictionRecall, post.contradictionRecall);
  console.log(
    `\n${moved.length} gold labels moved: ${moved.map((c) => `${c.input.claimId} ${c.gold}→${c.adjudicatedGold}`).join(", ") || "none"}`,
  );
  console.log(
    `\nReport this as its own figure, with the adjudicator and the date, next to the published ${RESULTS.claude.verifier.accuracy}%. It does not replace it.`,
  );
}
