/**
 * Claim sentences: the retrieval unit for questions and concerns.
 *
 * A claim note can run to 130 words and cover four topics; the sentence that
 * answers "will I get seasick?" is usually one of them. Passages are the note's
 * own sentences, verbatim, with a stable ID (<claimId>#<n>) so gold labels,
 * answers and the UI all point at the same text. Very short fragments ("Dec-Mar.",
 * "BAITED.") are joined to the sentence they introduce.
 */
import { DESTINATIONS, type Destination } from "@/lib/destinations";
import { claimsFor, type Claim } from "@/lib/claims";

export type Passage = {
  id: string;
  claimId: string;
  destinationId: string;
  index: number;
  text: string;
  claim: Claim;
};

const BOUNDARY = /(?<=[.!?])\s+(?=[A-Z0-9"“(‘'])/;
const SHORT_WORDS = 3;

export function splitSentences(text: string): string[] {
  const raw = text
    .split(BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);
  // "Ribbon Reef No. 10": not a boundary.
  const joined: string[] = [];
  for (const s of raw) {
    const prev = joined.at(-1);
    if (prev && /\bNo\.$/.test(prev) && /^\d/.test(s)) joined[joined.length - 1] = `${prev} ${s}`;
    else joined.push(s);
  }
  // Fragments of three words or fewer introduce the next sentence.
  const out: string[] = [];
  let carry = "";
  for (const s of joined) {
    const text = carry ? `${carry} ${s}` : s;
    if (s.split(/\s+/).length <= SHORT_WORDS) carry = text;
    else {
      out.push(text);
      carry = "";
    }
  }
  if (carry) {
    if (out.length) out[out.length - 1] = `${out[out.length - 1]} ${carry}`;
    else out.push(carry);
  }
  return out;
}

const cache = new Map<string, Passage[]>();

export function passagesFor(d: Destination): Passage[] {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const out: Passage[] = [];
  for (const claim of claimsFor(d)) {
    splitSentences(claim.text).forEach((text, index) =>
      out.push({
        id: `${claim.id}#${index}`,
        claimId: claim.id,
        destinationId: d.id,
        index,
        text,
        claim,
      }),
    );
  }
  cache.set(d.id, out);
  return out;
}

export function allPassages(): Passage[] {
  return DESTINATIONS.flatMap(passagesFor);
}

export function getPassage(id: string): Passage | undefined {
  const destinationId = id.split("/")[0]!;
  const d = DESTINATIONS.find((x) => x.id === destinationId);
  return d ? passagesFor(d).find((p) => p.id === id) : undefined;
}
