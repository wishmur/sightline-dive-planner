import { describe, expect, test } from "bun:test";
import { DESTINATIONS } from "@/lib/destinations";
import { EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { runFit } from "@/lib/fit";
import { BASELINE_EMPTY, baselineApplyFilters } from "./baseline-filters";
import { SCENARIOS } from "./scenarios";

const brief = (b: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...b });
const ids = (f: Filters) => runFit(f).results.map((r) => r.destination.id);

describe("scenario goldens", () => {
  for (const s of SCENARIOS) {
    test(`${s.id} (${s.journey})`, () => {
      const run = runFit(brief(s.brief));
      const got = run.results.map((r) => r.destination.id);
      const byId = new Map(run.results.map((r) => [r.destination.id, r]));
      const near = new Map(run.nearMisses.map((r) => [r.destination.id, r]));

      for (const id of s.mustInclude ?? [])
        expect({ include: id, got: got.includes(id) }).toEqual({ include: id, got: true });
      for (const id of s.mustExclude ?? [])
        expect({ exclude: id, got: got.includes(id) }).toEqual({ exclude: id, got: false });
      if (s.exactCount !== undefined) expect(got.length).toBe(s.exactCount);

      for (const n of s.nearMiss ?? []) {
        const fit = near.get(n.id);
        expect({ nearMiss: n.id, reason: fit?.violation?.reason }).toEqual({
          nearMiss: n.id,
          reason: n.reason,
        });
        for (const m of n.fitsIn ?? [])
          expect({ nearMiss: n.id, fitsIn: m, ok: fit!.fitsIn.includes(m) }).toEqual({
            nearMiss: n.id,
            fitsIn: m,
            ok: true,
          });
      }

      for (const [id, tier] of Object.entries(s.tiers ?? {})) {
        expect({ id, tier: byId.get(id)?.tier }).toEqual({ id, tier });
      }

      for (const [id, flags] of Object.entries(s.flags ?? {})) {
        const fit = byId.get(id) ?? near.get(id);
        const have = new Set(fit?.verdicts.flatMap((v) => v.flags));
        for (const flag of flags)
          expect({ id, flag, has: have.has(flag) }).toEqual({ id, flag, has: true });
      }

      if (s.sameAsBaseline) {
        const base = baselineApplyFilters({ ...BASELINE_EMPTY, ...s.brief, species: [] }).map(
          (d) => d.id,
        );
        expect(got).toEqual(base);
      }
    });
  }
});

// ---------------------------------------------------------------------------

const TARGETS = [[], ["manta-rays"], ["whale-shark"], ["hammerheads"], ["sea-turtles"]];
const MONTHS = ["any", ...Array.from({ length: 12 }, (_, i) => String(i))];
const BASE_BRIEFS: Filters[] = TARGETS.flatMap((species) =>
  MONTHS.map((month) => brief({ species, month })),
);

const subset = (a: string[], b: string[]) => a.every((x) => b.includes(x));

describe("properties", () => {
  test("adding a constraint never enlarges the eligible set", () => {
    const additions: Partial<Filters>[] = [
      { cert: "open_water" },
      { cert: "advanced" },
      { current: "mild" },
      { current: "moderate" },
      { operatingOnly: true },
      { species: ["whale-shark"] },
    ];
    for (const b of BASE_BRIEFS) {
      const before = ids(b);
      for (const add of additions) {
        // A first marine-life target changes the question ("good time overall?" →
        // "good time for this animal?"), replacing the season check rather than
        // adding to it — same as the shipped product. Only extra targets are ANDs.
        if (add.species && b.species.length === 0) continue;
        const next = {
          ...b,
          ...add,
          species: add.species ? [...b.species, ...add.species] : b.species,
        };
        expect(subset(ids(next), before)).toBe(true);
      }
    }
  });

  test("the certification ladder is monotone", () => {
    for (const b of BASE_BRIEFS) {
      const ow = ids({ ...b, cert: "open_water" });
      const adv = ids({ ...b, cert: "advanced" });
      const exp = ids({ ...b, cert: "advanced_plus_experience" });
      expect(subset(ow, adv)).toBe(true);
      expect(subset(adv, exp)).toBe(true);
    }
  });

  test("a closed month is never eligible", () => {
    for (const b of BASE_BRIEFS) {
      if (b.month === "any") continue;
      for (const r of runFit(b).results)
        expect(r.destination.operating_months[Number(b.month)]).not.toBe("closed");
    }
  });

  test("every excluded destination has a stated reason", () => {
    for (const b of BASE_BRIEFS) {
      const run = runFit(b);
      for (const n of run.nearMisses) expect(n.violation).toBeDefined();
    }
  });

  test("near-miss months really do fit", () => {
    for (const b of BASE_BRIEFS) {
      for (const n of runFit(b).nearMisses) {
        for (const m of n.fitsIn)
          expect(ids({ ...b, month: String(m) })).toContain(n.destination.id);
      }
    }
  });

  test("no brief means today's order, untouched", () => {
    expect(ids(EMPTY_FILTERS)).toEqual(DESTINATIONS.map((d) => d.id));
  });

  test("deterministic", () => {
    for (const b of BASE_BRIEFS.slice(0, 20)) expect(ids(b)).toEqual(ids(b));
  });
});
