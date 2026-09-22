/**
 * Trip fit: how well each destination fits a diver's brief, and why.
 *
 * Deterministic by design. Every verdict comes from structured fields (month
 * states, operating calendar, cert floor, current) or from the curator's own
 * explicit markers in the notes. Nothing here generates text beyond short labels
 * assembled from those fields, and nothing ranks by popularity.
 *
 * Tiers: good (no caveats) → caveats (fewest first) → near miss (exactly one
 * constraint broken, named) → out. Low confidence on a deciding claim is a caveat:
 * it can demote a destination, never promote one.
 */
import {
  DESTINATIONS,
  MONTHS,
  SPECIES_GROUPS,
  bestMonthsLabel,
  formatFormat,
  type Confidence,
  type Destination,
  type MonthState,
  type SpeciesEntry,
} from "@/lib/destinations";
import { aliasesFor, canonicalSpeciesId, getGroupDef } from "@/lib/taxonomy";
import {
  claimId,
  getClaim,
  isContested,
  isNotInWater,
  isSnorkelOnly,
  type Claim,
} from "@/lib/claims";
import { certLabel } from "@/lib/cards";
import { hasDiscoveredConflict } from "@/lib/verification";
import { passesScope, targetLabel, type Filters } from "@/lib/filters";
import type { ConcernId } from "@/lib/concerns";
import { concernHits } from "@/lib/retrieve";

export const CERT_LADDER = ["open_water", "advanced", "advanced_plus_experience"];
export const CURRENT_LADDER = ["none", "mild", "moderate", "strong"];

export type Flag =
  | "limited"
  | "shoulder"
  | "low_confidence"
  | "contested"
  | "snorkel_only"
  | "not_in_water"
  | "baited"
  | "required_cert"
  | "current_variable"
  | "liveaboard_only"
  | "no_snorkel"
  | "cold_water"
  | "rough_water";

export type Reason = "closed" | "operating" | "target" | "season" | "cert" | "current";
export type Status = "met" | "caveat" | "violated";

export type Verdict = {
  kind: "access" | "target" | "season" | "cert" | "current" | "required_cert" | "concern";
  status: Status;
  reason?: Reason;
  flags: Flag[];
  /** Full sentence for the destination panel. */
  label: string;
  /** Compact form for cards and near-miss rows. */
  short: string;
  claimIds: string[];
  targetId?: string;
  concern?: ConcernId;
};

export type Tier = "good" | "caveats" | "near_miss" | "out";

export type DestinationFit = {
  destination: Destination;
  verdicts: Verdict[];
  tier: Tier;
  caveats: number;
  /** Set only for near misses: the one constraint that breaks. */
  violation?: Verdict;
  /** Near misses fixable by timing: months in which the same brief would fit. */
  fitsIn: number[];
  /** Brief targets this destination has no record of at all. */
  unlisted: string[];
};

export const FLAG_LABEL: Record<Flag, string> = {
  limited: "Limited access",
  shoulder: "Shoulder season",
  low_confidence: "Thinly sourced",
  contested: "Sources disagree",
  snorkel_only: "Snorkel-only encounter",
  not_in_water: "Not an in-water encounter",
  baited: "Baited encounter",
  required_cert: "Extra cert required",
  current_variable: "Variable current",
  liveaboard_only: "Liveaboard only",
  no_snorkel: "No snorkel option",
  cold_water: "Cold water",
  rough_water: "Rough water",
};

/** Most decision-relevant caveat first: what a card shows when space allows one. */
export const FLAG_PRIORITY: Flag[] = [
  "not_in_water",
  "snorkel_only",
  "contested",
  "limited",
  "liveaboard_only",
  "rough_water",
  "cold_water",
  "no_snorkel",
  "required_cert",
  "current_variable",
  "baited",
  "low_confidence",
  "shoulder",
];

export function topFlags(fit: DestinationFit): Flag[] {
  const flags = new Set(fit.verdicts.filter((v) => v.status !== "met").flatMap((v) => v.flags));
  return FLAG_PRIORITY.filter((f) => flags.has(f));
}

/** [10, 11, 0, 1] → "Nov–Feb"; [2, 5, 6] → "Mar, Jun–Jul". */
export function monthRanges(months: number[]): string {
  if (months.length === 12) return "year-round";
  const set = new Set(months);
  const abbr = (m: number) => MONTHS[m]!.slice(0, 3);
  const starts = months.filter((m) => !set.has((m + 11) % 12)).sort((a, b) => a - b);
  return starts
    .map((start) => {
      let end = start;
      while (set.has((end + 1) % 12) && (end + 1) % 12 !== start) end = (end + 1) % 12;
      return end === start ? abbr(start) : `${abbr(start)}–${abbr(end)}`;
    })
    .join(", ");
}

// ---------------------------------------------------------------------------
// Brief and targets

export function hasBrief(f: Filters) {
  return (
    f.month !== "any" ||
    f.species.length > 0 ||
    f.cert !== "any" ||
    f.current !== "any" ||
    f.concerns.length > 0
  );
}

export type Target = { id: string; label: string; members: string[] };

export function resolveTarget(id: string): Target | null {
  const group = getGroupDef(id);
  if (group) return { id, label: group.label, members: group.members };
  const species = SPECIES_GROUPS.find((s) => s.slug === id);
  return species ? { id, label: species.name, members: [id] } : null;
}

const STATE_RANK: Record<MonthState, number> = { peak: 3, shoulder: 2, off: 1, absent: 0 };
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };

function bestState(months: MonthState[]): MonthState {
  return months.reduce((a, b) => (STATE_RANK[b] > STATE_RANK[a] ? b : a), "absent" as MonthState);
}

function mentions(text: string, aliases: string[]) {
  const t = text.toLowerCase();
  return aliases.some((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t));
}

function listingsFor(d: Destination, target: Target) {
  return d.species.filter((s) => target.members.includes(canonicalSpeciesId(s)));
}

function targetAliases(listings: SpeciesEntry[]) {
  return [...new Set(listings.flatMap((s) => aliasesFor(canonicalSpeciesId(s), s.name)))];
}

function linkedHighlights(d: Destination, listings: SpeciesEntry[]) {
  const aliases = targetAliases(listings);
  return d.highlights.filter((h) => mentions(`${h.label} ${h.note}`, aliases));
}

function seasonPhrase(months: MonthState[]) {
  const peak = bestMonthsLabel(months);
  if (peak) return peak.replace(/^Best/, "best");
  const best = bestState(months);
  if (best === "shoulder") return "seen, but no clear peak";
  if (best === "off") return "not reliably seen";
  return "not found here";
}

// ---------------------------------------------------------------------------
// Verdicts

function accessVerdict(d: Destination, month: number, operatingOnly: boolean): Verdict {
  const state = d.operating_months[month] ?? "open";
  const m = MONTHS[month];
  const mm = m!.slice(0, 3);
  const operating = [claimId.operating(d)];
  if (state === "closed") {
    return {
      kind: "access",
      status: "violated",
      reason: "closed",
      flags: [],
      label: `Closed in ${m}`,
      short: `Closed in ${mm}`,
      claimIds: operating,
    };
  }
  if (state === "limited") {
    return {
      kind: "access",
      status: operatingOnly ? "violated" : "caveat",
      reason: operatingOnly ? "operating" : undefined,
      flags: ["limited"],
      label: `Limited operating in ${m}`,
      short: `Limited access in ${mm}`,
      claimIds: operating,
    };
  }
  return {
    kind: "access",
    status: "met",
    flags: [],
    label: `Operating in ${m}`,
    short: `Open in ${mm}`,
    claimIds: [],
  };
}

function targetVerdict(d: Destination, target: Target, month: number | null): Verdict | null {
  const listings = listingsFor(d, target);
  if (listings.length === 0) return null;

  const stateOf = (s: SpeciesEntry) => (month === null ? bestState(s.months) : s.months[month]!);
  const [best] = [...listings].sort(
    (a, b) =>
      STATE_RANK[stateOf(b)] - STATE_RANK[stateOf(a)] ||
      CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence],
  );
  const s = best!;
  const state = stateOf(s);
  const highlights = linkedHighlights(d, listings);

  const flags: Flag[] = [];
  const claimIds = [claimId.species(d, s)];
  if (state === "shoulder") flags.push("shoulder");
  if (s.confidence === "low") flags.push("low_confidence");
  // Contested if the curator wrote it down, or a source review found an
  // undeclared disagreement in another cited source.
  const contestedHighlights = highlights.filter(
    (h) => isContested(h.note) || hasDiscoveredConflict(claimId.highlight(d, h.rank)),
  );
  if (
    isContested(s.note) ||
    hasDiscoveredConflict(claimId.species(d, s)) ||
    contestedHighlights.length
  ) {
    flags.push("contested");
  }
  const snorkel = highlights.filter((h) => isSnorkelOnly(h.note));
  if (snorkel.length) flags.push("snorkel_only");
  // The species claim is already cited, so the panel quotes the note that says so.
  if (isNotInWater(s.note)) flags.push("not_in_water");
  if (s.encounter_type !== "natural") flags.push("baited");
  for (const h of [...contestedHighlights, ...snorkel]) {
    const id = claimId.highlight(d, h.rank);
    if (!claimIds.includes(id)) claimIds.push(id);
  }

  const present = state === "peak" || state === "shoulder";
  const stateWord = present ? state : state === "off" ? "not reliably seen" : "not present";
  const label =
    month === null
      ? `${s.name}: ${seasonPhrase(s.months)}`
      : `${s.name}: ${stateWord} in ${MONTHS[month]}`;
  const short =
    month === null
      ? `${target.label}: ${seasonPhrase(s.months)}`
      : `${target.label}: ${stateWord} in ${MONTHS[month]!.slice(0, 3)}`;

  return {
    kind: "target",
    status: !present ? "violated" : flags.length ? "caveat" : "met",
    reason: present ? undefined : "target",
    flags,
    label,
    short,
    claimIds,
    targetId: target.id,
  };
}

function seasonVerdict(d: Destination, month: number): Verdict {
  const state = d.best_months_overall[month]!;
  const m = MONTHS[month]!;
  const mm = m.slice(0, 3);
  if (state === "peak") {
    return {
      kind: "season",
      status: "met",
      flags: [],
      label: `Peak season in ${m}`,
      short: `Peak season in ${mm}`,
      claimIds: [],
    };
  }
  if (state === "shoulder") {
    return {
      kind: "season",
      status: "caveat",
      flags: ["shoulder"],
      label: `Shoulder season in ${m}`,
      short: `Shoulder season in ${mm}`,
      claimIds: [],
    };
  }
  return {
    kind: "season",
    status: "violated",
    reason: "season",
    flags: [],
    label: `Off season in ${m}`,
    short: `Off season in ${mm}`,
    claimIds: [],
  };
}

function certVerdicts(d: Destination, cert: string): Verdict[] {
  const need = d.conditions.min_cert;
  const ok = CERT_LADDER.indexOf(cert) >= CERT_LADDER.indexOf(need);
  const verdicts: Verdict[] = [
    {
      kind: "cert",
      status: ok ? "met" : "violated",
      reason: ok ? undefined : "cert",
      flags: [],
      label: ok ? `${certLabel(need)} floor — you qualify` : `Needs ${certLabel(need)}`,
      short: ok ? `${certLabel(need)} floor` : `Needs ${certLabel(need)}`,
      claimIds: [claimId.experience(d)],
    },
  ];
  for (const r of d.conditions.required_certs) {
    if (r.requirement !== "required") continue;
    verdicts.push({
      kind: "required_cert",
      status: "caveat",
      flags: ["required_cert"],
      label: `${formatFormat(r.cert)} certification required`,
      short: `${formatFormat(r.cert)} cert required`,
      claimIds: [claimId.cert(d, r.cert)],
    });
  }
  return verdicts;
}

function currentVerdict(d: Destination, max: string): Verdict {
  const current = d.conditions.current;
  const experience = [claimId.experience(d)];
  if (current === "variable") {
    return {
      kind: "current",
      status: "caveat",
      flags: ["current_variable"],
      label: "Variable current — can run hard",
      short: "Variable current",
      claimIds: experience,
    };
  }
  const ok = CURRENT_LADDER.indexOf(current) <= CURRENT_LADDER.indexOf(max);
  const name = current.charAt(0).toUpperCase() + current.slice(1);
  return {
    kind: "current",
    status: ok ? "met" : "violated",
    reason: ok ? undefined : "current",
    flags: [],
    label: ok ? `${name} current` : `${name} current — above your limit`,
    short: `${name} current`,
    claimIds: experience,
  };
}

// ---------------------------------------------------------------------------
// Concerns. Only three change ranking, each through a fact that is exact in the
// data, and only as a caveat. Every other concern is evidence only (retrieve.ts).

const SLEEP_ABOARD = new Set(["liveaboard", "expedition"]);

const SEA_STATE = /\b(?:rough|swell|high waves|winds?|blown?[- ]out|sea state)\b/i;

/** A sea-state warning in the record that names the trip month. */
export function roughSpell(d: Destination, month: number): { claimId: string } | null {
  for (const { passage } of concernHits(d, "seasickness")) {
    if (!SEA_STATE.test(passage.text)) continue;
    const months = new Set([
      ...monthsMentioned(passage.text),
      ...seasonMonths(passage.text, d.coordinates.lat),
    ]);
    if (months.has(month)) return { claimId: passage.claimId };
  }
  return null;
}

function seasicknessVerdict(d: Destination, month: number | null): Verdict {
  const aboard =
    d.trip_formats.length > 0 && d.trip_formats.every((t) => SLEEP_ABOARD.has(t.format));
  const rough = month === null ? null : roughSpell(d, month);
  const flags: Flag[] = [];
  if (aboard) flags.push("liveaboard_only");
  if (rough) flags.push("rough_water");
  const m = month === null ? "" : MONTHS[month]!;
  if (!flags.length) {
    return {
      kind: "concern",
      concern: "seasickness",
      status: "met",
      flags: [],
      label: m
        ? `Can be dived without a liveaboard; no rough-water warning for ${m}`
        : "Can be dived without a liveaboard",
      short: "Not liveaboard-only",
      claimIds: [],
    };
  }
  const parts = [
    aboard ? "Only reachable by liveaboard" : null,
    rough ? `${aboard ? "rough" : "Rough"} water noted for ${m}` : null,
  ].filter(Boolean);
  return {
    kind: "concern",
    concern: "seasickness",
    status: "caveat",
    flags,
    label: parts.join("; "),
    short: aboard ? "Liveaboard only" : `Rough water in ${m.slice(0, 3)}`,
    claimIds: [
      ...(aboard ? d.trip_formats.map((_, i) => claimId.format(d, i)) : []),
      ...(rough ? [rough.claimId] : []),
    ],
  };
}

function nonDiverVerdict(d: Destination): Verdict {
  const formats = d.trip_formats
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.orientation === "snorkel" || t.orientation === "mixed");
  const highlights = d.highlights.filter((h) => isSnorkelOnly(h.note));
  if (formats.length || highlights.length) {
    return {
      kind: "concern",
      concern: "non_diver",
      status: "met",
      flags: [],
      label: "Snorkelling options in this record",
      short: "Snorkel options",
      claimIds: [
        ...formats.map(({ i }) => claimId.format(d, i)),
        ...highlights.map((h) => claimId.highlight(d, h.rank)),
      ],
    };
  }
  return {
    kind: "concern",
    concern: "non_diver",
    status: "caveat",
    flags: ["no_snorkel"],
    label: "No snorkelling option in this record",
    short: "No snorkel option",
    claimIds: [],
  };
}

const COLD_C = 22;
const TEMP = /\b(\d{1,2})(?:\s?[-–]\s?\d{1,2})?\s?°?C\b/g;

/** Months a note's season words refer to, by the destination's hemisphere. */
function seasonMonths(text: string, lat: number): number[] {
  const north = lat >= 0;
  const out: number[] = [];
  if (/\bwinter\b/i.test(text)) out.push(...(north ? [11, 0, 1] : [5, 6, 7]));
  if (/\bsummer\b/i.test(text)) out.push(...(north ? [5, 6, 7] : [11, 0, 1]));
  return out;
}

/** The record's coldest stated temperature for a month, from its cold-water notes. */
export function coldSpell(
  d: Destination,
  month: number,
): { tempC: number; claimId: string } | null {
  let best: { tempC: number; claimId: string } | null = null;
  for (const { passage } of concernHits(d, "cold")) {
    const temps = [...passage.text.matchAll(TEMP)].map((m) => Number(m[1]));
    if (!temps.length) continue;
    const tempC = Math.min(...temps);
    if (tempC > COLD_C) continue;
    const months = new Set([
      ...monthsMentioned(passage.text),
      ...seasonMonths(passage.text, d.coordinates.lat),
    ]);
    if (months.has(month) && (!best || tempC < best.tempC))
      best = { tempC, claimId: passage.claimId };
  }
  return best;
}

function coldVerdict(d: Destination, month: number | null): Verdict {
  const [lo = 0, hi = 0] = d.conditions.water_temp_c;
  const m = month === null ? null : MONTHS[month]!;
  const spell = month === null ? null : coldSpell(d, month);
  const cold = hi <= COLD_C || (month === null ? lo <= 20 : spell !== null);
  if (cold) {
    const tempC = spell?.tempC ?? lo;
    return {
      kind: "concern",
      concern: "cold",
      status: "caveat",
      flags: ["cold_water"],
      label: m ? `Cold water in ${m}: down to ${tempC}°C` : `Cold water: down to ${lo}°C`,
      short: `Cold water (${tempC}°C)`,
      claimIds: spell ? [spell.claimId] : [claimId.experience(d)],
    };
  }
  return {
    kind: "concern",
    concern: "cold",
    status: "met",
    flags: [],
    label: m
      ? `Water ${lo}–${hi}°C across the year; no cold spell noted for ${m}`
      : `Water ${lo}–${hi}°C across the year`,
    short: `Water ${lo}–${hi}°C`,
    claimIds: [],
  };
}

function concernVerdicts(d: Destination, f: Filters, month: number | null): Verdict[] {
  const out: Verdict[] = [];
  if (f.concerns.includes("seasickness")) out.push(seasicknessVerdict(d, month));
  if (f.concerns.includes("non_diver")) out.push(nonDiverVerdict(d));
  if (f.concerns.includes("cold")) out.push(coldVerdict(d, month));
  return out;
}

// ---------------------------------------------------------------------------
// Evaluation

const MONTH_DEPENDENT: Reason[] = ["closed", "operating", "target", "season"];

function verdictsFor(d: Destination, f: Filters): { verdicts: Verdict[]; unlisted: string[] } {
  const month = f.month === "any" ? null : Number(f.month);
  const verdicts: Verdict[] = [];
  const unlisted: string[] = [];

  if (month !== null) verdicts.push(accessVerdict(d, month, f.operatingOnly));
  for (const id of f.species) {
    const target = resolveTarget(id);
    const verdict = target && targetVerdict(d, target, month);
    if (verdict) verdicts.push(verdict);
    else unlisted.push(id);
  }
  if (month !== null && f.species.length === 0) verdicts.push(seasonVerdict(d, month));
  if (f.cert !== "any") verdicts.push(...certVerdicts(d, f.cert));
  if (f.current !== "any") verdicts.push(currentVerdict(d, f.current));
  verdicts.push(...concernVerdicts(d, f, month));
  return { verdicts, unlisted };
}

function tierOf(
  verdicts: Verdict[],
  unlisted: string[],
): { tier: Tier; caveats: number; violations: Verdict[] } {
  const violations = verdicts.filter((v) => v.status === "violated");
  const caveats = verdicts.filter((v) => v.status === "caveat").length;
  const tier: Tier = unlisted.length
    ? "out"
    : violations.length === 0
      ? caveats === 0
        ? "good"
        : "caveats"
      : violations.length === 1
        ? "near_miss"
        : "out";
  return { tier, caveats, violations };
}

export function evaluate(d: Destination, f: Filters): DestinationFit {
  const { verdicts, unlisted } = verdictsFor(d, f);
  const { tier, caveats, violations } = tierOf(verdicts, unlisted);
  const violation = tier === "near_miss" ? violations[0] : undefined;

  let fitsIn: number[] = [];
  if (violation?.reason && MONTH_DEPENDENT.includes(violation.reason)) {
    fitsIn = MONTHS.map((_, k) => k).filter((k) => {
      const alt = verdictsFor(d, { ...f, month: String(k) });
      const t = tierOf(alt.verdicts, alt.unlisted).tier;
      return t === "good" || t === "caveats";
    });
  }
  return { destination: d, verdicts, tier, caveats, violation, fitsIn, unlisted };
}

export type FitRun = { brief: boolean; results: DestinationFit[]; nearMisses: DestinationFit[] };

const TIER_RANK: Record<Tier, number> = { good: 0, caveats: 1, near_miss: 2, out: 3 };

/** Scope filters narrow the list; the brief decides eligibility and order. */
export function runFit(f: Filters, list: Destination[] = DESTINATIONS): FitRun {
  const brief = hasBrief(f);
  const fits = list.filter((d) => passesScope(d, f)).map((d) => evaluate(d, f));
  const results = fits.filter((x) => x.tier === "good" || x.tier === "caveats");
  if (!brief) return { brief, results, nearMisses: [] };

  results.sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      a.caveats - b.caveats ||
      a.destination.name.localeCompare(b.destination.name),
  );
  const nearMisses = fits
    .filter((x) => x.tier === "near_miss")
    .sort(
      (a, b) =>
        Number(b.fitsIn.length > 0) - Number(a.fitsIn.length > 0) ||
        a.destination.name.localeCompare(b.destination.name),
    );
  return { brief, results, nearMisses };
}

// ---------------------------------------------------------------------------
// Evidence: the few claims a diver must read for this brief

export type EvidenceOptions = {
  /** Also link trip-format notes that name a site mentioned in the target's notes. */
  siteLinking: boolean;
  /** Also link conditions/access notes that mention the brief's month ("Jun–Nov drops to 16–18°C"). */
  monthLinking: boolean;
};

export const DEFAULT_EVIDENCE: EvidenceOptions = { siteLinking: true, monthLinking: true };

const MONTH_WORD =
  /\b(?:(?:mid|early|late)[- ])?(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g;

/** Months a note refers to, expanding ranges ("Dec-Feb", "mid-March to mid-June"). */
export function monthsMentioned(text: string): Set<number> {
  const tokens = [...text.matchAll(MONTH_WORD)].map((m) => ({
    month: MONTHS.findIndex((name) => name.startsWith(m[1]!.slice(0, 3))),
    start: m.index!,
    end: m.index! + m[0].length,
  }));
  const out = new Set<number>();
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]!;
    const next = tokens[k + 1];
    if (next && /^\s*(?:-|–|to|through)\s*$/.test(text.slice(t.end, next.start))) {
      for (let m = t.month; ; m = (m + 1) % 12) {
        out.add(m);
        if (m === next.month) break;
      }
      k++;
    } else {
      out.add(t.month);
    }
  }
  return out;
}

export type EvidenceItem = {
  claim: Claim;
  verdictKind: Verdict["kind"] | "format" | "dive_type" | "month";
};

const SITE_STOP = new Set(
  [
    ...MONTHS,
    ...MONTHS.map((m) => m.slice(0, 3)),
    "The",
    "This",
    "That",
    "These",
    "Those",
    "There",
    "It",
    "Its",
    "In",
    "On",
    "At",
    "Of",
    "For",
    "And",
    "But",
    "Or",
    "If",
    "When",
    "Where",
    "Not",
    "No",
    "Nothing",
    "Most",
    "Some",
    "One",
    "Two",
    "Same",
    "Also",
    "Up",
    "Open",
    "Water",
    "Advanced",
    "Nitrox",
    "SMB",
    "DAN",
    "UNESCO",
    "ZuBlu",
    "CONANP",
    "PLOS",
    "ONE",
    "Divernet",
    "Divearoo",
    "Sources",
    "Encoded",
    "Present",
    "Resident",
    "Surprise",
    "Genuinely",
    "Format",
    "Reef",
    "Point",
    "Bay",
    "Island",
    "Islands",
    "Rock",
    "Rocks",
    "Wall",
    "Strait",
    "Sea",
    "Ocean",
    "Channel",
    "North",
    "South",
    "East",
    "West",
    "Northern",
    "Southern",
    "Central",
    "Outer",
    "Inner",
    "Park",
    "Marine",
  ].map((w) => w.toLowerCase()),
);

/** Proper-noun phrases that look like site names ("Manta Alley", "Darwin"). */
function siteNames(text: string, exclude: Set<string>) {
  const out = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?:])\s+/)) {
    const words = sentence.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const w = words[i]!.replace(/[^A-Za-zÀ-ÿ'’-]/g, "");
      if (!/^[A-Z][a-zà-ÿ'’-]{2,}$/.test(w)) continue;
      const lw = w.toLowerCase();
      if (SITE_STOP.has(lw) || exclude.has(lw)) continue;
      out.add(lw);
    }
  }
  return [...out];
}

export function selectEvidence(
  fit: DestinationFit,
  f: Filters,
  options: EvidenceOptions = DEFAULT_EVIDENCE,
): EvidenceItem[] {
  const d = fit.destination;
  const items: EvidenceItem[] = [];
  const add = (id: string, verdictKind: EvidenceItem["verdictKind"]) => {
    if (items.some((i) => i.claim.id === id)) return;
    const claim = getClaim(d, id);
    if (claim) items.push({ claim, verdictKind });
  };

  const exclude = new Set(
    `${d.name} ${d.region} ${d.country}`
      .toLowerCase()
      .split(/[\s,()-]+/)
      .filter(Boolean),
  );

  for (const v of fit.verdicts) {
    if (v.kind === "access" && v.status !== "met") add(claimId.operating(d), "access");

    if (v.kind === "target" && v.targetId) {
      const target = resolveTarget(v.targetId);
      if (!target) continue;
      const listings = listingsFor(d, target);
      for (const id of v.claimIds) add(id, "target");
      for (const s of listings) add(claimId.species(d, s), "target");

      const highlights = linkedHighlights(d, listings);
      for (const h of highlights) add(claimId.highlight(d, h.rank), "target");

      const aliases = targetAliases(listings);
      const sites = options.siteLinking
        ? siteNames(
            [
              ...listings.map((s) => s.note),
              ...highlights.map((h) => `${h.label}. ${h.note}`),
            ].join(" "),
            exclude,
          )
        : [];
      d.trip_formats.forEach((t, i) => {
        if (mentions(t.note, aliases) || (sites.length && mentions(t.note, sites)))
          add(claimId.format(d, i), "target");
      });
    }

    if (v.kind === "cert" || v.kind === "current") add(claimId.experience(d), v.kind);
    if (v.kind === "required_cert") for (const id of v.claimIds) add(id, v.kind);
  }

  if (options.monthLinking && f.month !== "any") {
    const month = Number(f.month);
    if (monthsMentioned(d.operating_note).has(month)) add(claimId.operating(d), "access");
    if (monthsMentioned(d.conditions.experience_note).has(month))
      add(claimId.experience(d), "month");
  }

  if (f.format !== "any") {
    d.trip_formats.forEach((t, i) => {
      if (t.format === f.format) add(claimId.format(d, i), "format");
    });
  }
  if (f.diveType !== "any") {
    for (const h of d.highlights)
      if (h.type === f.diveType) add(claimId.highlight(d, h.rank), "dive_type");
  }
  return items;
}

/** Total claims a diver would otherwise read on the destination page. */
export function pageClaimCount(d: Destination) {
  return (
    2 +
    d.species.length +
    d.highlights.length +
    d.trip_formats.length +
    d.conditions.required_certs.length
  );
}

/** One line on how a destination fits, for panels and comparisons. */
export function fitSummary(fit: DestinationFit, name: string) {
  if (fit.unlisted.length) {
    return `${name} has no record of ${fit.unlisted.map(targetLabel).join(" or ")}`;
  }
  switch (fit.tier) {
    case "good":
      return "A good fit for your trip";
    case "caveats":
      return `A fit, with ${fit.caveats} thing${fit.caveats === 1 ? "" : "s"} to weigh`;
    case "near_miss":
      return "Close — one thing doesn't fit";
    default:
      return "Not a fit for this trip";
  }
}
