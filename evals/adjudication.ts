/**
 * Adjudication of the verifier's disagreements with the human review.
 *
 * The packet (data/verification/adjudication-supported-vs-partial.md) lists the
 * claims where the Claude verifier and the reviewer disagreed, each with a
 * decision line. A second reviewer marks one box per claim; this module turns
 * those marks into a dated record on the review and into a SECOND gold label.
 *
 * The reviewed `verdict` is never rewritten. A published number stays published:
 * the adjudicated gold lives in `adjudication`, so the pre-adjudication metric
 * keeps replaying to exactly what was reported, and the post-adjudication one is
 * reported next to it as a separate number.
 */
import type { Review, Verdict } from "../scripts/verify/merge-reviews";
import { VERDICTS } from "../scripts/verify/verifiers";

export const PACKET = "data/verification/adjudication-supported-vs-partial.md";

/** keep = the reviewer was right; flip = the verifier was; unclear = neither settles it. */
export type Outcome = "keep" | "flip" | "unclear";

export type PacketItem = {
  claimId: string;
  /** The verdict the packet says the reviewer gave, read off the decision line. */
  reviewerVerdict: Verdict;
  /** The verdict the verifier proposed instead. */
  proposedVerdict: Verdict;
  decision: Outcome | null;
  why: string;
};

export type DecidedItem = PacketItem & { decision: Outcome };

const OPTIONS = [
  { outcome: "keep" as const, re: /\(([^)]*)\)\s*reviewer was right, keep (\w+)/ },
  { outcome: "flip" as const, re: /\(([^)]*)\)\s*verifier is right, mark (\w+)/ },
  { outcome: "unclear" as const, re: /\(([^)]*)\)\s*unclear/ },
];

const isVerdict = (s: string): s is Verdict => (VERDICTS as readonly string[]).includes(s);

/**
 * Reads the decision lines out of a filled-in packet. An unmarked claim is not
 * an error — it is a claim still to review — but an ambiguous or unexplained one
 * is, because it would otherwise move a number silently.
 */
export function parsePacket(md: string): { items: PacketItem[]; problems: string[] } {
  const items: PacketItem[] = [];
  const problems: string[] = [];
  const headings = [...md.matchAll(/^### \d+\.[ \t]+(.+?)[ \t]*$/gm)];
  for (const [i, h] of headings.entries()) {
    const claimId = h[1]!;
    const body = md.slice(h.index! + h[0]!.length, headings[i + 1]?.index ?? md.length);

    const line = body.match(/^\*\*Decision:\*\*(.*)$/m)?.[1];
    if (line === undefined) {
      problems.push(`${claimId}: no decision line`);
      continue;
    }
    const found = OPTIONS.map((o) => ({ ...o, m: line.match(o.re) }));
    const missing = found.filter((f) => !f.m).map((f) => f.outcome);
    if (missing.length) {
      problems.push(`${claimId}: decision line is missing the ${missing.join(", ")} option`);
      continue;
    }
    const marked = found.filter((f) => /[xX]/.test(f.m![1]!));
    if (marked.length > 1) {
      problems.push(
        `${claimId}: ${marked.length} boxes marked (${marked.map((f) => f.outcome).join(", ")}); mark exactly one`,
      );
      continue;
    }

    const [reviewerVerdict, proposedVerdict] = [found[0]!.m![2]!, found[1]!.m![2]!];
    if (!isVerdict(reviewerVerdict) || !isVerdict(proposedVerdict)) {
      problems.push(
        `${claimId}: decision line names an unknown verdict (${reviewerVerdict} / ${proposedVerdict})`,
      );
      continue;
    }

    const why = (body.match(/\*\*Why:\*\*([\s\S]*?)(?=\n---|\n### |$)/)?.[1] ?? "").trim();
    const decision = marked[0]?.outcome ?? null;
    if (decision && decision !== "keep" && !why)
      problems.push(`${claimId}: "${decision}" needs a reason on the Why line`);

    items.push({ claimId, reviewerVerdict, proposedVerdict, decision, why });
  }
  if (!items.length && !problems.length) problems.push("no claims found in the packet");
  return { items, problems };
}

export const decidedItems = (items: PacketItem[]): DecidedItem[] =>
  items.filter((i): i is DecidedItem => i.decision !== null);

/** Catches a packet that no longer describes the reviews it was generated from. */
export function validatePacket(items: PacketItem[], reviews: Record<string, Review>): string[] {
  const problems: string[] = [];
  for (const item of items) {
    const review = reviews[item.claimId];
    if (!review) {
      problems.push(`${item.claimId}: not in the reviews`);
      continue;
    }
    const current = preAdjudicationVerdict(review);
    if (current !== item.reviewerVerdict)
      problems.push(
        `${item.claimId}: packet was written against "${item.reviewerVerdict}", the review now says "${current}" — regenerate the packet`,
      );
  }
  const seen = new Set<string>();
  for (const item of items)
    if (seen.has(item.claimId)) problems.push(`${item.claimId}: listed twice in the packet`);
    else seen.add(item.claimId);
  return problems;
}

/**
 * The gold as measured and published: a claim corrected after review is still
 * judged on the verdict it was reviewed under.
 */
export const preAdjudicationVerdict = (review: Review): Verdict =>
  review.correction?.previousVerdict ?? review.verdict;

/** The gold after adjudication. Only a flip moves it. */
export const adjudicatedVerdict = (review: Review): Verdict =>
  review.adjudication?.verdict ?? preAdjudicationVerdict(review);

/** Returns a new review map; the input is left alone. */
export function applyDecisions(
  reviews: Record<string, Review>,
  decisions: DecidedItem[],
  adjudicatedAt: string,
  by: string,
): Record<string, Review> {
  const out: Record<string, Review> = { ...reviews };
  for (const d of decisions) {
    const review = out[d.claimId];
    if (!review) continue;
    out[d.claimId] = {
      ...review,
      adjudication: {
        adjudicatedAt,
        by,
        outcome: d.decision,
        ...(d.decision === "flip" ? { verdict: d.proposedVerdict } : {}),
        reason: d.why,
      },
    };
  }
  return out;
}

/**
 * How far the adoption decision is from flipping, measured in adjudications.
 *
 * Each disputed claim the verifier called by its proposed verdict is one the
 * adjudicator can turn from wrong to right, so accuracy moves a whole claim at a
 * time. When that distance is small the adjudication is not a tidy-up: it decides
 * adoption, and the person deciding should know that before they start rather
 * than discover it by watching the number.
 */
export function flipsToBar(
  rows: { claimId: string; gold: Verdict; predicted: Verdict }[],
  disputed: Map<string, Verdict>,
  bar: number,
): { correct: number; n: number; needed: number; gainable: number; reachable: boolean } {
  const correct = rows.filter((r) => r.gold === r.predicted).length;
  const gainable = rows.filter((r) => {
    const proposed = disputed.get(r.claimId);
    return proposed !== undefined && r.gold !== r.predicted && proposed === r.predicted;
  }).length;
  const needed = Math.max(0, Math.ceil(bar * rows.length - 1e-9) - correct);
  return { correct, n: rows.length, needed, gainable, reachable: needed <= gainable };
}

export const summarise = (items: PacketItem[]) => ({
  total: items.length,
  keep: items.filter((i) => i.decision === "keep").length,
  flip: items.filter((i) => i.decision === "flip").length,
  unclear: items.filter((i) => i.decision === "unclear").length,
  undecided: items.filter((i) => i.decision === null).length,
});
