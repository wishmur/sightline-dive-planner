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

// A verdict marked "caveat" is shown behind a warning icon, so its text has to
// say what the caveat is. "Scalloped hammerhead: peak in January" behind a
// warning reads as a contradiction: the reason it was demoted (thin or disputed
// sourcing) was in the flags and never in the words.
describe("a caveat says what the caveat is", () => {
  test("a species present at peak but flagged names the flag, not just the month", () => {
    const run = runFit(brief({ month: 0, species: ["scalloped-hammerhead"] }));
    const flagged = run.results
      .flatMap((r) => r.verdicts)
      .filter((v) => v.kind === "target" && v.status === "caveat" && v.flags.length);
    expect(flagged.length).toBeGreaterThan(0);
    for (const v of flagged) {
      // "Shoulder" already says why it was demoted; every other flag has to be named.
      const needsWhy = v.flags.some((f) => f !== "shoulder");
      expect({ label: v.label, saysWhy: /—/.test(v.label) }).toEqual({
        label: v.label,
        saysWhy: needsWhy,
      });
      // The good news alone is never the whole caveat.
      expect(v.label).not.toMatch(/^[^—]*peak in \w+$/);
    }
  });

  test("every caveat verdict with flags explains itself, across all briefs", () => {
    for (const b of BASE_BRIEFS) {
      for (const r of runFit(b).results) {
        for (const v of r.verdicts) {
          if (v.status !== "caveat" || !v.flags.length) continue;
          expect({ kind: v.kind, label: v.label, explained: v.label.length > 0 }).toEqual({
            kind: v.kind,
            label: v.label,
            explained: true,
          });
        }
      }
    }
  });

  test("a clean peak month stays clean: no flags, no dash, status met", () => {
    const run = runFit(brief({ month: 0, species: ["scalloped-hammerhead"] }));
    const met = run.results
      .flatMap((r) => r.verdicts)
      .filter((v) => v.kind === "target" && v.status === "met");
    for (const v of met) expect(v.label).not.toContain("—");
  });
});

// "You qualify" is filler, but the line it sat on is not: it carries the
// destination's experience claim. Malta's floor is Open Water while its wartime
// wrecks are trimix dives, and dropping the met line dropped that claim from the
// page — caught by catches.gold.ts, so the line stays and only the wording goes.
describe("the cert line states the bar, without congratulating anyone", () => {
  const certVerdicts = (f: Filters, id: string) => {
    const run = runFit(f);
    return (
      [...run.results, ...run.nearMisses]
        .find((r) => r.destination.id === id)
        ?.verdicts.filter((v) => v.kind === "cert") ?? []
    );
  };
  const floorIs = (need: string) =>
    DESTINATIONS.filter((d) => d.conditions.min_cert === need).map((d) => d.id);

  test("no verdict anywhere tells the diver they qualify", () => {
    for (const cert of ["open_water", "advanced", "advanced_plus_experience"])
      for (const r of runFit(brief({ cert })).results)
        for (const v of r.verdicts) expect(v.label).not.toMatch(/you qualify/i);
  });

  test("a met floor still states the bar, at every rung", () => {
    for (const need of ["open_water", "advanced"])
      for (const id of floorIs(need).slice(0, 5)) {
        const [v] = certVerdicts(brief({ cert: "advanced_plus_experience" }), id);
        expect({ id, status: v?.status }).toEqual({ id, status: "met" });
        expect(v!.label).toMatch(/minimum$/);
      }
  });

  test("a floor the diver misses is always stated", () => {
    for (const id of floorIs("advanced").slice(0, 6)) {
      const [v] = certVerdicts(brief({ cert: "open_water" }), id);
      expect({ id, status: v?.status, reason: v?.reason }).toEqual({
        id,
        status: "violated",
        reason: "cert",
      });
    }
  });

  // The regression this pins: an Open Water diver reading Malta must still meet
  // the experience claim, even though the nominal floor lets them in.
  test("Malta still surfaces its experience claim to an Open Water diver", () => {
    const [v] = certVerdicts(brief({ cert: "open_water" }), "malta");
    expect(v?.claimIds).toContain("malta/experience");
  });
});
