/**
 * Passage retrieval over source snapshots (offline; never in the request path).
 *
 * Passages: paragraph-aware windows of ~60–160 words with a one-paragraph
 * overlap, so a supporting sentence is never split from its context.
 * Ranking: BM25 over lowercased word tokens with light stemming. Deliberately
 * simple; the evals decide whether anything heavier is warranted.
 */
import { readFileSync, existsSync } from "node:fs";
import { cachePath, hashOf, MANIFEST, type SourceRecord } from "../sources/fetch";
import { tokenize } from "../../src/lib/text";

export type Passage = { id: string; url: string; index: number; text: string; tokens: string[] };

export { tokenize };

const MIN_WORDS = 60;
const MAX_WORDS = 160;

export function chunk(url: string, text: string): Passage[] {
  const paras = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => {
      // Split very long paragraphs on sentence boundaries.
      const words = p.split(/\s+/).length;
      if (words <= MAX_WORDS) return [p];
      const out: string[] = [];
      let cur = "";
      for (const s of p.split(/(?<=[.!?])\s+/)) {
        if ((cur + " " + s).split(/\s+/).length > MAX_WORDS && cur) {
          out.push(cur);
          cur = s;
        } else cur = cur ? `${cur} ${s}` : s;
      }
      if (cur) out.push(cur);
      return out;
    });

  const passages: Passage[] = [];
  let start = 0;
  while (start < paras.length) {
    let end = start;
    let words = 0;
    while (
      end < paras.length &&
      (words < MIN_WORDS || words + paras[end]!.split(/\s+/).length <= MAX_WORDS)
    ) {
      words += paras[end]!.split(/\s+/).length;
      end++;
      if (words >= MAX_WORDS) break;
    }
    const body = paras.slice(start, end).join("\n");
    passages.push({
      id: `${hashOf(url)}#${passages.length}`,
      url,
      index: passages.length,
      text: body,
      tokens: tokenize(body),
    });
    if (end >= paras.length) break;
    start = end - 1 > start ? end - 1 : end; // one-paragraph overlap
  }
  return passages;
}

export function loadPassages(): Map<string, Passage[]> {
  const manifest: SourceRecord[] = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const out = new Map<string, Passage[]>();
  for (const r of manifest) {
    if (r.status !== "ok" || !existsSync(cachePath(r.url))) continue;
    out.set(r.url, chunk(r.url, readFileSync(cachePath(r.url), "utf8")));
  }
  return out;
}

/** BM25 over an arbitrary set of passages (claim-scoped or corpus-wide). */
export function bm25(query: string[], passages: Passage[], k1 = 1.2, b = 0.75) {
  const N = passages.length;
  if (!N) return [];
  const avgdl = passages.reduce((n, p) => n + p.tokens.length, 0) / N;
  const df = new Map<string, number>();
  for (const p of passages) for (const t of new Set(p.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  const q = [...new Set(query)];
  return passages
    .map((p) => {
      const tf = new Map<string, number>();
      for (const t of p.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
        score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * p.tokens.length) / avgdl));
      }
      return { passage: p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Does a passage contain a gold quote? Whitespace/case/punctuation-insensitive. */
export function containsQuote(passage: string, quote: string) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return norm(passage).includes(norm(quote));
}
