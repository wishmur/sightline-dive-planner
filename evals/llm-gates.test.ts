import { describe, expect, test } from "bun:test";
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { validateSelection } from "@/lib/llm.server";

// Claude's output never reaches the diver unchecked. These gates run whatever
// the model returns; they are tested here without calling it.
describe("sentence-selection gate", () => {
  const ps = passagesFor(getDestination("komodo")!);
  test("only real sentence numbers survive, in order, deduplicated, at most three", () => {
    const s = validateSelection(
      { sentences: [23, 0, 99, 23, 24, 27, 4], status: "answered" },
      ps,
      "m",
    );
    expect(s.passageIds).toEqual([ps[22]!.id, ps[23]!.id, ps[26]!.id]);
    expect(s.rejected).toEqual([0, 99]);
  });
  test("not_covered shows nothing even if sentences were returned", () => {
    expect(
      validateSelection({ sentences: [1, 2], status: "not_covered" }, ps, "m").passageIds,
    ).toEqual([]);
  });
  test("an answer with no surviving sentence becomes not_covered", () => {
    expect(validateSelection({ sentences: [500], status: "answered" }, ps, "m").status).toBe(
      "not_covered",
    );
  });
});
