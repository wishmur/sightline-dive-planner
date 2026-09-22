/**
 * Inter-annotator agreement between the concern gold and a second labeller.
 *
 * Two levels, both Cohen's kappa with a bootstrap 95% interval (resampling
 * pairs, so sentences of one pair stay together):
 * - pairs: does the record address this concern at all? (covered / not)
 * - sentences: is this sentence evidence for this concern? Every sentence of
 *   every sampled pair, as in the gold. Positives are rare here, so positive
 *   agreement (F1 between the two labellers) is reported alongside.
 */
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import type { ConcernId } from "@/lib/concerns";
import { pairKey, type Sample, type SecondLabels } from "./sample";

export type { SecondLabels } from "./sample";
export type Table = { a: number; b: number; c: number; d: number };

/** a: both yes · b: first yes, second no · c: first no, second yes · d: both no. */
export function cohensKappa({ a, b, c, d }: Table): number {
  const n = a + b + c + d;
  if (!n) return NaN;
  const po = (a + d) / n;
  const pe = ((a + b) / n) * ((a + c) / n) + ((c + d) / n) * ((b + d) / n);
  if (pe === 1) return po === 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}

function tabulate(items: [boolean, boolean][]): Table {
  const t = { a: 0, b: 0, c: 0, d: 0 };
  for (const [x, y] of items) {
    if (x && y) t.a++;
    else if (x) t.b++;
    else if (y) t.c++;
    else t.d++;
  }
  return t;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentile interval from resampling clusters (one cluster = one pair's decisions). */
export function bootstrapKappa(clusters: [boolean, boolean][][], rounds = 2000, seed = 1) {
  const next = rng(seed);
  const ks: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const items: [boolean, boolean][] = [];
    for (let i = 0; i < clusters.length; i++)
      items.push(...clusters[Math.floor(next() * clusters.length)]!);
    const k = cohensKappa(tabulate(items));
    if (!Number.isNaN(k)) ks.push(k);
  }
  ks.sort((x, y) => x - y);
  const at = (q: number) => ks[Math.min(ks.length - 1, Math.floor(q * ks.length))]!;
  return { low: at(0.025), high: at(0.975) };
}

export type Level = {
  n: number;
  table: Table;
  kappa: number;
  ci: { low: number; high: number };
  observed: number;
};

function level(clusters: [boolean, boolean][][]): Level {
  const items = clusters.flat();
  const table = tabulate(items);
  return {
    n: items.length,
    table,
    kappa: cohensKappa(table),
    ci: bootstrapKappa(clusters),
    observed: items.length ? (table.a + table.d) / items.length : NaN,
  };
}

export type Disagreement = {
  destination: string;
  concern: ConcernId;
  goldOnly: string[];
  secondOnly: string[];
};

export function compareLabels(
  sample: Sample,
  second: SecondLabels,
  gold: Record<string, Partial<Record<ConcernId, string[]>>>,
) {
  const done = sample.pairs.filter((p) => second.labels[pairKey(p)]?.done);
  const pairClusters: [boolean, boolean][][] = [];
  const sentenceClusters: [boolean, boolean][][] = [];
  const disagreements: Disagreement[] = [];
  let bothPositive = 0;
  let goldPositive = 0;
  let secondPositive = 0;
  for (const p of done) {
    const g = new Set(gold[p.destination]?.[p.concern] ?? []);
    const s = new Set(second.labels[pairKey(p)]!.relevant);
    pairClusters.push([[g.size > 0, s.size > 0]]);
    const ids = passagesFor(getDestination(p.destination)!).map((x) => x.id);
    sentenceClusters.push(ids.map((id) => [g.has(id), s.has(id)]));
    bothPositive += ids.filter((id) => g.has(id) && s.has(id)).length;
    goldPositive += g.size;
    secondPositive += s.size;
    const goldOnly = [...g].filter((id) => !s.has(id));
    const secondOnly = [...s].filter((id) => !g.has(id));
    if (goldOnly.length || secondOnly.length)
      disagreements.push({ destination: p.destination, concern: p.concern, goldOnly, secondOnly });
  }
  return {
    unfinished: sample.pairs.length - done.length,
    pairs: level(pairClusters),
    sentences: {
      ...level(sentenceClusters),
      positiveAgreement:
        goldPositive + secondPositive ? (2 * bothPositive) / (goldPositive + secondPositive) : NaN,
    },
    disagreements,
  };
}

/** Landis & Koch (1977) bands, the conventional reading of kappa. */
export function band(k: number) {
  if (Number.isNaN(k)) return "n/a";
  if (k < 0) return "poor";
  if (k <= 0.2) return "slight";
  if (k <= 0.4) return "fair";
  if (k <= 0.6) return "moderate";
  if (k <= 0.8) return "substantial";
  return "almost perfect";
}
