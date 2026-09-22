/**
 * The adjudication round trip: the packet's decision lines in, a dated record
 * in reviews.json and a second gold out. The published pre-adjudication number
 * must survive untouched, so these pin that the original verdict is never
 * rewritten and that an unfilled packet is progress, not an error.
 */
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { Review } from "../scripts/verify/merge-reviews";
import {
  PACKET,
  adjudicatedVerdict,
  applyDecisions,
  decidedItems,
  flipsToBar,
  parsePacket,
  preAdjudicationVerdict,
  validatePacket,
} from "./adjudication";

const review = (over: Partial<Review> = {}): Review => ({
  verdict: "supported",
  quotes: [],
  note: "",
  sourceHashes: {},
  ...over,
});

const entry = (
  id: string,
  marks: { keep?: boolean; flip?: boolean; unclear?: boolean },
  why = "",
) =>
  [
    `### 1. ${id}`,
    "",
    "**Claim (X), as reviewed:** something",
    "",
    "**Verifier says partial:** something else",
    "",
    `**Decision:** (${marks.keep ? "x" : " "}) reviewer was right, keep supported  (${
      marks.flip ? "x" : " "
    }) verifier is right, mark partial  (${marks.unclear ? "x" : " "}) unclear`,
    "",
    `**Why:** ${why}`,
    "",
    "---",
    "",
  ].join("\n");

test("an unmarked claim parses as undecided, not as an error", () => {
  const { items, problems } = parsePacket(entry("kona/operating", {}));
  expect(problems).toEqual([]);
  expect(items).toHaveLength(1);
  expect(items[0]!.claimId).toBe("kona/operating");
  expect(items[0]!.decision).toBeNull();
  expect(decidedItems(items)).toHaveLength(0);
});

test("the two verdicts come from the decision line, not from a hardcoded pair", () => {
  const md = entry("kona/operating", {}).replace(
    "keep supported  ( ) verifier is right, mark partial",
    "keep partial  ( ) verifier is right, mark contradicted",
  );
  const { items } = parsePacket(md);
  expect(items[0]!.reviewerVerdict).toBe("partial");
  expect(items[0]!.proposedVerdict).toBe("contradicted");
});

test("a marked keep is decided and needs no reason", () => {
  const { items, problems } = parsePacket(entry("kona/operating", { keep: true }));
  expect(problems).toEqual([]);
  expect(items[0]!.decision).toBe("keep");
  expect(decidedItems(items)).toHaveLength(1);
});

test("a flip carries the proposed verdict and its reason", () => {
  const { items, problems } = parsePacket(
    entry("kona/operating", { flip: true }, "The pages never name the departure points."),
  );
  expect(problems).toEqual([]);
  expect(items[0]!.decision).toBe("flip");
  expect(items[0]!.proposedVerdict).toBe("partial");
  expect(items[0]!.why).toBe("The pages never name the departure points.");
});

test("a flip without a reason is a problem: it moves a number", () => {
  const { problems } = parsePacket(entry("kona/operating", { flip: true }));
  expect(problems.join()).toMatch(/kona\/operating.*reason/i);
});

test("an unclear without a reason is a problem too", () => {
  const { problems } = parsePacket(entry("kona/operating", { unclear: true }));
  expect(problems.join()).toMatch(/kona\/operating.*reason/i);
});

test("two marked boxes on one claim is a problem", () => {
  const { problems } = parsePacket(entry("kona/operating", { keep: true, flip: true }, "both"));
  expect(problems.join()).toMatch(/kona\/operating.*one/i);
});

test("a claim the reviews don't know is a problem", () => {
  const { items } = parsePacket(entry("atlantis/operating", { keep: true }));
  const problems = validatePacket(items, { "kona/operating": review() });
  expect(problems.join()).toMatch(/atlantis\/operating.*not in/i);
});

test("a packet written against a verdict that has since changed is stale", () => {
  const { items } = parsePacket(entry("kona/operating", { keep: true }));
  const problems = validatePacket(items, { "kona/operating": review({ verdict: "partial" }) });
  expect(problems.join()).toMatch(/kona\/operating.*supported.*partial/i);
});

test("a packet that matches the reviews validates clean", () => {
  const { items } = parsePacket(entry("kona/operating", { keep: true }));
  expect(validatePacket(items, { "kona/operating": review() })).toEqual([]);
});

test("applying a decision records it without rewriting the reviewed verdict", () => {
  const reviews = { "kona/operating": review() };
  const { items } = parsePacket(entry("kona/operating", { flip: true }, "not in the cited pages"));
  const out = applyDecisions(reviews, decidedItems(items), "2026-09-23", "second reviewer");
  expect(out["kona/operating"]!.verdict).toBe("supported");
  expect(out["kona/operating"]!.adjudication).toEqual({
    adjudicatedAt: "2026-09-23",
    by: "second reviewer",
    outcome: "flip",
    verdict: "partial",
    reason: "not in the cited pages",
  });
});

test("a keep records the review without a post-adjudication verdict", () => {
  const reviews = { "kona/operating": review() };
  const { items } = parsePacket(entry("kona/operating", { keep: true }));
  const out = applyDecisions(reviews, decidedItems(items), "2026-09-23", "second reviewer");
  expect(out["kona/operating"]!.adjudication?.outcome).toBe("keep");
  expect(out["kona/operating"]!.adjudication?.verdict).toBeUndefined();
});

test("applying leaves undecided claims alone and does not mutate the input", () => {
  const reviews = { "kona/operating": review(), "malta/operating": review() };
  const { items } = parsePacket(entry("kona/operating", { keep: true }));
  const out = applyDecisions(reviews, decidedItems(items), "2026-09-23", "second reviewer");
  expect(out["malta/operating"]!.adjudication).toBeUndefined();
  expect(reviews["kona/operating"]!.adjudication).toBeUndefined();
});

test("the post-adjudication gold is the flipped verdict; the pre one is unchanged", () => {
  const r = review({
    adjudication: {
      adjudicatedAt: "2026-09-23",
      by: "second reviewer",
      outcome: "flip",
      verdict: "partial",
      reason: "r",
    },
  });
  expect(preAdjudicationVerdict(r)).toBe("supported");
  expect(adjudicatedVerdict(r)).toBe("partial");
});

test("keep and unclear leave the gold where it was", () => {
  for (const outcome of ["keep", "unclear"] as const) {
    const r = review({
      adjudication: { adjudicatedAt: "2026-09-23", by: "x", outcome, reason: "r" },
    });
    expect(adjudicatedVerdict(r)).toBe("supported");
  }
});

test("adjudication layers on top of a correction, it does not replace it", () => {
  const corrected = review({
    verdict: "supported",
    correction: {
      correctedAt: "2026-09-21",
      previousVerdict: "contradicted",
      reason: "r",
      addedQuotes: [],
    },
  });
  expect(preAdjudicationVerdict(corrected)).toBe("contradicted");
  expect(adjudicatedVerdict(corrected)).toBe("contradicted");
});

test("flipsToBar counts only disputes the verifier already called the proposed way", () => {
  const rows = [
    // Disputed and wrong the adjudicator's way: flipping this one gains a claim.
    { claimId: "a", gold: "supported" as const, predicted: "partial" as const },
    { claimId: "b", gold: "supported" as const, predicted: "partial" as const },
    // Disputed but the verifier said something else again: flipping gains nothing.
    { claimId: "c", gold: "supported" as const, predicted: "contradicted" as const },
    // Not disputed.
    { claimId: "d", gold: "partial" as const, predicted: "partial" as const },
  ];
  const disputed = new Map<string, "partial">([
    ["a", "partial"],
    ["b", "partial"],
    ["c", "partial"],
  ]);
  const r = flipsToBar(rows, disputed, 0.5);
  expect(r).toEqual({ correct: 1, n: 4, needed: 1, gainable: 2, reachable: true });
});

test("flipsToBar reports a bar adjudication cannot reach", () => {
  const rows = [
    { claimId: "a", gold: "supported" as const, predicted: "partial" as const },
    { claimId: "b", gold: "supported" as const, predicted: "contradicted" as const },
    { claimId: "c", gold: "supported" as const, predicted: "contradicted" as const },
    { claimId: "d", gold: "supported" as const, predicted: "contradicted" as const },
  ];
  const disputed = new Map<string, "partial">([["a", "partial"]]);
  expect(flipsToBar(rows, disputed, 0.6)).toMatchObject({
    needed: 3,
    gainable: 1,
    reachable: false,
  });
});

test("flipsToBar needs nothing when the bar is already met", () => {
  const rows = [{ claimId: "a", gold: "partial" as const, predicted: "partial" as const }];
  expect(flipsToBar(rows, new Map(), 0.6).needed).toBe(0);
});

test("the committed packet parses clean and matches the reviews it was built from", () => {
  const { reviews } = JSON.parse(readFileSync("data/verification/reviews.json", "utf8"));
  const { items, problems } = parsePacket(readFileSync(PACKET, "utf8"));
  expect(problems).toEqual([]);
  expect(items).toHaveLength(25);
  expect(validatePacket(items, reviews)).toEqual([]);
  expect(items.every((i) => i.reviewerVerdict === "supported")).toBe(true);
  expect(items.every((i) => i.proposedVerdict === "partial")).toBe(true);
});
