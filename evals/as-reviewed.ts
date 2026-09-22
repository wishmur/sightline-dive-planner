/**
 * Evals must score claims as they were when reviewed. After a correction, the
 * current text agrees with its sources, which would flatter any retriever or
 * verifier on exactly the cases that exposed their weaknesses.
 */
import { readFileSync } from "node:fs";

type Correction = { claimId: string; field: string; before: unknown };

const corrections: Correction[] = JSON.parse(
  readFileSync("data/verification/corrections.json", "utf8"),
);

export function asReviewedText(claimId: string, currentText: string) {
  const fix = corrections.find(
    (c) => c.claimId === claimId && /(^|\.)(note|operating_note)$/.test(c.field),
  );
  return typeof fix?.before === "string" ? fix.before : currentText;
}

/** Quotes a correction added as evidence; they were not part of the original review. */
export function correctionEvidence(claimId: string): Set<string> {
  const file = JSON.parse(readFileSync("data/verification/reviews.json", "utf8")) as {
    reviews: Record<string, { correction?: { addedQuotes?: string[] } }>;
  };
  return new Set(file.reviews[claimId]?.correction?.addedQuotes ?? []);
}
