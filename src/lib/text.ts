/**
 * Tokenising and BM25, shared by the in-product retriever (lib/retrieve.ts) and
 * the offline source-passage tools (scripts/lib/retrieval.ts). Pure: no I/O.
 */

const STOP = new Set(
  "a an and are as at be but by for from has have in is it its of on or that the this to was were will with which you your can not no into than then there their they these those also more most very".split(
    " ",
  ),
);

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ing|es|s)$/, "") : t));
}

export type BM25Doc = { tokens: string[] };

/** Corpus statistics, computed once; scoring can then run over any subset. */
export function bm25Index(docs: BM25Doc[]) {
  const N = docs.length;
  const avgdl = docs.reduce((n, d) => n + d.tokens.length, 0) / Math.max(1, N);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => {
    const n = df.get(t) ?? 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };
  return { N, avgdl, idf };
}

export function bm25Score(
  query: string[],
  doc: BM25Doc,
  index: ReturnType<typeof bm25Index>,
  k1 = 1.2,
  b = 0.75,
) {
  const tf = new Map<string, number>();
  for (const t of doc.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  let score = 0;
  for (const t of new Set(query)) {
    const f = tf.get(t);
    if (!f) continue;
    score +=
      (index.idf(t) * f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.tokens.length) / index.avgdl));
  }
  return score;
}
