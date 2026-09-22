import { describe, expect, test } from "bun:test";
import { EMPTY_FILTERS } from "@/lib/filters";
import { runFit } from "@/lib/fit";
import { CONCERN_SCENARIOS } from "./concern-scenarios";

describe("concern scenarios", () => {
  for (const s of CONCERN_SCENARIOS) {
    test(s.id, () => {
      const run = runFit({ ...EMPTY_FILTERS, ...s.brief });
      const all = [...run.results, ...run.nearMisses];
      const flagsOf = (id: string) => {
        const fit = all.find((r) => r.destination.id === id);
        expect({ id, present: Boolean(fit) }).toEqual({ id, present: true });
        return new Set(fit!.verdicts.flatMap((v) => v.flags));
      };
      for (const [id, flags] of Object.entries(s.flagged ?? {}))
        for (const flag of flags)
          expect({ id, flag, has: flagsOf(id).has(flag as never) }).toEqual({
            id,
            flag,
            has: true,
          });
      for (const [id, flags] of Object.entries(s.notFlagged ?? {}))
        for (const flag of flags)
          expect({ id, flag, has: flagsOf(id).has(flag as never) }).toEqual({
            id,
            flag,
            has: false,
          });
      const order = run.results.map((r) => r.destination.id);
      for (const [a, b] of s.before ?? [])
        expect({
          a,
          b,
          before: order.indexOf(a) >= 0 && order.indexOf(a) < order.indexOf(b),
        }).toEqual({ a, b, before: true });
    });
  }
});
