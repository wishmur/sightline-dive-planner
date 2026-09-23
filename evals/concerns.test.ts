import { describe, expect, test } from "bun:test";
import { DESTINATIONS } from "@/lib/destinations";
import { CONCERNS, type ConcernId } from "@/lib/concerns";
import { getPassage, passagesFor } from "@/lib/passages";
import { CONCERN_PHRASES, CONCERN_TERMS, concernHits, MAX_EVIDENCE } from "@/lib/retrieve";
import { GOLD, GOLD_PASSAGE_COUNTS, SPLIT, runMethod, score } from "./concern-metrics";

describe("concern gold integrity", () => {
  test("every destination is labelled for the same sentence split", () => {
    // If a note is edited, its sentence indices move and the labels must be redone.
    for (const d of DESTINATIONS)
      expect({ id: d.id, n: passagesFor(d).length }).toEqual({
        id: d.id,
        n: GOLD_PASSAGE_COUNTS[d.id],
      });
  });
  test("every gold ID resolves to a sentence of its destination", () => {
    for (const [dest, byConcern] of Object.entries(GOLD))
      for (const ids of Object.values(byConcern))
        for (const id of ids ?? [])
          expect({ id, ok: Boolean(getPassage(id)) && id.startsWith(`${dest}/`) }).toEqual({
            id,
            ok: true,
          });
  });
  test("splits are disjoint and cover every destination", () => {
    const all = [...SPLIT.dev, ...SPLIT.test];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(DESTINATIONS.map((d) => d.id).sort());
  });
});

describe("concern retrieval (lexicon) regression gates, test split", () => {
  const s = score(runMethod((d, c) => concernHits(d, c).map((h) => h.passage.id), SPLIT.test));
  // Floors set 2026-09-21 a few points under the measured test numbers
  // (hit 93%, precision@3 81%, abstention 85%); a drop means a regression.
  test("finds relevant evidence for covered concerns", () =>
    expect(s.hit).toBeGreaterThanOrEqual(0.9));
  test("what it shows is about the concern", () =>
    expect(s.precision).toBeGreaterThanOrEqual(0.78));
  test("says 'not covered' when the record is silent", () =>
    expect(s.abstain).toBeGreaterThanOrEqual(0.8));
  test("top sentence precision", () => {
    const top = score(
      runMethod(
        (d, c) =>
          concernHits(d, c)
            .slice(0, 1)
            .map((h) => h.passage.id),
        SPLIT.test,
      ),
    );
    expect(top.precision).toBeGreaterThanOrEqual(0.87);
  });
});

describe("retrieval invariants", () => {
  test("evidence is verbatim: every hit is a sentence of the claim it cites", () => {
    for (const d of DESTINATIONS)
      for (const c of CONCERNS)
        for (const h of concernHits(d, c.id).slice(0, MAX_EVIDENCE))
          expect(h.passage.claim.text.includes(h.passage.text)).toBe(true);
  });
});

// The About page illustrates the vocabulary idea by showing, for a few worries,
// the words the notes actually use instead. An illustration that drifts from the
// lexicon it illustrates is worse than no illustration, so each phrase shown has
// to still be a phrase that concern actually matches on.
describe("the worked example on the About page matches the real lexicon", () => {
  test("every phrase shown scores for the concern it is shown under", () => {
    for (const [concern, phrases] of Object.entries(CONCERN_PHRASES)) {
      for (const phrase of phrases) {
        const hit = CONCERN_TERMS[concern as ConcernId].some((t) => t.re.test(phrase));
        expect({ concern, phrase, matches: hit }).toEqual({ concern, phrase, matches: true });
      }
    }
  });

  test("it shows real concerns, and enough of them to make the point", () => {
    const ids = new Set(CONCERNS.map((c) => c.id));
    for (const concern of Object.keys(CONCERN_PHRASES))
      expect({ concern, real: ids.has(concern as ConcernId) }).toEqual({ concern, real: true });
    expect(Object.keys(CONCERN_PHRASES).length).toBeGreaterThanOrEqual(3);
  });
});
