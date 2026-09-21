import { expect, test } from "bun:test";
import { DEFAULT_EVIDENCE, monthsMentioned } from "@/lib/fit";
import { scoreCatches, summarize } from "./catches";

// Targets set in the plan before the selector was written.
const MIN_RECALL = 0.9;
const MAX_MEDIAN_PANEL = 6;

test("critical-catch recall and panel size on the original gold (shipped settings)", () => {
  const results = scoreCatches(DEFAULT_EVIDENCE).filter((r) => !r.c.addedAfter);
  const s = summarize(results);
  const misses = results
    .filter((r) => r.missed.length)
    .map((r) => `${r.c.id}: ${JSON.stringify(r.missed)}`);
  if (s.recall < MIN_RECALL) console.log(misses.join("\n"));
  expect(s.recall).toBeGreaterThanOrEqual(MIN_RECALL);
  expect(s.median).toBeLessThanOrEqual(MAX_MEDIAN_PANEL);
});

test("month mentions: single months, ranges, wraparound, prose", () => {
  const set = (t: string) => [...monthsMentioned(t)].sort((a, b) => a - b);
  expect(set("Water hits 18C around March")).toEqual([2]);
  expect(set("Cool season (Jun-Nov) drops to 16-18C")).toEqual([5, 6, 7, 8, 9, 10]);
  expect(set("Dec-Feb monsoon swell")).toEqual([0, 1, 11]);
  expect(set("Roughly mid-March to mid-June only")).toEqual([2, 3, 4, 5]);
  expect(set("in the Feb–Apr whale window")).toEqual([1, 2, 3]);
  expect(set("Open Water divers may be admissible")).toEqual([]);
  expect(set("marine research on the Marine Park")).toEqual([]);
});
