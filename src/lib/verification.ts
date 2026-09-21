/**
 * Source verification, as the product shows it.
 *
 * Reviews (data/verification/reviews.json) record, per claim, whether its cited
 * sources support it, with verbatim quotes of at most 25 words. The source
 * manifest records when each source was last fetched and its content hash. A
 * review is stale when a quoted source's hash has changed since the review.
 * Page text itself is never shipped.
 */
import reviewFile from "../../data/verification/reviews.json";
import manifest from "../../data/sources/manifest.json";

export type VerificationVerdict =
  | "supported"
  | "partial"
  | "contradicted"
  | "not_found"
  | "unverifiable";
export type Quote = { url: string; text: string };
export type Review = {
  verdict: VerificationVerdict;
  quotes: Quote[];
  conflict?: Quote;
  note: string;
  sourceHashes: Record<string, string>;
  correction?: {
    correctedAt: string;
    previousVerdict: VerificationVerdict;
    reason: string;
    addedQuotes: string[];
  };
};

type SourceRecord = { url: string; status: string; fetchedAt: string; contentHash?: string };

const REVIEWS = (reviewFile as { reviewedAt: string; reviews: Record<string, Review> }).reviews;
export const REVIEWED_AT = (reviewFile as { reviewedAt: string }).reviewedAt;
const SOURCES = manifest as SourceRecord[];
const hashByUrl = new Map(SOURCES.map((s) => [s.url, s.contentHash]));

export type CheckStatus =
  | "confirmed"
  | "partial"
  | "corrected"
  | "unconfirmed"
  | "stale"
  | "due"
  | "unchecked";

/** Recheck policy: access and rules change fastest. */
const RECHECK_MONTHS: Record<string, number> = { operating: 12, cert: 12 };
const DEFAULT_RECHECK_MONTHS = 36;

function isDue(claimId: string, review: Review, now: Date) {
  const months = RECHECK_MONTHS[claimId.split("/")[1] ?? ""] ?? DEFAULT_RECHECK_MONTHS;
  const checked = new Date(review.correction?.correctedAt ?? REVIEWED_AT);
  return (now.getTime() - checked.getTime()) / (30.44 * 86400000) > months;
}

export type Check = { status: CheckStatus; review?: Review };

export function getReview(claimId: string): Review | undefined {
  return REVIEWS[claimId];
}

function isStale(review: Review) {
  return Object.entries(review.sourceHashes).some(([url, hash]) => {
    const now = hashByUrl.get(url);
    return hash !== "unknown" && now !== undefined && now !== hash;
  });
}

export function checkFor(claimId: string, now: Date = new Date()): Check {
  const review = REVIEWS[claimId];
  if (!review) return { status: "unchecked" };
  if (isStale(review)) return { status: "stale", review };
  if (isDue(claimId, review, now)) return { status: "due", review };
  if (review.correction) return { status: "corrected", review };
  if (review.verdict === "supported") return { status: "confirmed", review };
  if (review.verdict === "partial") return { status: "partial", review };
  return { status: "unconfirmed", review };
}

/** An undeclared disagreement a reviewer found in another cited source. */
export function hasDiscoveredConflict(claimId: string) {
  return Boolean(REVIEWS[claimId]?.conflict);
}

export function destinationChecks(destinationId: string) {
  const entries = Object.entries(REVIEWS).filter(([id]) => id.startsWith(`${destinationId}/`));
  const statuses = entries.map(([id]) => checkFor(id).status);
  const count = (s: CheckStatus) => statuses.filter((x) => x === s).length;
  return {
    checked: entries.length,
    confirmed: count("confirmed"),
    partial: count("partial"),
    corrected: count("corrected"),
    unconfirmed: count("unconfirmed"),
    stale: count("stale") + count("due"),
  };
}

export function sourceStatus(url: string) {
  return SOURCES.find((s) => s.url === url);
}

export function formatCheckDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
