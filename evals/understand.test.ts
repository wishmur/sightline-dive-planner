import { describe, expect, test } from "bun:test";
import { normalizeTrip, parseTripRules } from "@/lib/understand";
import { TARGET_GROUPS } from "@/lib/filters";
import { EMPTY_FILTERS } from "@/lib/filters";
import { runFit } from "@/lib/fit";
import { UNDERSTAND_CASES } from "./understand.gold";
import { HELDOUT_CASES } from "./understand.heldout";
import { scoreCase, summarize } from "./understand-metrics";

describe("describe your trip: rules parser", () => {
  test("dev gold stays fully parsed", () => {
    const s = summarize(UNDERSTAND_CASES.map((c) => scoreCase(c, parseTripRules(c.text))));
    expect(s.exact).toBe(1);
  });
  test("held-out floors (measured 2026-09-21: fields 97%, concern recall 65%)", () => {
    const s = summarize(HELDOUT_CASES.map((c) => scoreCase(c, parseTripRules(c.text))));
    expect(s.fieldAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(s.concernPrecision).toBeGreaterThanOrEqual(0.9);
    expect(s.concernRecall).toBeGreaterThanOrEqual(0.6);
  });
});

describe("normalizeTrip: whatever an engine returns, only known values survive", () => {
  test("unknown IDs, months and enums are dropped", () => {
    const t = normalizeTrip({
      month: 14,
      alsoMonths: [3, 3, -1, 99],
      targets: ["manta-rays", "kraken"],
      cert: "master" as never,
      current: "strong" as never,
      format: "submarine",
      diveType: "macro",
      where: "country:Atlantis",
      concerns: ["cold", "sharks" as never],
      unsupported: ["visas", "weather" as never],
      destinations: ["komodo", "atlantis"],
    });
    expect(t).toEqual({
      month: null,
      alsoMonths: [3],
      targets: ["manta-rays"],
      cert: null,
      current: null,
      format: null,
      diveType: "macro",
      where: null,
      concerns: ["cold"],
      unsupported: ["visas"],
      destinations: ["komodo"],
    });
  });
});

describe("animal names: generic means the group, specific means the species", () => {
  const singular = (p: string) =>
    /(?:us|sh)es$/.test(p) ? p.slice(0, -2) : p.endsWith("s") ? p.slice(0, -1) : p;
  test("every group parses from its label in plural and singular", () => {
    for (const g of TARGET_GROUPS) {
      const plurals = g.label.includes("&")
        ? g.label
            .toLowerCase()
            .replace(/^(\w+) & (\w+) (\w+)$/, "$1 $3|$2 $3")
            .split("|")
        : [g.label.toLowerCase()];
      for (const phrase of plurals.flatMap((p) => [p, singular(p)]))
        expect({ phrase, targets: parseTripRules(phrase).targets }).toEqual({
          phrase,
          targets: [g.id],
        });
    }
  });
  test("a named species stays that species", () => {
    for (const [text, id] of [
      ["humpback whale", "humpback-whale"],
      ["whale shark", "whale-shark"],
      ["spinner dolphin", "spinner-dolphin"],
      ["mimic octopus", "mimic-octopus"],
      ["giant manta", "giant-oceanic-manta-ray"],
    ])
      expect({ text, targets: parseTripRules(text).targets }).toEqual({ text, targets: [id] });
  });
  test("'thresher shark' reaches Malapascua", () => {
    const species = parseTripRules("thresher shark").targets;
    const ids = runFit({ ...EMPTY_FILTERS, species }).results.map((r) => r.destination.id);
    expect(ids).toContain("malapascua");
  });
});
