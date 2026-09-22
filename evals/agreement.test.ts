/**
 * Second labeller: blind sample, labelling server payload, and agreement
 * statistics. Written before evals/label/*.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { CONCERNS } from "@/lib/concerns";
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { GOLD } from "./concern-metrics";
import {
  bootstrapKappa,
  cohensKappa,
  compareLabels,
  type SecondLabels,
} from "./label/agreement-metrics";
import {
  SAMPLE_FILE,
  buildSample,
  loadSample,
  samplePayload,
  validateLabels,
} from "./label/sample";

describe("Cohen's kappa", () => {
  test("textbook 2×2: po 0.70, pe 0.50 → κ 0.40", () => {
    // a = both yes, b = A yes B no, c = A no B yes, d = both no
    expect(cohensKappa({ a: 20, b: 5, c: 10, d: 15 })).toBeCloseTo(0.4, 10);
  });

  test("perfect agreement is 1; agreement no better than chance is 0", () => {
    expect(cohensKappa({ a: 10, b: 0, c: 0, d: 40 })).toBe(1);
    expect(cohensKappa({ a: 25, b: 25, c: 25, d: 25 })).toBeCloseTo(0, 10);
  });

  test("both raters constant and identical: agreement is total, κ defined as 1", () => {
    expect(cohensKappa({ a: 0, b: 0, c: 0, d: 30 })).toBe(1);
  });

  test("bootstrap interval contains the estimate and is deterministic", () => {
    const items = [
      ...Array(20).fill([true, true]),
      ...Array(5).fill([true, false]),
      ...Array(10).fill([false, true]),
      ...Array(15).fill([false, false]),
    ] as [boolean, boolean][];
    const ci = bootstrapKappa(
      items.map((x) => [x]),
      500,
      7,
    );
    expect(ci.low).toBeLessThanOrEqual(0.4);
    expect(ci.high).toBeGreaterThanOrEqual(0.4);
    expect(
      bootstrapKappa(
        items.map((x) => [x]),
        500,
        7,
      ),
    ).toEqual(ci);
  });
});

describe("the sample", () => {
  test("60 pairs: 12 destinations × 5 distinct concerns, every concern 4–5 times", () => {
    const s = buildSample();
    expect(s.pairs).toHaveLength(60);
    const byDest = Map.groupBy(s.pairs, (p) => p.destination);
    expect(byDest.size).toBe(12);
    for (const ps of byDest.values()) expect(new Set(ps.map((p) => p.concern)).size).toBe(5);
    const counts = CONCERNS.map((c) => s.pairs.filter((p) => p.concern === c.id).length);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...counts)).toBeLessThanOrEqual(5);
  });

  test("deterministic, and frozen on disk before any labelling", () => {
    expect(buildSample()).toEqual(buildSample());
    expect(loadSample()).toEqual(buildSample());
  });

  test("the labelling payload carries no gold: whitelisted keys only", () => {
    const payload = samplePayload(loadSample());
    const keys = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
          keys.add(k);
          walk(x);
        }
    };
    walk(payload);
    expect([...keys].sort()).toEqual(
      [
        "concerns",
        "definition",
        "destinations",
        "id",
        "label",
        "name",
        "sentences",
        "text",
        "version",
      ].sort(),
    );
  });

  test("the labelling server never loads the gold", () => {
    for (const f of ["evals/label/server.ts", "evals/label/sample.ts"]) {
      const src = readFileSync(f, "utf8");
      expect({ f, gold: /concerns\.gold|concern-metrics|GOLD/.test(src) }).toEqual({
        f,
        gold: false,
      });
    }
  });
});

describe("labels and agreement", () => {
  const sample = buildSample();
  const fromGold = (): SecondLabels => ({
    labeller: "test",
    version: sample.version,
    labels: Object.fromEntries(
      sample.pairs.map((p) => [
        `${p.destination}|${p.concern}`,
        { relevant: GOLD[p.destination]?.[p.concern] ?? [], done: true },
      ]),
    ),
  });

  test("labels that name sentences outside the record are rejected", () => {
    const l = fromGold();
    const k = `${sample.pairs[0]!.destination}|${sample.pairs[0]!.concern}`;
    l.labels[k] = { relevant: ["komodo/notes/0#999"], done: true };
    expect(validateLabels(sample, l).length).toBeGreaterThan(0);
    expect(validateLabels(sample, fromGold())).toEqual([]);
  });

  test("a labeller who copies the gold agrees perfectly at both levels", () => {
    const r = compareLabels(sample, fromGold(), GOLD);
    expect(r.pairs.n).toBe(60);
    expect(r.pairs.kappa).toBe(1);
    expect(r.sentences.kappa).toBe(1);
    const cells = sample.pairs.reduce(
      (n, p) => n + passagesFor(getDestination(p.destination)!).length,
      0,
    );
    expect(r.sentences.n).toBe(cells);
  });

  test("a labeller who ticks nothing agrees only by chance on coverage", () => {
    const l = fromGold();
    for (const v of Object.values(l.labels)) v.relevant = [];
    const r = compareLabels(sample, l, GOLD);
    expect(r.pairs.kappa).toBeCloseTo(0, 10);
  });

  test("unfinished pairs are left out and counted", () => {
    const l = fromGold();
    const [first] = Object.keys(l.labels);
    l.labels[first!]!.done = false;
    const r = compareLabels(sample, l, GOLD);
    expect(r.pairs.n).toBe(59);
    expect(r.unfinished).toBe(1);
  });
});

test("sample file path", () => {
  expect(SAMPLE_FILE).toBe("evals/labels/sample.json");
});
