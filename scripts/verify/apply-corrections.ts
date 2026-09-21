/**
 * Apply source-verified corrections to the curated dataset:
 * `bun scripts/verify/apply-corrections.ts`
 *
 * - data/verification/corrections.json: factual fixes, each with before/after,
 *   reason and verbatim evidence. A correction whose current value is neither
 *   `before` nor `after` fails loudly instead of overwriting unknown edits.
 * - Editorial cleanup: strip internal research-log markers from user-facing notes.
 * - Reviews of corrected claims are marked corrected (the previous verdict is kept).
 *
 * Idempotent: re-running changes nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { MANIFEST, type SourceRecord } from "../sources/fetch";
import { REVIEWS, type Quote, type ReviewFile } from "./merge-reviews";

const DATA = "src/data/destinations.json";
const CORRECTED_AT = "2026-09-21";

type Correction = {
  claimId: string;
  field: string;
  before: unknown;
  after: unknown;
  reason: string;
  evidence: Quote[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function locate(dest: Json, field: string): { obj: Json; key: string } {
  const m = field.match(/^species\[(.+)\]\.(\w+)$/);
  if (m) {
    const species = dest.species.find((s: Json) => s.name === m[1]);
    if (!species) throw new Error(`no species ${m[1]} in ${dest.id}`);
    return { obj: species, key: m[2]! };
  }
  return { obj: dest, key: field };
}

const LOG_MARKERS: [RegExp, string][] = [
  [/\s*See OQ-\d+\.?/g, ""],
  [/^(RESOLVED BY TIER 1|CORROBORATION IMPROVED|SHIPPING CONTESTED)\.\s*/, ""],
];

function clean(text: string) {
  return LOG_MARKERS.reduce((t, [re, to]) => t.replace(re, to), text);
}

const raw = readFileSync(DATA, "utf8");
const data: Json[] = JSON.parse(raw);
if (JSON.stringify(data, null, 2) + "\n" !== raw)
  throw new Error("dataset does not round-trip; refusing to rewrite it");

const corrections: Correction[] = JSON.parse(
  readFileSync("data/verification/corrections.json", "utf8"),
);
let applied = 0;
for (const c of corrections) {
  const dest = data.find((d) => d.id === c.claimId.split("/")[0]);
  const { obj, key } = locate(dest, c.field);
  const now = JSON.stringify(obj[key]);
  if (now === JSON.stringify(c.after)) continue;
  if (now !== JSON.stringify(c.before))
    throw new Error(`${c.claimId} ${c.field}: current value matches neither before nor after`);
  obj[key] = c.after;
  applied++;
}

let cleaned = 0;
for (const d of data) {
  const fix = (o: Json, k: string) => {
    const next = clean(o[k]);
    if (next !== o[k]) {
      o[k] = next;
      cleaned++;
    }
  };
  fix(d, "operating_note");
  fix(d.conditions, "experience_note");
  for (const s of d.species) fix(s, "note");
  for (const h of d.highlights) fix(h, "note");
}
writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n");

// Mark reviews of corrected claims.
const manifest: SourceRecord[] = JSON.parse(readFileSync(MANIFEST, "utf8"));
const hashOf = new Map(manifest.map((r) => [r.url, r.contentHash ?? "unknown"]));
const reviews: ReviewFile = JSON.parse(readFileSync(REVIEWS, "utf8"));
for (const id of new Set(corrections.map((c) => c.claimId))) {
  const r = reviews.reviews[id];
  if (!r || r.correction) continue;
  const reasons = corrections.filter((c) => c.claimId === id).map((c) => c.reason);
  const evidence = corrections.filter((c) => c.claimId === id).flatMap((c) => c.evidence);
  const addedQuotes: string[] = [];
  for (const q of evidence) {
    if (r.quotes.some((x) => x.text === q.text)) continue;
    r.quotes.push(q);
    addedQuotes.push(q.text);
  }
  r.correction = {
    correctedAt: CORRECTED_AT,
    previousVerdict: r.verdict,
    reason: reasons[0]!,
    addedQuotes,
  };
  r.verdict = "supported";
  r.sourceHashes = Object.fromEntries(
    [...r.quotes, ...(r.conflict ? [r.conflict] : [])].map((q) => [
      q.url,
      hashOf.get(q.url) ?? "unknown",
    ]),
  );
}
writeFileSync(REVIEWS, JSON.stringify(reviews, null, 2) + "\n");
console.log(`corrections applied: ${applied} · research-log markers removed: ${cleaned}`);
