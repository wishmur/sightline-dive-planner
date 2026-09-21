import { describe, expect, test } from "bun:test";
import { DESTINATIONS, SPECIES_GROUPS } from "@/lib/destinations";
import { GROUP_DEFS, canonicalSpeciesId } from "@/lib/taxonomy";
import { claimId, claimsFor, hasResearchLogMarker, isContested, isSnorkelOnly } from "@/lib/claims";
import { CERT_LADDER, CURRENT_LADDER } from "@/lib/fit";
import { EMPTY_SPECIES_NOTES, NEVER_PRESENT, RESEARCH_LOG_MARKERS } from "./known-issues";

const MONTH_STATES = ["peak", "shoulder", "off", "absent"];
const OPERATING = ["open", "limited", "closed"];
const CONFIDENCE = ["high", "medium", "low"];

describe("schema", () => {
  test("destination IDs are unique", () => {
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(DESTINATIONS.length);
  });

  test("every calendar has 12 valid months", () => {
    for (const d of DESTINATIONS) {
      expect(d.operating_months).toHaveLength(12);
      expect(d.best_months_overall).toHaveLength(12);
      expect(d.operating_months.every((m) => OPERATING.includes(m))).toBe(true);
      expect(d.best_months_overall.every((m) => MONTH_STATES.includes(m))).toBe(true);
      for (const s of d.species) {
        expect(s.months).toHaveLength(12);
        expect(s.months.every((m) => MONTH_STATES.includes(m))).toBe(true);
      }
    }
  });

  test("enums the fit engine relies on are valid", () => {
    for (const d of DESTINATIONS) {
      expect(CERT_LADDER).toContain(d.conditions.min_cert);
      expect([...CURRENT_LADDER, "variable"]).toContain(d.conditions.current);
      expect(CONFIDENCE).toContain(d.operating_confidence);
      expect(CONFIDENCE).toContain(d.conditions.confidence);
      for (const s of d.species) expect(CONFIDENCE).toContain(s.confidence);
      for (const h of d.highlights) expect(CONFIDENCE).toContain(h.confidence);
    }
  });
});

describe("taxonomy", () => {
  const ids = new Set(SPECIES_GROUPS.map((g) => g.slug));

  test("every group member is a real canonical species", () => {
    for (const g of GROUP_DEFS)
      for (const m of g.members)
        expect({ group: g.id, member: m, known: ids.has(m) }).toEqual({
          group: g.id,
          member: m,
          known: true,
        });
  });

  test("group IDs never collide with species IDs", () => {
    for (const g of GROUP_DEFS) expect(ids.has(g.id)).toBe(false);
  });

  test("no destination lists the same canonical species twice", () => {
    for (const d of DESTINATIONS) {
      const c = d.species.map(canonicalSpeciesId);
      expect(new Set(c).size).toBe(c.length);
    }
  });

  test("known duplicate names are merged", () => {
    expect(SPECIES_GROUPS.find((g) => g.slug === "green-turtle")?.matches).toHaveLength(9);
    expect(SPECIES_GROUPS.find((g) => g.slug === "galapagos-shark")?.matches).toHaveLength(2);
  });
});

describe("provenance", () => {
  test("every claim that owns its sources has at least one", () => {
    const missing = DESTINATIONS.flatMap((d) => claimsFor(d))
      .filter((c) => !c.inheritedSources && c.sources.length === 0)
      .map((c) => c.id);
    expect(missing).toEqual([]);
  });

  test("claim IDs are unique", () => {
    const all = DESTINATIONS.flatMap((d) => claimsFor(d)).map((c) => c.id);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("known anomalies (exact match — triage any change)", () => {
  test("listings that are never peak or shoulder", () => {
    const found = DESTINATIONS.flatMap((d) =>
      d.species
        .filter((s) => !s.months.some((m) => m === "peak" || m === "shoulder"))
        .map((s) => claimId.species(d, s)),
    );
    expect(found.sort()).toEqual(Object.keys(NEVER_PRESENT).sort());
  });

  test("research-log markers in user-facing notes", () => {
    const found = DESTINATIONS.flatMap((d) => claimsFor(d))
      .filter((c) => hasResearchLogMarker(c.text))
      .map((c) => c.id);
    expect(found.sort()).toEqual([...RESEARCH_LOG_MARKERS].sort());
  });

  test("empty species notes", () => {
    const empty = DESTINATIONS.flatMap((d) => d.species).filter((s) => !s.note.trim()).length;
    expect(empty).toBe(EMPTY_SPECIES_NOTES);
  });
});

describe("curator markers the engine reads (pinned)", () => {
  const highlights = DESTINATIONS.flatMap((d) =>
    d.highlights.map((h) => ({ id: claimId.highlight(d, h.rank), note: h.note })),
  );

  test("snorkel-only highlights", () => {
    // First pinned at 4 from an uppercase-marker scan that required "." after the
    // marker; it missed "SNORKEL ONLY in practice" (Moorea humpbacks) and
    // "SNORKEL ONLY at Jellyfish Lake" (Palau). Both are genuine.
    expect(
      highlights
        .filter((h) => isSnorkelOnly(h.note))
        .map((h) => h.id)
        .sort(),
    ).toEqual([
      "baa-atoll/highlight/1",
      "baa-atoll/highlight/2",
      "moorea/highlight/2",
      "ningaloo/highlight/1",
      "ningaloo/highlight/4",
      "palau/highlight/4",
    ]);
  });

  test("contested species and highlight notes", () => {
    const contested = DESTINATIONS.flatMap((d) => [
      ...d.species.filter((s) => isContested(s.note)).map((s) => claimId.species(d, s)),
      ...d.highlights.filter((h) => isContested(h.note)).map((h) => claimId.highlight(d, h.rank)),
    ]).sort();
    expect(contested).toEqual([
      "alor/species/scalloped-hammerhead",
      "cabo-pulmo/highlight/3",
      "cabo-pulmo/species/bull-shark",
      "socorro/species/whale-shark",
      "tulamben/species/bumphead-parrotfish",
      // "CONTESTED ORIGIN" of the monument: a real disagreement, but it names no
      // species, so it can never attach to a marine-life verdict.
      "yonaguni/highlight/2",
    ]);
  });
});
