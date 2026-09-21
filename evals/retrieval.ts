/**
 * Source-passage retrieval eval: `bun evals/retrieval.ts`
 *
 * Gold: every verbatim quote in data/verification/reviews.json, found by a
 * reviewer who read the top passages and searched the full page when needed.
 * Question: does claim-scoped retrieval put the passage containing that quote
 * in its top k?
 *
 * Needs the private source cache (`bun scripts/sources/fetch.ts`); page text is
 * copyrighted and is not committed.
 */
import { readFileSync, existsSync } from "node:fs";
import { getDestination } from "@/lib/destinations";
import { claimsFor, type Claim } from "@/lib/claims";
import {
  bm25,
  containsQuote,
  loadPassages,
  tokenize,
  type Passage,
} from "../scripts/lib/retrieval";
import { REVIEWS, type ReviewFile } from "../scripts/verify/merge-reviews";
import { asReviewedText, correctionEvidence } from "./as-reviewed";

export type Ranker = (claim: Claim, pool: Passage[]) => Passage[];

const noteQuery: Ranker = (c, pool) =>
  bm25(tokenize(`${c.label} ${c.text}`), pool).map((r) => r.passage);

const sentenceMax: Ranker = (c, pool) => {
  const sentences = c.text.split(/(?<=[.!?])\s+/).filter((s) => s.split(/\s+/).length >= 3);
  const best = new Map<string, number>();
  for (const s of sentences) {
    for (const r of bm25(tokenize(`${c.label} ${s}`), pool)) {
      best.set(r.passage.id, Math.max(best.get(r.passage.id) ?? 0, r.score));
    }
  }
  return pool.filter((p) => best.has(p.id)).sort((a, b) => best.get(b.id)! - best.get(a.id)!);
};

const pageOrder: Ranker = (_c, pool) =>
  [...pool].sort((a, b) => a.url.localeCompare(b.url) || a.index - b.index);

export const RANKERS: Record<string, Ranker> = {
  "page order (no retrieval)": pageOrder,
  "BM25 · whole note": noteQuery,
  "BM25 · per-sentence max": sentenceMax,
};

export type Pair = { claim: Claim; url: string; quote: string; pool: Passage[] };

export function goldPairs(): Pair[] {
  if (!existsSync(REVIEWS)) return [];
  const file: ReviewFile = JSON.parse(readFileSync(REVIEWS, "utf8"));
  const passages = loadPassages();
  const pairs: Pair[] = [];
  for (const [id, review] of Object.entries(file.reviews)) {
    const current = claimsFor(getDestination(id.split("/")[0]!)!).find((c) => c.id === id);
    if (!current) continue;
    // Score the claim as it was reviewed, against the quotes the review found.
    const claim = { ...current, text: asReviewedText(id, current.text) };
    const added = correctionEvidence(id);
    for (const q of review.quotes) {
      if (added.has(q.text)) continue;
      // Claim-scoped: the quoted source's passages, or the destination's whole
      // source pool for claims (formats, certs) that have no sources of their own.
      const pool = claim.inheritedSources
        ? claim.sources.flatMap((u) => passages.get(u) ?? [])
        : (passages.get(q.url) ?? []);
      if (pool.some((p) => containsQuote(p.text, q.text)))
        pairs.push({ claim, url: q.url, quote: q.text, pool });
    }
  }
  return pairs;
}

export function recallAt(pairs: Pair[], ranker: Ranker, k: number) {
  const hits = pairs.filter((p) =>
    ranker(p.claim, p.pool)
      .slice(0, k)
      .some((x) => containsQuote(x.text, p.quote)),
  );
  return { recall: hits.length / pairs.length, misses: pairs.filter((p) => !hits.includes(p)) };
}

if (import.meta.main) {
  const pairs = goldPairs();
  if (!pairs.length) {
    console.log(
      "No gold pairs: run `bun scripts/sources/fetch.ts` first (the source cache is private).",
    );
    process.exit(0);
  }
  const sizes = pairs.map((p) => p.pool.length).sort((a, b) => a - b);
  console.log(
    `\n${pairs.length} (claim, quote) gold pairs · candidate pool median ${sizes[sizes.length >> 1]} passages, max ${sizes.at(-1)}\n`,
  );
  for (const [name, ranker] of Object.entries(RANKERS)) {
    const cells = [1, 3, 5].map(
      (k) => `R@${k} ${(recallAt(pairs, ranker, k).recall * 100).toFixed(0)}%`,
    );
    console.log(`${name.padEnd(28)} ${cells.join("   ")}`);
  }
  for (const k of [3, 5]) {
    console.log(`\nWhole-note BM25 misses at k=${k}:`);
    for (const m of recallAt(pairs, noteQuery, k).misses) {
      console.log(`  ${m.claim.id} (pool ${m.pool.length})  ←  "${m.quote.slice(0, 90)}"`);
    }
  }
  console.log(
    "\nBias: gold quotes were found by a reviewer who started from BM25's top passages and searched the full page only when those lacked support, so recall here is optimistic.",
  );
}
