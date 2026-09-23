/**
 * Merge review batches into data/verification/reviews.json and validate them:
 * `bun scripts/verify/merge-reviews.ts`
 *
 * Every quote must appear verbatim (modulo whitespace/punctuation) in the cached
 * snapshot of its URL, and each review records the content hash of the sources it
 * quotes, so a later snapshot with a different hash marks the review stale.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { cachePath, MANIFEST, type SourceRecord } from "../sources/fetch";
import { containsQuote } from "../lib/retrieval";

export type Verdict = "supported" | "partial" | "contradicted" | "not_found" | "unverifiable";
export type Quote = { url: string; text: string };
export type Review = {
  verdict: Verdict;
  quotes: Quote[];
  /** An undeclared disagreement found in another cited source. */
  conflict?: Quote;
  note: string;
  /** Content hash of each quoted/conflicting source at review time. */
  sourceHashes: Record<string, string>;
  /** Set when the claim was corrected in the dataset after this review. */
  correction?: {
    correctedAt: string;
    previousVerdict: Verdict;
    reason: string;
    addedQuotes: string[];
  };
  /**
   * Set when a second reviewer adjudicated a disagreement between this review
   * and the verifier (evals/adjudicate.ts). `verdict` is the post-adjudication
   * gold and is present only on a flip; `verdict` above stays as reviewed, so
   * the published pre-adjudication numbers keep replaying unchanged.
   */
  adjudication?: {
    adjudicatedAt: string;
    by: string;
    outcome: "keep" | "flip" | "unclear";
    verdict?: Verdict;
    reason: string;
  };
};
export type ReviewFile = {
  reviewedAt: string;
  reviewer: string;
  method: string;
  reviews: Record<string, Review>;
};

export const REVIEWS = "data/verification/reviews.json";

if (import.meta.main) {
  const manifest: SourceRecord[] = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const hashOf = new Map(manifest.map((r) => [r.url, r.contentHash]));
  const parts = readdirSync("data/verification")
    .filter((f) => /^reviews\.part\d+\.json$/.test(f))
    .sort();
  const existing: ReviewFile | null = existsSync(REVIEWS)
    ? JSON.parse(readFileSync(REVIEWS, "utf8"))
    : null;
  const reviews: Record<string, Review> = { ...(existing?.reviews ?? {}) };

  const problems: string[] = [];
  for (const part of parts) {
    const batch: Record<string, Omit<Review, "sourceHashes">> = JSON.parse(
      readFileSync(`data/verification/${part}`, "utf8"),
    );
    for (const [id, r] of Object.entries(batch)) {
      const quoted = [...r.quotes, ...(r.conflict ? [r.conflict] : [])];
      for (const q of quoted) {
        if (!existsSync(cachePath(q.url))) problems.push(`${id}: source not cached ${q.url}`);
        else if (!containsQuote(readFileSync(cachePath(q.url), "utf8"), q.text))
          problems.push(`${id}: quote not found in ${q.url}: "${q.text}"`);
        if (q.text.split(/\s+/).length > 25) problems.push(`${id}: quote longer than 25 words`);
      }
      const sourceHashes = Object.fromEntries(
        quoted.map((q) => [q.url, hashOf.get(q.url) ?? "unknown"]),
      );
      reviews[id] = { ...r, sourceHashes };
    }
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const out: ReviewFile = {
    reviewedAt: "2026-09-21",
    reviewer: "claude-assisted curator review",
    method:
      "Claim-scoped BM25 surfaced the top passages from each cited source; the reviewer judged support and searched the full page when the top passages did not settle it. Quotes are verbatim and at most 25 words.",
    reviews: Object.fromEntries(Object.entries(reviews).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(REVIEWS, JSON.stringify(out, null, 2) + "\n");
  for (const part of parts) unlinkSync(`data/verification/${part}`);
  const count = (v: Verdict) => Object.values(out.reviews).filter((r) => r.verdict === v).length;
  console.log(
    `${Object.keys(out.reviews).length} reviews · supported ${count("supported")} · partial ${count("partial")} · contradicted ${count("contradicted")} · not_found ${count("not_found")} · conflicts found ${Object.values(out.reviews).filter((r) => r.conflict).length}`,
  );
}
