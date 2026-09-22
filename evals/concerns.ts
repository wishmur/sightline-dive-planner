/**
 * Concern-evidence retrieval report: `bun evals/concerns.ts [--dense] [--misses dev]`
 *
 * Compares retrievers on the frozen gold (evals/concerns.gold.json):
 * - BM25 with the concern's label, question or definition as the query
 * - the concern lexicon (lib/retrieve.ts)
 * - dense embeddings from a small local model (--dense; downloads the model once)
 * - hybrids (reciprocal-rank fusion)
 *
 * Methods without a natural cut-off (BM25, dense) get their abstention threshold
 * tuned on the dev split and are then scored on test with it frozen. The
 * lexicon's threshold was fixed before any run. Report the test split.
 */
import { DESTINATIONS, type Destination } from "@/lib/destinations";
import { CONCERNS, type ConcernId } from "@/lib/concerns";
import { passagesFor, type Passage } from "@/lib/passages";
import { bm25Hits, concernHits, contextual, lexiconScore } from "@/lib/retrieve";
import { SPLIT, row, runMethod, score, type Method, type Pair } from "./concern-metrics";

const args = process.argv.slice(2);
const concernOf = (id: ConcernId) => CONCERNS.find((c) => c.id === id)!;

type Ranker = (d: Destination, concern: ConcernId) => { id: string; score: number }[];

/**
 * Tune a score threshold on dev: maximise the harmonic mean of hit, precision and
 * abstention, so neither "show everything" nor "show nothing" can win.
 */
function tuned(name: string, rank: Ranker) {
  const scores = SPLIT.dev.flatMap((id) => {
    const d = DESTINATIONS.find((x) => x.id === id)!;
    return CONCERNS.flatMap((c) => rank(d, c.id).map((h) => h.score));
  });
  const grid = [...new Set(scores.map((s) => Number(s.toFixed(3))))].sort((a, b) => a - b);
  let best = { t: 0, j: -1 };
  const step = Math.max(1, Math.floor(grid.length / 200));
  for (let i = 0; i < grid.length; i += step) {
    const th = grid[i]!;
    const s = score(runMethod(cut(rank, th), SPLIT.dev));
    const j = 3 / (1 / s.hit + 1 / s.precision + 1 / s.abstain);
    if (j > best.j) best = { t: th, j };
  }
  return { name: `${name} (t=${best.t.toFixed(2)})`, method: cut(rank, best.t) };
}

const cut =
  (rank: Ranker, threshold: number): Method =>
  (d, c) =>
    rank(d, c)
      .filter((h) => h.score >= threshold)
      .map((h) => h.id);

const bm25 =
  (field: "label" | "question" | "definition"): Ranker =>
  (d, c) =>
    bm25Hits(d, concernOf(c)[field]).map((h) => ({ id: h.passage.id, score: h.score }));

const lexiconRank: Ranker = (d, c) =>
  passagesFor(d)
    .map((p) => ({ id: p.id, score: lexiconScore(c, p) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

const lexicon: Method = (d, c) => concernHits(d, c).map((h) => h.passage.id);

/** Reciprocal-rank fusion; the fused list keeps only items above each ranker's cut. */
function rrf(a: Ranker, b: Ranker, k = 60): Ranker {
  return (d, c) => {
    const fused = new Map<string, number>();
    for (const r of [a, b])
      r(d, c).forEach((h, i) => fused.set(h.id, (fused.get(h.id) ?? 0) + 1 / (k + i + 1)));
    return [...fused.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((x, y) => y.score - x.score);
  };
}

// ---------------------------------------------------------------------------
// Dense (optional)

async function denseRankers() {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = "evals/reports/models";
  const models = [
    {
      name: "bge-small",
      id: "Xenova/bge-small-en-v1.5",
      queryPrefix: "Represent this sentence for searching relevant passages: ",
    },
    { name: "minilm", id: "Xenova/all-MiniLM-L6-v2", queryPrefix: "" },
  ];
  const out: Record<string, Ranker> = {};
  const passages = DESTINATIONS.flatMap(passagesFor);
  for (const m of models) {
    const extract = await pipeline("feature-extraction", m.id, { dtype: "q8" });
    const embed = async (texts: string[]) => {
      const vectors: number[][] = [];
      for (let i = 0; i < texts.length; i += 64) {
        const t = await extract(texts.slice(i, i + 64), {
          pooling: m.name === "minilm" ? "mean" : "cls",
          normalize: true,
        });
        vectors.push(...(t.tolist() as number[][]));
      }
      return vectors;
    };
    const pv = await embed(passages.map(contextual));
    const byId = new Map(passages.map((p, i) => [p.id, pv[i]!]));
    const queries = await embed(CONCERNS.map((c) => `${m.queryPrefix}${c.label}. ${c.definition}`));
    const qv = new Map(CONCERNS.map((c, i) => [c.id, queries[i]!]));
    const dot = (a: number[], b: number[]) => a.reduce((n, x, i) => n + x * b[i]!, 0);
    out[m.name] = (d, c) =>
      passagesFor(d)
        .map((p: Passage) => ({ id: p.id, score: dot(byId.get(p.id)!, qv.get(c)!) }))
        .sort((a, b) => b.score - a.score);
  }
  return out;
}

// ---------------------------------------------------------------------------

/** Ranking quality alone: top-3 over covered pairs with no cut-off, so abstention tuning can't hide anything. */
function rankOnly(name: string, rank: Ranker, split: string[]) {
  const covered = runMethod((d, c) => rank(d, c).map((h) => h.id), split).filter(
    (p) => p.gold.length > 0,
  );
  const hit = covered.filter((p) => p.shown.some((s) => p.gold.includes(s))).length / covered.length;
  const p1 = covered.filter((p) => p.shown[0] && p.gold.includes(p.shown[0])).length / covered.length;
  return `${name.padEnd(30)} hit@3 ${(hit * 100).toFixed(0).padStart(3)}% · precision@1 ${(p1 * 100).toFixed(0).padStart(3)}% (${covered.length} covered pairs)`;
}

const rankers: [string, Ranker][] = [
  ["bm25 · definition", bm25("definition")],
  ["lexicon", lexiconRank],
];

const methods: { name: string; method: Method }[] = [
  tuned("bm25 · label", bm25("label")),
  tuned("bm25 · question", bm25("question")),
  tuned("bm25 · definition", bm25("definition")),
  { name: "lexicon (t=2, fixed)", method: lexicon },
];

if (args.includes("--dense")) {
  const dense = await denseRankers();
  for (const [name, rank] of Object.entries(dense)) {
    methods.push(tuned(`dense · ${name}`, rank));
    methods.push(tuned(`rrf · lexicon + ${name}`, rrf(lexiconRank, rank)));
    rankers.push([`dense · ${name}`, rank]);
  }
  methods.push(tuned("rrf · lexicon + bm25 def", rrf(lexiconRank, bm25("definition"))));
}

for (const split of ["dev", "test"] as const) {
  console.log(
    `\n=== ${split} split (${SPLIT[split].length} destinations × ${CONCERNS.length} concerns) ===`,
  );
  for (const m of methods) console.log(row(m.name, score(runMethod(m.method, SPLIT[split]))));
}

console.log("\n=== ranking only, no abstention (test split) ===");
for (const [name, rank] of rankers) console.log(rankOnly(name, rank, SPLIT.test));

// Per-concern breakdown for the lexicon, test split.
console.log("\n=== lexicon by concern (test) ===");
const lexTest = runMethod(lexicon, SPLIT.test);
for (const c of CONCERNS) console.log(row(c.id, score(lexTest.filter((p) => p.concern === c.id))));

const missSplit = args[args.indexOf("--misses") + 1];
if (args.includes("--misses") && (missSplit === "dev" || missSplit === "test")) {
  const pairs: Pair[] = runMethod(lexicon, SPLIT[missSplit]);
  const text = (id: string) => {
    const d = DESTINATIONS.find((x) => id.startsWith(`${x.id}/`))!;
    return contextual(passagesFor(d).find((p) => p.id === id)!);
  };
  console.log(`\n=== lexicon errors (${missSplit}) ===`);
  for (const p of pairs) {
    const wrong = p.shown.filter((s) => !p.gold.includes(s));
    const missed = p.gold.filter((g) => !p.shown.includes(g));
    if (!wrong.length && !(missed.length && !p.shown.some((s) => p.gold.includes(s)))) continue;
    console.log(`\n${p.destination} · ${p.concern}`);
    for (const w of wrong) console.log(`  + FP ${text(w).slice(0, 150)}`);
    if (!p.shown.some((s) => p.gold.includes(s)))
      for (const m of missed) console.log(`  - FN ${text(m).slice(0, 150)}`);
  }
}
