/**
 * Invariants of the verification layer (no source cache needed).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { claimsFor } from "@/lib/claims";
import { checkFor, destinationChecks, getReview } from "@/lib/verification";

const reviews = JSON.parse(readFileSync("data/verification/reviews.json", "utf8"));
const corrections: { claimId: string; field: string; after: unknown }[] = JSON.parse(
  readFileSync("data/verification/corrections.json", "utf8"),
);
const allIds = new Set(DESTINATIONS.flatMap((d) => claimsFor(d)).map((c) => c.id));

describe("reviews", () => {
  test("every review points at a real claim", () => {
    for (const id of Object.keys(reviews.reviews))
      expect({ id, exists: allIds.has(id) }).toEqual({ id, exists: true });
  });

  test("quotes are short (≤ 25 words) and attributed", () => {
    for (const [id, r] of Object.entries<{ quotes: { url: string; text: string }[] }>(
      reviews.reviews,
    )) {
      for (const q of r.quotes) {
        expect({ id, ok: q.text.split(/\s+/).length <= 25 && q.url.startsWith("http") }).toEqual({
          id,
          ok: true,
        });
      }
    }
  });

  test("supported and partial verdicts carry evidence", () => {
    for (const [id, r] of Object.entries<{ verdict: string; quotes: unknown[] }>(reviews.reviews)) {
      if (r.verdict === "supported" || r.verdict === "partial")
        expect({ id, quotes: r.quotes.length > 0 }).toEqual({ id, quotes: true });
    }
  });
});

describe("corrections", () => {
  test("every correction is applied to the dataset", () => {
    for (const c of corrections) {
      const d = getDestination(c.claimId.split("/")[0]!)! as unknown as Record<string, unknown> & {
        species: { name: string }[];
      };
      const m = c.field.match(/^species\[(.+)\]\.(\w+)$/);
      const value = m
        ? (d.species.find((s) => s.name === m[1]) as Record<string, unknown>)[m[2]!]
        : d[c.field];
      expect({ claim: c.claimId, field: c.field, value }).toEqual({
        claim: c.claimId,
        field: c.field,
        value: c.after,
      });
    }
  });

  test("every corrected claim's review is marked corrected", () => {
    for (const id of new Set(corrections.map((c) => c.claimId))) {
      expect({ id, corrected: Boolean(getReview(id)?.correction) }).toEqual({
        id,
        corrected: true,
      });
    }
  });
});

describe("what divers see", () => {
  test("statuses", () => {
    const at = new Date("2026-09-22");
    expect(checkFor("komodo/operating", at).status).toBe("corrected");
    expect(checkFor("malta/cert/trimix", at).status).toBe("unconfirmed");
    expect(checkFor("silfra/cert/drysuit", at).status).toBe("confirmed");
    expect(checkFor("komodo/summary", at).status).toBe("unchecked");
  });

  test("access claims come due for recheck after 12 months; others after 36", () => {
    expect(checkFor("tubbataha/operating", new Date("2027-10-01")).status).toBe("due");
    expect(checkFor("silfra/cert/drysuit", new Date("2027-10-01")).status).toBe("due");
    expect(checkFor("malapascua/highlight/1", new Date("2027-10-01")).status).toBe("confirmed");
    expect(checkFor("malapascua/highlight/1", new Date("2029-10-01")).status).toBe("due");
  });

  test("destination summaries add up", () => {
    const k = destinationChecks("komodo");
    expect(k.confirmed + k.partial + k.corrected + k.unconfirmed + k.stale).toBe(k.checked);
  });
});
