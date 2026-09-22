/**
 * "Describe your trip": free text → a structured brief, concerns, and the things
 * Sightline can't answer.
 *
 * Two engines produce the same shape:
 * - rules (this file): deterministic, always available, and the fallback;
 * - Claude (lib/llm.server.ts), when a key is configured, for phrasing rules miss
 *   ("I turn green on boats"). Its output is validated against the same enums and
 *   passed through normalizeTrip(), so it can't introduce an unknown ID.
 *
 * The parse is shown back to the diver as editable filters and chips. Nothing is
 * inferred silently: a month is never guessed from "summer", a target group is
 * never guessed from "sharks".
 */
import { DESTINATIONS, MONTHS } from "@/lib/destinations";
import { CONCERNS, UNSUPPORTED, type ConcernId, type UnsupportedId } from "@/lib/concerns";
import {
  CONTINENTS,
  DIVE_TYPE_OPTIONS,
  EMPTY_FILTERS,
  FORMAT_OPTIONS,
  TARGET_GROUPS,
  TARGET_SPECIES,
  isKnownTarget,
  type Filters,
} from "@/lib/filters";
import { aliasesFor, getGroupDef } from "@/lib/taxonomy";

export type Cert = "open_water" | "advanced" | "advanced_plus_experience";

export type ParsedTrip = {
  month: number | null;
  alsoMonths: number[];
  targets: string[];
  cert: Cert | null;
  current: "mild" | "moderate" | null;
  format: string | null;
  diveType: string | null;
  where: string | null;
  concerns: ConcernId[];
  unsupported: UnsupportedId[];
  destinations: string[];
};

export const EMPTY_TRIP: ParsedTrip = {
  month: null,
  alsoMonths: [],
  targets: [],
  cert: null,
  current: null,
  format: null,
  diveType: null,
  where: null,
  concerns: [],
  unsupported: [],
  destinations: [],
};

function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Months

const MONTH_RE =
  /\b(?:(early|mid|late|end of)[- ]?)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b/gi;

/** "May", "March" and "August" are also ordinary words: count them only in a date context. */
const AMBIGUOUS = new Set(["may", "march", "mar", "august"]);

function monthsIn(original: string): number[] {
  const out: number[] = [];
  const text = original;
  const push = (m: number) => {
    if (!out.includes(m)) out.push(m);
  };
  const tokens = [...text.matchAll(MONTH_RE)].map((m) => {
    const word = m[2]!;
    const lower = word.toLowerCase();
    const before = text.slice(Math.max(0, m.index! - 14), m.index!).toLowerCase();
    const dated =
      Boolean(m[1]) ||
      /^[A-Z]/.test(word) ||
      /(?:\bin|\bearly|\bmid|\blate|\bend of|\bduring|\buntil|\bthrough|\bto|\bor|\band|\bfrom|\bsince|[-–,])\s*$/.test(
        before,
      );
    return {
      month: MONTHS.findIndex((name) => name.toLowerCase().startsWith(lower.slice(0, 3))),
      ok: !AMBIGUOUS.has(lower) || dated,
      start: m.index!,
      end: m.index! + m[0].length,
    };
  });
  const valid = tokens.filter((t) => t.ok && t.month >= 0);
  for (let k = 0; k < valid.length; k++) {
    const t = valid[k]!;
    const next = valid[k + 1];
    const between = next ? text.slice(t.end, next.start) : "";
    if (next && /^\s*(?:-|–|to|through|until)\s*(?:(?:early|mid|late)[- ]?)?$/i.test(between)) {
      for (let m = t.month; ; m = (m + 1) % 12) {
        push(m);
        if (m === next.month) break;
      }
      k++;
    } else push(t.month);
  }
  // Holidays with a fixed month.
  const f = fold(text);
  if (/\bchristmas|\bxmas\b/.test(f)) push(11);
  if (/\bnew year'?s?\b/.test(f) && !/\bchinese new year/.test(f)) push(0);
  return out;
}

// ---------------------------------------------------------------------------
// Targets

type Alias = { phrase: string; id: string };

const EXTRA_TARGET_ALIASES: Alias[] = [
  { phrase: "mantas", id: "manta-rays" },
  { phrase: "manta", id: "manta-rays" },
  { phrase: "giant manta", id: "giant-oceanic-manta-ray" },
  { phrase: "giant mantas", id: "giant-oceanic-manta-ray" },
  { phrase: "oceanic manta", id: "giant-oceanic-manta-ray" },
  { phrase: "hammerheads", id: "hammerheads" },
  { phrase: "hammerhead", id: "hammerheads" },
  { phrase: "hammers", id: "hammerheads" },
  { phrase: "threshers", id: "thresher-sharks" },
  { phrase: "thresher", id: "thresher-sharks" },
  { phrase: "turtles", id: "sea-turtles" },
  { phrase: "turtle", id: "sea-turtles" },
  { phrase: "devil rays", id: "devil-rays" },
  { phrase: "devilfish", id: "devil-rays" },
  { phrase: "mobulas", id: "devil-rays" },
  { phrase: "mobula", id: "devil-rays" },
  { phrase: "sea lions", id: "sea-lions" },
  { phrase: "sea lion", id: "sea-lions" },
  { phrase: "whales", id: "whales" },
  { phrase: "humpbacks", id: "humpback-whale" },
  { phrase: "humpback whales", id: "humpback-whale" },
  { phrase: "humpback", id: "humpback-whale" },
  { phrase: "dolphins", id: "dolphins" },
  { phrase: "octopus", id: "octopuses" },
  { phrase: "octopuses", id: "octopuses" },
  { phrase: "frogfish", id: "frogfishes" },
  { phrase: "frogfishes", id: "frogfishes" },
  { phrase: "whale sharks", id: "whale-shark" },
  { phrase: "whaleshark", id: "whale-shark" },
  { phrase: "whalesharks", id: "whale-shark" },
  { phrase: "mola mola", id: "ocean-sunfish" },
  { phrase: "mola", id: "ocean-sunfish" },
  { phrase: "sunfish", id: "ocean-sunfish" },
  { phrase: "sardines", id: "bali-sardinella" },
  { phrase: "sardine run", id: "bali-sardinella" },
  { phrase: "pygmy seahorses", id: "pygmy-seahorse" },
  { phrase: "pygmies", id: "pygmy-seahorse" },
  { phrase: "tiger sharks", id: "tiger-shark" },
  { phrase: "bull sharks", id: "bull-shark" },
  { phrase: "oceanic whitetips", id: "oceanic-whitetip-shark" },
  { phrase: "mimic octopus", id: "mimic-octopus" },
];

function singular(phrase: string) {
  if (/(?:us|sh)es$/.test(phrase)) return phrase.slice(0, -2); // octopuses, frogfishes
  return phrase.endsWith("s") ? phrase.slice(0, -1) : phrase;
}

/** A group by its label in both numbers: "Whales" → whales, whale; "Devil & mobula rays" → devil ray(s), mobula ray(s). */
function groupPhrases(label: string): string[] {
  const f = fold(label);
  const pair = /^(\w+) & (\w+) (\w+)$/.exec(f);
  const plurals = pair ? [`${pair[1]} ${pair[3]}`, `${pair[2]} ${pair[3]}`] : [f];
  return plurals.flatMap((p) => [p, singular(p)]);
}

/**
 * Phrases → targets. Groups come first, in singular and plural, so a generic
 * word means the whole group: "whale" is every whale, "thresher shark" includes
 * pelagic threshers. A species alias shared by several species of one group
 * ("dolphin", "devil ray") resolves to that group, never to one member.
 */
const TARGET_ALIASES: Alias[] = (() => {
  const list: Alias[] = [...EXTRA_TARGET_ALIASES];
  const has = (phrase: string) => list.some((x) => x.phrase === phrase);
  for (const g of TARGET_GROUPS)
    for (const phrase of groupPhrases(g.label)) if (!has(phrase)) list.push({ phrase, id: g.id });

  const speciesByPhrase = new Map<string, Set<string>>();
  for (const s of TARGET_SPECIES) {
    for (const a of aliasesFor(s.id, s.label)) {
      const phrase = fold(a);
      for (const p of phrase.endsWith("s") ? [phrase] : [phrase, `${phrase}s`]) {
        if (!speciesByPhrase.has(p)) speciesByPhrase.set(p, new Set());
        speciesByPhrase.get(p)!.add(s.id);
      }
    }
  }
  for (const [phrase, ids] of speciesByPhrase) {
    if (has(phrase)) continue;
    if (ids.size === 1) {
      list.push({ phrase, id: [...ids][0]! });
      continue;
    }
    const group = TARGET_GROUPS.find((g) =>
      [...ids].every((id) => getGroupDef(g.id)?.members.includes(id)),
    );
    if (group) list.push({ phrase, id: group.id });
  }
  return list.filter((a) => isKnownTarget(a.id)).sort((a, b) => b.phrase.length - a.phrase.length);
})();

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest phrase wins and consumes its span, so "mimic octopus" doesn't also yield "octopuses". */
function targetsIn(f: string): string[] {
  let text = f;
  const out: string[] = [];
  for (const a of TARGET_ALIASES) {
    const re = new RegExp(`\\b${escape(a.phrase)}\\b`, "g");
    if (re.test(text)) {
      if (!out.includes(a.id)) out.push(a.id);
      text = text.replace(re, " ");
    }
  }
  // A species already covered by a matched group adds nothing.
  return out;
}

// ---------------------------------------------------------------------------
// Certification

function certIn(original: string, f: string): Cert | null {
  const count = [...f.matchAll(/\b(\d{1,4})\s*\+?\s*(?:logged\s+)?dives\b/g)]
    .map((m) => Number(m[1]))
    .reduce((a, b) => Math.max(a, b), 0);
  const pro = /\b(?:rescue|divemaster|dive master|instructor)\b/.test(f) || /\bDM\b/.test(original);
  const advanced =
    /\b(?:aowd?|advanced|advnaced|advance)\b/.test(f) && !/\badvanced \+ experience\b/.test(f);
  const openWater =
    /\bopen water\b/.test(f) ||
    /\bOWD?\b/.test(original) ||
    /\b(?:just|newly|recently) (?:got )?certified\b/.test(f);

  if (pro) return "advanced_plus_experience";
  if (advanced) return count >= 50 ? "advanced_plus_experience" : "advanced";
  if (openWater && !/\bopen water (?:swim|snorkel)/.test(f)) return "open_water";
  if (count >= 100) return "advanced_plus_experience";
  if (count > 0 && count <= 25) return "open_water";
  return null;
}

// ---------------------------------------------------------------------------
// Current limit, format, dive type, where, destinations

function currentIn(f: string): "mild" | "moderate" | null {
  if (
    /\b(?:happy|fine|ok|okay|comfortable) with moderate\b|\bmoderate (?:current )?(?:is )?(?:fine|ok|okay)\b/.test(
      f,
    )
  )
    return "moderate";
  if (
    /\bnothing (?:too )?(?:crazy|strong|ripping|wild|hard)[^.]{0,15}current|\bcurrent[^.]{0,20}\b(?:mild|gentle|easy|nothing (?:too )?(?:crazy|strong))|\b(?:no|without) (?:strong |big )?currents?\b|\bmild currents?\b|\bgentle currents?\b/.test(
      f,
    )
  )
    return "mild";
  return null;
}

const NEGATED = /\b(?:not|no|don'?t|dont|avoid|without|hate|never|rather not)\b[^.]{0,25}$/;

function formatIn(f: string): string | null {
  const m = /\bliveaboards?\b/.exec(f);
  if (m && !NEGATED.test(f.slice(0, m.index))) return "liveaboard";
  const shore = /\bshore (?:diving|dives?|entr(?:y|ies)|access)\b/.exec(f);
  if (shore && !NEGATED.test(f.slice(0, shore.index))) return "shore_access";
  return null;
}

const DIVE_TYPE_WORDS: { re: RegExp; type: string }[] = [
  { re: /\bmacro\b|\bcritters?\b|\bnudibranchs?\b/, type: "macro" },
  { re: /\bmuck\b/, type: "muck" },
  { re: /\bwrecks?\b/, type: "wreck" },
  { re: /\bcenotes?\b/, type: "cenote" },
  { re: /\bcaverns?\b|\bcaves?\b/, type: "cave" },
  { re: /\bblackwater\b/, type: "blackwater" },
  { re: /\bnight dives?\b/, type: "night" },
  { re: /\bwalls?\b/, type: "wall" },
  { re: /\bpelagics?\b|\bbig animals?\b/, type: "pelagic" },
  { re: /\bdrift(?: dives?| diving)?\b/, type: "drift" },
  { re: /\breefs?\b(?! (?:fish|sharks?|mantas?))/, type: "reef" },
];

function diveTypeIn(f: string): string | null {
  for (const { re, type } of DIVE_TYPE_WORDS) {
    const m = re.exec(f);
    if (!m) continue;
    // "Drift dives make me nervous" is a worry, not a request.
    const after = f.slice(m.index, m.index + 60);
    if (/\b(?:nervous|scared|afraid|worried|anxious|hate)\b/.test(after)) continue;
    if (NEGATED.test(f.slice(0, m.index))) continue;
    if (DIVE_TYPE_OPTIONS.some((o) => o.value === type)) return type;
  }
  return null;
}

const DESTINATION_ALIASES: { phrase: string; id: string }[] = (() => {
  const list = DESTINATIONS.flatMap((d) => {
    const full = fold(d.name).replace(/\s*\(.*\)$/, "");
    const names = [full, full.split(",")[0]!.trim()];
    return names.map((phrase) => ({ phrase, id: d.id }));
  });
  const extra: [string, string][] = [
    ["cocos island", "cocos"],
    ["cocos", "cocos"],
    ["galapagos", "galapagos"],
    ["socorro", "socorro"],
    ["revillagigedo", "socorro"],
    ["cenotes", "yucatan-cenotes"],
    ["cenote", "yucatan-cenotes"],
    ["tubbataha", "tubbataha"],
    ["lembeh", "lembeh"],
    ["hanifaru", "baa-atoll"],
    ["south ari", "ari-atoll"],
    ["ari atoll", "ari-atoll"],
    ["baa atoll", "baa-atoll"],
    ["brothers", "red-sea-brothers"],
    ["daedalus", "red-sea-brothers"],
    ["elphinstone", "red-sea-brothers"],
    ["ribbon reefs", "gbr-ribbon-reefs"],
    ["osprey reef", "coral-sea"],
    ["coral sea", "coral-sea"],
    ["aliwal", "aliwal-shoal"],
    ["gozo", "malta"],
    ["o'ahu", "oahu"],
    ["thistlegorm", "red-sea-north"],
    ["ningaloo", "ningaloo"],
  ];
  for (const [phrase, id] of extra) list.push({ phrase, id });
  return list.sort((a, b) => b.phrase.length - a.phrase.length);
})();

function destinationsIn(f: string): string[] {
  let text = f;
  const out: string[] = [];
  for (const a of DESTINATION_ALIASES) {
    const re = new RegExp(`\\b${escape(a.phrase)}\\b`, "g");
    if (re.test(text)) {
      if (!out.includes(a.id)) out.push(a.id);
      text = text.replace(re, " ");
    }
  }
  return out;
}

const WHERE_ALIASES: [RegExp, string][] = [
  [/\bred sea\b|\begypt\b/, "country:Egypt"],
  [/\bsouth ?east asia\b|\basia\b/, "continent:Asia"],
  [/\beurope\b|\bmediterranean\b/, "continent:Europe"],
  [/\bafrica\b/, "continent:Africa"],
  [/\boceania\b|\bsouth pacific\b/, "continent:Oceania"],
  [/\bcentral america\b/, "continent:Central America"],
  [/\bsouth america\b/, "continent:South America"],
  [/\bnorth america\b/, "continent:North America"],
  [/\bhawaii\b|\busa\b|\bunited states\b/, "country:United States"],
];

function whereIn(f: string, destinations: string[]): string | null {
  for (const c of CONTINENTS) {
    for (const country of c.countries) {
      const name = fold(country);
      // A country that is also a destination (Malta, Palau) is the destination.
      if (DESTINATIONS.some((d) => fold(d.name).startsWith(name) && destinations.includes(d.id)))
        continue;
      if (new RegExp(`\\b${escape(name)}\\b`).test(f)) return `country:${country}`;
    }
  }
  for (const [re, where] of WHERE_ALIASES) if (re.test(f)) return where;
  return null;
}

// ---------------------------------------------------------------------------
// Concerns and unsupported asks

const CONCERN_TRIGGERS: Record<ConcernId, RegExp> = {
  seasickness:
    /\bsea ?sick\w*|\bmotion sick|\bturn green\b|\bqueasy\b|\bboat rides?\b|\blong (?:boat|crossing)|\brough (?:seas?|crossing|water)|\bbad on boats\b|\bhate boats\b|\bhow rough\b/,
  cold: /\bcold\b|\bchilly\b|\bwarm water\b|\bdry ?suit\b|\bwet ?suit\b|\bthermoclines?\b|\bwater temp/,
  non_diver:
    /\bnon[- ]?divers?\b|\bdoesn'?t dive\b|\bdoes not dive\b|\bdon'?t dive\b|\b(?:partner|wife|husband|girlfriend|boyfriend|other half|spouse|kids?|children|family|friend)\b[^.]{0,60}\b(?:snorkel\w*|non[- ]?diver|doesn'?t dive|bored)/,
  experience:
    /\bout of my depth\b|\bnot (?:very )?experienced\b|\bexperienced enough\b|\b(?:worried|nervous|unsure|not sure|concerned)\b[^.]{0,40}\b(?:experience|enough|level|skills?)\b|\beasy diving\b|\bbeginner\b|\bnewbie\b|\bfirst dive trip\b|\bonly (?:have |got )?\d+ (?:logged )?dives\b|\bwithin my (?:experience|level)\b|\btoo much for\b/,
  current:
    /\b(?:nervous|scared|afraid|worried|anxious|hate|don'?t like)\b[^.]{0,40}\b(?:currents?|drift)|\b(?:currents?|drift\w*)\b[^.]{0,30}\b(?:nervous|scared|afraid|worried|anxious)\b|\bhow (?:strong|bad) (?:are|is) the currents?\b/,
  crowds:
    /\bcrowd\w*|\bbusy\b|\bin a zoo\b|\bother boats\b|\btoo many (?:divers|people|boats)\b|\btouristy\b/,
  visibility: /\bvis\b|\bviz\b|\bvisibility\b|\bclear water\b/,
  weather:
    /\brain\w*|\btyphoons?\b|\bcyclones?\b|\bhurricanes?\b|\bmonsoon\b|\bweather\b|\bstorms?\b|\bblown out\b/,
  rules:
    /\bpermits?\b|\b(?:park |entrance )?fees?\b|\brules?\b|\bregulations?\b|\btouching\b|\bgloves\b|\bbanned\b|\blicen[cs]e\b/,
  remote:
    /\bchamber\b|\brecompression\b|\bhyperbaric\b|\bdcs\b|\bthe bends\b|\bevacuat\w+|\bfar (?:is it )?from help\b|\bsomething goes wrong\b|\bremote\b|\bmedical\b/,
  photography:
    /\bphoto\w*|\bcamera\b|\bhousing\b|\bstrobes?\b|\bvideo\b|\bgopro\b|\bshoot(?:ing)?\b/,
  depth: /\bhow deep\b|\bdeep(?:er)?\b|\b(?<!my )depth\b|\bnitrox\b|\b\d{2}\s?m(?:-ish)?\b/,
  getting_there:
    /\bget(?:ting)? (?:there|to)\b|\btravel time\b|\btransfers?\b|\bhow do i get\b|\bflight connections?\b/,
};

function concernsIn(f: string): ConcernId[] {
  return CONCERNS.map((c) => c.id).filter((id) => CONCERN_TRIGGERS[id].test(f));
}

const FLIGHT_PRICE =
  /\bflights?\b[^.]{0,25}\b(?:cost|price|cheap|how much)\w*|\b(?:cost|price|cheap|how much)\w*\b[^.]{0,25}\bflights?\b/;

function unsupportedIn(f: string): UnsupportedId[] {
  const out: UnsupportedId[] = [];
  let rest = f;
  if (FLIGHT_PRICE.test(rest)) {
    out.push("flights");
    rest = rest.replace(FLIGHT_PRICE, " ");
  }
  if (
    /\b(?:cost|costs|price|prices|pricing|cheap\w*|budget|expensive|afford\w*|how much)\b/.test(
      rest,
    )
  )
    out.push("cost");
  if (/\bhotels?\b|\baccommodation\b|\bwhere to stay\b|\bplace to stay\b/.test(rest))
    out.push("accommodation");
  if (/\bvisas?\b/.test(rest)) out.push("visas");
  if (
    /\b(?:which|best|recommend\w*|good)\b[^.]{0,20}\b(?:dive )?(?:centre|center|shop|operator|school)s?\b/.test(
      rest,
    )
  )
    out.push("operator_quality");
  return UNSUPPORTED.map((u) => u.id).filter((id) => out.includes(id));
}

// ---------------------------------------------------------------------------

export function parseTripRules(text: string): ParsedTrip {
  const f = fold(text);
  const months = monthsIn(text);
  const destinations = destinationsIn(f);
  // "Depth" worry vs "out of my depth": the trigger excludes "my depth".
  const concerns = concernsIn(f);
  return normalizeTrip({
    month: months[0] ?? null,
    alsoMonths: months.slice(1),
    targets: targetsIn(f),
    cert: certIn(text, f),
    current: currentIn(f),
    format: formatIn(f),
    diveType: diveTypeIn(f),
    where: whereIn(f, destinations),
    concerns,
    unsupported: unsupportedIn(f),
    destinations,
  });
}

/** Drop anything that isn't a known value, whichever engine produced it. */
export function normalizeTrip(t: Partial<ParsedTrip>): ParsedTrip {
  const month = Number.isInteger(t.month) && t.month! >= 0 && t.month! < 12 ? t.month! : null;
  const whereOk = (w: string | null | undefined) =>
    !!w &&
    CONTINENTS.some(
      (c) => w === `continent:${c.name}` || c.countries.some((x) => w === `country:${x}`),
    );
  const uniq = <T>(xs: T[] | undefined) => [...new Set(xs ?? [])];
  return {
    month,
    alsoMonths: uniq(t.alsoMonths).filter(
      (m) => Number.isInteger(m) && m >= 0 && m < 12 && m !== month,
    ),
    targets: uniq(t.targets).filter(isKnownTarget),
    cert:
      (["open_water", "advanced", "advanced_plus_experience"] as const).find((c) => c === t.cert) ??
      null,
    current: t.current === "mild" || t.current === "moderate" ? t.current : null,
    format: FORMAT_OPTIONS.some((o) => o.value === t.format) ? t.format! : null,
    diveType: DIVE_TYPE_OPTIONS.some((o) => o.value === t.diveType) ? t.diveType! : null,
    where: whereOk(t.where) ? t.where! : null,
    concerns: uniq(t.concerns).filter((c): c is ConcernId => CONCERNS.some((x) => x.id === c)),
    unsupported: uniq(t.unsupported).filter((u): u is UnsupportedId =>
      UNSUPPORTED.some((x) => x.id === u),
    ),
    destinations: uniq(t.destinations).filter((id) => DESTINATIONS.some((d) => d.id === id)),
  };
}

const CERT_ORDER = ["open_water", "advanced", "advanced_plus_experience"] as const;

/**
 * Certification from two readers of the same text, resolved in the safe
 * direction. A higher level shows sites beyond the diver's skill and no level
 * skips the check, so the language model may lower what the rules read, or fill
 * it in when the rules found none, but never raise it. (On all 74 labelled
 * descriptions the rules' level is never above the truth.)
 */
export function safestCert(
  model: ParsedTrip["cert"],
  rules: ParsedTrip["cert"],
): ParsedTrip["cert"] {
  if (!rules) return model;
  if (!model) return rules;
  return CERT_ORDER.indexOf(model) <= CERT_ORDER.indexOf(rules) ? model : rules;
}

export function isEmptyTrip(t: ParsedTrip) {
  return (
    t.month === null &&
    !t.targets.length &&
    !t.cert &&
    !t.current &&
    !t.format &&
    !t.diveType &&
    !t.where &&
    !t.concerns.length &&
    !t.unsupported.length &&
    !t.destinations.length
  );
}

/** A new description replaces the brief; everything it sets stays editable in the filter bar. */
export function tripToFilters(t: ParsedTrip): Filters {
  return {
    ...EMPTY_FILTERS,
    month: t.month === null ? "any" : String(t.month),
    species: t.targets,
    cert: t.cert ?? "any",
    current: t.current ?? "any",
    format: t.format ?? "any",
    diveType: t.diveType ?? "any",
    where: t.where ?? "all",
    concerns: t.concerns,
  };
}
