/**
 * The second-labeller sample: 60 destination × concern pairs, 12 destinations
 * with 5 concerns each, drawn with a fixed seed and frozen in
 * evals/labels/sample.json before anyone labels it.
 *
 * Blind by construction: this module and the labelling server never load the
 * concern gold (a test checks the imports). The labeller sees what the gold
 * labeller saw: every sentence of the record, with the note it comes from, and
 * each concern's definition from src/lib/concerns.ts.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { CONCERNS, type ConcernId } from "@/lib/concerns";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";

export const SAMPLE_FILE = "evals/labels/sample.json";
export const LABELS_FILE = "evals/labels/second-labeller.json";
const SEED = 20260922;
const DESTINATION_COUNT = 12;
const CONCERNS_PER_DESTINATION = 5;

export type SamplePair = { destination: string; concern: ConcernId };
export type Sample = { version: string; seed: number; pairs: SamplePair[] };

export type PairLabel = { relevant: string[]; done: boolean; at?: string };
export type SecondLabels = {
  labeller: string;
  version: string;
  startedAt?: string;
  updatedAt?: string;
  labels: Record<string, PairLabel>;
};

export const pairKey = (p: SamplePair) => `${p.destination}|${p.concern}`;

/** mulberry32: small, seedable, good enough for sampling. */
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

function shuffle<T>(xs: T[], next: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildSample(): Sample {
  const next = rng(SEED);
  const destinations = shuffle(DESTINATIONS.map((d) => d.id).sort(), next).slice(
    0,
    DESTINATION_COUNT,
  );
  const concerns = shuffle(
    CONCERNS.map((c) => c.id),
    next,
  );
  // Consecutive windows over the shuffled concern list: distinct within a
  // destination, and each concern used 4 or 5 times across the 60 pairs.
  const pairs = destinations.flatMap((destination, i) =>
    Array.from({ length: CONCERNS_PER_DESTINATION }, (_, j) => ({
      destination,
      concern: concerns[(i * CONCERNS_PER_DESTINATION + j) % concerns.length]!,
    })),
  );
  // The version changes if the pairs or the sentences they cover change.
  const version = createHash("sha256")
    .update(
      JSON.stringify(
        pairs.map((p) => [
          pairKey(p),
          passagesFor(getDestination(p.destination)!).map((s) => s.id),
        ]),
      ),
    )
    .digest("hex")
    .slice(0, 12);
  return { version, seed: SEED, pairs };
}

export function loadSample(): Sample {
  if (!existsSync(SAMPLE_FILE))
    throw new Error(`${SAMPLE_FILE} missing: run bun evals/label/server.ts --freeze`);
  return JSON.parse(readFileSync(SAMPLE_FILE, "utf8"));
}

/** What the labelling page receives: sentences and definitions, nothing else. */
export function samplePayload(sample: Sample) {
  const ids = [...new Set(sample.pairs.map((p) => p.destination))];
  return {
    version: sample.version,
    concerns: CONCERNS.filter((c) => sample.pairs.some((p) => p.concern === c.id)).map((c) => ({
      id: c.id,
      label: c.label,
      definition: c.definition,
    })),
    destinations: ids.map((id) => {
      const d = getDestination(id)!;
      return {
        id,
        name: d.name,
        concerns: sample.pairs.filter((p) => p.destination === id).map((p) => p.concern),
        sentences: passagesFor(d).map((s) => ({ id: s.id, text: s.text, label: s.claim.label })),
      };
    }),
  };
}

/** Problems with a labels file; empty when it's usable. */
export function validateLabels(sample: Sample, l: SecondLabels): string[] {
  const errors: string[] = [];
  if (l.version !== sample.version)
    errors.push(`labels are for sample ${l.version}, current sample is ${sample.version}`);
  const known = new Map(sample.pairs.map((p) => [pairKey(p), p]));
  for (const [key, label] of Object.entries(l.labels)) {
    const p = known.get(key);
    if (!p) {
      errors.push(`unknown pair ${key}`);
      continue;
    }
    const ids = new Set(passagesFor(getDestination(p.destination)!).map((s) => s.id));
    for (const id of label.relevant)
      if (!ids.has(id)) errors.push(`${key}: unknown sentence ${id}`);
  }
  return errors;
}
