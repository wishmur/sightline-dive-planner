/**
 * Every note in a destination record as an addressable claim with a stable ID.
 * The IDs are derived from the existing structure, so the data file is unchanged:
 *
 *   <dest>/operating · <dest>/experience · <dest>/species/<name-slug>
 *   <dest>/highlight/<rank> · <dest>/format/<index> · <dest>/cert/<cert>
 *
 * Trip formats and cert notes carry no claim-level sources or confidence in the
 * data; they fall back to the record they belong to (see evals/known-issues.ts).
 */
import {
  formatFormat,
  speciesSlug,
  type Confidence,
  type Destination,
  type SpeciesEntry,
} from "@/lib/destinations";

export type ClaimType = "operating" | "experience" | "species" | "highlight" | "format" | "cert";

export type Claim = {
  id: string;
  destinationId: string;
  type: ClaimType;
  label: string;
  text: string;
  confidence: Confidence | null;
  sources: string[];
  /** True when the claim's sources are the destination's, not its own. */
  inheritedSources: boolean;
};

/** How each kind of claim is labelled next to a quote. */
export const CLAIM_KIND_LABEL: Record<ClaimType, string> = {
  operating: "Access",
  experience: "Conditions",
  species: "Marine life",
  highlight: "Highlight",
  format: "Trip format",
  cert: "Certification",
};

export const claimId = {
  operating: (d: Destination) => `${d.id}/operating`,
  experience: (d: Destination) => `${d.id}/experience`,
  species: (d: Destination, s: SpeciesEntry) => `${d.id}/species/${speciesSlug(s.name)}`,
  highlight: (d: Destination, rank: number) => `${d.id}/highlight/${rank}`,
  format: (d: Destination, index: number) => `${d.id}/format/${index}`,
  cert: (d: Destination, cert: string) => `${d.id}/cert/${cert}`,
};

const cache = new Map<string, Claim[]>();

export function claimsFor(d: Destination): Claim[] {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const c = d.conditions;
  const claims: Claim[] = [
    {
      id: claimId.operating(d),
      destinationId: d.id,
      type: "operating",
      label: "Access and operating season",
      text: d.operating_note,
      confidence: d.operating_confidence,
      sources: d.operating_sources,
      inheritedSources: false,
    },
    {
      id: claimId.experience(d),
      destinationId: d.id,
      type: "experience",
      label: "Conditions and experience",
      text: c.experience_note,
      confidence: c.confidence,
      sources: c.sources,
      inheritedSources: false,
    },
    ...d.species.map((s) => ({
      id: claimId.species(d, s),
      destinationId: d.id,
      type: "species" as const,
      label: s.name,
      text: s.note,
      confidence: s.confidence,
      sources: s.sources,
      inheritedSources: false,
    })),
    ...d.highlights.map((h) => ({
      id: claimId.highlight(d, h.rank),
      destinationId: d.id,
      type: "highlight" as const,
      label: h.label,
      text: h.note,
      confidence: h.confidence,
      sources: h.sources,
      inheritedSources: false,
    })),
    ...d.trip_formats.map((t, i) => ({
      id: claimId.format(d, i),
      destinationId: d.id,
      type: "format" as const,
      label: `${formatFormat(t.format)} · ${t.orientation}`,
      text: t.note,
      confidence: null,
      sources: d.sources,
      inheritedSources: true,
    })),
    ...c.required_certs.map((r) => ({
      id: claimId.cert(d, r.cert),
      destinationId: d.id,
      type: "cert" as const,
      label: `${formatFormat(r.cert)} — ${r.requirement}`,
      text: r.note,
      confidence: c.confidence,
      sources: c.sources,
      inheritedSources: true,
    })),
  ];
  cache.set(d.id, claims);
  return claims;
}

export function getClaim(d: Destination, id: string) {
  return claimsFor(d).find((c) => c.id === id);
}

/**
 * Curator markers. The research notes flag the highest-stakes facts in a
 * consistent way ("SNORKEL ONLY.", "BAITED.", "Sources contradict…"). Reading
 * them is deterministic; the integrity eval pins the counts so a data change
 * that drops or adds a marker is noticed. Long-term these belong in the schema.
 */
export function isContested(text: string) {
  return /\b(contradict\w*|disagree\w*|contested|CONTRADICTION)\b/i.test(text);
}

export function isSnorkelOnly(text: string) {
  return /\bsnorkel[- ]only\b/i.test(text);
}

/** Internal research-log markers that leak into user-facing notes. */
export function hasResearchLogMarker(text: string) {
  return /\bOQ-\d+\b|RESOLVED BY TIER|CORROBORATION IMPROVED|SHIPPING CONTESTED/.test(text);
}
