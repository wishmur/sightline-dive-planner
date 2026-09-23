/**
 * Evidence for a diver's concern or question, from one destination's record.
 *
 * Retrieval unit: claim sentences (lib/passages.ts), each indexed with its claim
 * label as context ("Liveaboard · scuba — The only access."), because a format
 * sentence often doesn't repeat the format it belongs to.
 *
 * Two retrievers, measured against frozen gold in evals/concerns.ts:
 * - Concern lexicon: the words the records actually use for each concern
 *   ("crossing", "swell", "surf launch" for seasickness). Deterministic, the same
 *   pattern as the species aliases in taxonomy.ts.
 * - BM25 over the destination's sentences, for free-text questions that match no
 *   concern.
 *
 * Output is extractive by design: the verbatim sentences, never a paraphrase.
 * When nothing clears the bar the answer is "this record doesn't say", which is
 * scored as an outcome in its own right (abstention), not a failure to hide.
 */
import type { Destination } from "@/lib/destinations";
import { CONCERNS, type ConcernId } from "@/lib/concerns";
import { allPassages, passagesFor, type Passage } from "@/lib/passages";
import { bm25Index, bm25Score, tokenize } from "@/lib/text";

export type Hit = { passage: Passage; score: number };

/**
 * The text a retriever sees: the sentence with its claim label as context. The
 * operating and conditions headers are the same on every record and carry no
 * information, so they're left out.
 */
export function contextual(p: Passage) {
  return p.claim.type === "operating" || p.claim.type === "experience"
    ? p.text
    : `${p.claim.label} — ${p.text}`;
}

// ---------------------------------------------------------------------------
// Concern lexicon

type Term = { re: RegExp; w: number };
const t = (w: number, ...res: RegExp[]): Term[] => res.map((re) => ({ re, w }));

/**
 * Strong terms (2) answer the concern on their own; weak terms (1) need company.
 * Written from the concern definitions and domain vocabulary, then adjusted only
 * against the dev split of the gold (see evals/concerns.ts).
 */
export const CONCERN_TERMS: Record<ConcernId, Term[]> = {
  seasickness: [
    ...t(
      2,
      /\bcrossings?\b/i,
      /\bopen[- ](?:ocean|sea)\b/i,
      /\bswell\b/i,
      /\brough\b/i,
      /\bsurface conditions\b/i,
      /\bsea state\b/i,
      /\bseasick\w*\b/i,
      /\bboat (?:rides?|time|days?)\b/i,
      /\bhours? (?:of )?(?:cruising|crossing|by boat|each way)\b/i,
      /\bpassage\b/i,
      /\bno boat\b/i,
      /\bsurf launch\b/i,
      /\bbreakers\b/i,
      /\bminutes? (?:by boat|from shore)\b/i,
      /\bshort (?:boat|transits?)\b/i,
    ),
    ...t(
      1,
      /\bliveaboards?\b/i,
      /\bonly (?:access|way|format)\b/i,
      /\bsheltered\b/i,
      /\bwaves?\b/i,
      /\bwinds?\b/i,
      /\bexposed\b/i,
      /\bshore (?:entr(?:y|ies)|access|diving|dive)\b/i,
      /\boffshore\b/i,
      /\bovernight\b/i,
      /\b(?:miles|km) (?:out|offshore)\b/i,
    ),
  ],
  cold: [
    ...t(
      2,
      /\b\d{1,2}(?:\s?[-–]\s?\d{1,2})?\s?°?C\b/,
      /\b\d{2}\s?°?F\b/,
      /\bthermoclines?\b/i,
      /\b(?:wet|dry)[- ]?suits?\b/i,
      /\b\d\s?mm\b/i,
      /\bcold\w*\b/i,
      /\bcool(?:er|est)?\b/i,
      /\bwater temperature\b/i,
    ),
    ...t(2, /\bwarm(?:er|est)?(?: water|,| and\b)/i),
    ...t(1, /\bupwelling\b/i, /\bwarm(?:er|est)?\b/i, /\bhoods?\b/i, /\bgloves\b/i),
  ],
  non_diver: [
    ...t(
      2,
      /\bsnorkel\w*\b/i,
      /\bnon[- ]divers?\b/i,
      /\bswimmers?\b/i,
      /\bfreedivers?\b/i,
      /\bsurface (?:swims?|interaction|activity|product|only)\b(?! out)/i,
      /\bwhale[- ]watching\b/i,
      /\bcage (?:diving|tours?)\b/i,
      /\bkayak\w*\b/i,
      /\bwatching from land\b/i,
    ),
    ...t(1, /\bsurface\b/i, /\bnot (?:a )?(?:scuba|dive)\b/i, /\bfrom (?:the )?(?:boat|land)\b/i),
  ],
  experience: [
    ...t(
      2,
      /\blogged dives\b/i,
      /\b\d+\+? (?:ocean )?dives\b/i,
      /\bbeginners?\b/i,
      /\bnovices?\b/i,
      /\bfirst[- ](?:timers?|tropical|liveaboard|wreck)\b/i,
      /\bnewly certified\b/i,
      /\b(?:least|most) demanding\b/i,
      /\beasiest\b/i,
      /\bpractical floor\b/i,
      /\bstep up\b/i,
      /\breef hooks?\b/i,
      /\bnegative entr\w+\b/i,
      /\bSMB\b/,
      /\bcheck dive\b/i,
      /\bbuoyancy\b/i,
      /\bgated?\b/i,
      /\bOpen Water\b/,
      /\badvanced(?:-only)?\b/i,
      /\bintermediate\b/i,
      /\bcertification (?:level|gate)\b/i,
      /\ball (?:certification )?levels\b/i,
      /\boverhead environment\b/i,
    ),
    ...t(
      1,
      /\bexperience[ds]?\b/i,
      /\bskills?\b/i,
      /\bdemanding\b/i,
      /\btechnical\b/i,
      /\bnot (?:a|for)\b/i,
      /\bcertification\b/i,
      /\brecency\b/i,
    ),
  ],
  current: [
    ...t(
      2,
      /\bcurrents?\b(?! (?:feature|reality|rules?|status|state|evidence|population))/i,
      /\bdrift\w*\b/i,
      /\b(?:down|up)-?\s?currents?\b/i,
      /\bsurg(?:e|ing|y)\b/i,
      /\btidal\b/i,
      /\bslack\b/i,
      /\bflushed\b/i,
      /\bwashing[- ]machine\b/i,
      /\bKuroshio\b/i,
    ),
    ...t(1, /\btides?\b/i, /\breef hooks?\b/i, /\bhook in\b/i, /\bsheltered\b/i),
  ],
  crowds: [
    ...t(
      2,
      /\bcrowd\w*\b/i,
      /\bbusy\b/i,
      /\btraffic\b/i,
      /\bfewer (?:people|crowds|divers)\b/i,
      /\bpeak (?:tourist|traffic|crowding)\b/i,
      /\b(?:day-trip )?fleet arrives\b/i,
      /\bvisitor (?:volume|numbers)\b/i,
      /\bmaximum \d+ (?:people|vessels|divers)\b/i,
      /\bup to \d+ (?:swimmers|divers|people)\b/i,
      /\bdivers? maximum\b/i,
      /\blarge [\w-]+(?: [\w-]+)? markets?\b/i,
    ),
    ...t(
      1,
      /\bhigh[- ]volume\b/i,
      /\bcapped\b/i,
      /\bpeople\b/i,
      /\bsmall groups?\b/i,
      /\bcruise\b/i,
      /\bsunrise\b/i,
      /\bfirst boats?\b/i,
    ),
  ],
  visibility: [
    ...t(
      2,
      /\bvisibility\b/i,
      /\bviz\b/i,
      /\bclarity\b/i,
      /\bgreen (?:water|plankton)\b/i,
      /\bmurk\w*\b/i,
      /\bclear (?:water|oceanic)\b/i,
      /\b(?:and clear|clear and|clear,)/i,
    ),
    ...t(
      1,
      /\bclear\b/i,
      /\bplankton[- ]rich\b/i,
      /\bsilt\w*\b/i,
      /\btannins?\b/i,
      /\bblue water\b/i,
    ),
  ],
  weather: [
    ...t(
      2,
      /\brain\w*\b/i,
      /\bwet season\b/i,
      /\bdry season\b/i,
      /\bmonsoon\w*\b/i,
      /\btyphoons?\b/i,
      /\bcyclones?\b/i,
      /\bhurricanes?\b/i,
      /\bcancel\w*\b/i,
      /\bblown?[- ]out\b/i,
      /\bbuffer days\b/i,
      /\bweather\b/i,
      /\bturn back\b/i,
      /\baborted\b/i,
      /\blost to sea state\b/i,
      /\bswell\b/i,
      /\b(?:every|most) days? of the year\b/i,
    ),
    ...t(
      1,
      /\bwinds?\b/i,
      /\brough\b/i,
      /\bsea state\b/i,
      /\bsurface conditions\b/i,
      /\byear-round\b/i,
      /\bno (?:formal )?closure\b/i,
    ),
  ],
  rules: [
    ...t(
      2,
      /\bpermits?\b/i,
      /\bfees?\b/i,
      /\bquotas?\b/i,
      /\blottery\b/i,
      /\btokens?\b/i,
      /\bbann?ed\b/i,
      /\bprohibited\b/i,
      /\bregulat\w+\b/i,
      /\brules?\b/i,
      /\blicen[cs]ed\b/i,
      /\bcode of (?:conduct|practice)\b/i,
      /\brangers? (?:enforce|control|supervis)\w*\b/i,
      /\branger-(?:controlled|supervised)\b/i,
      /\bdo not touch\b/i,
      /\bno touching\b/i,
      /\btaxe?s\b/i,
      /\bMXN\b/,
      /\bguide ratio\b/i,
      /\bendorsed\b/i,
      /\bidentity verification\b/i,
      /\bfederally (?:regulated|restricted|protected)\b/i,
      /\bcontrolled access\b/i,
    ),
    ...t(
      1,
      /\bmandatory\b/i,
      /\brequired?s?\b/i,
      /\brestricted\b/i,
      /\benforced?\b/i,
      /\bnot permitted\b/i,
      /\bpermitted\b/i,
      /\bmarine park\b/i,
      /\bnational park\b/i,
      /\bclosed\b/i,
      /\brangers?\b/i,
    ),
  ],
  remote: [
    ...t(
      2,
      /\bchambers?\b/i,
      /\bhyperbaric\b/i,
      /\bmedical\b/i,
      /\bevacuation\b/i,
      /\bremote\w*\b/i,
      /\bnothing downstream\b/i,
      /\boff-grid\b/i,
      /\bno land (?:base|facilities)\b/i,
      /\bnautical miles\b/i,
    ),
    ...t(1, /\bisolated\b/i, /\bnearest\b/i, /\b\d+\s?km\b/i, /\bopen[- ](?:ocean|sea)\b/i),
  ],
  photography: [
    ...t(
      2,
      /\bphotograph\w*\b/i,
      /\bcameras?\b/i,
      /\bstrobes?\b/i,
      /\bfocus lights?\b/i,
      /\bno lights\b/i,
      /\bwide-angle\b/i,
      /\bmacro\b/i,
    ),
    ...t(1, /\bcritters?\b/i, /\bnudibranch\w*\b/i, /\bsubjects\b/i, /\bframe\b/i),
  ],
  depth: [
    ...t(
      2,
      /\bdeep\w*\b/i,
      /\bdepths?\b/i,
      /\bnitrox\b/i,
      /\btrimix\b/i,
      /\brecreational limits?\b/i,
      /\b\d{1,3}\s?[-–]\s?\d{1,3}\s?m\b/,
      /\b(?:at|past|around|about|beyond) (?:about |around )?\d{1,3}\s?m\b/,
      /\b\d{1,3}m\+? (?:max|limit|depth)\b/,
      /\bshallow(?:er|est)?\b/i,
    ),
    ...t(1, /\bft\b/, /\b\d{1,3}m\b/),
  ],
  getting_there: [
    ...t(
      2,
      /\bfl(?:y|ight|ights|own)\b/i,
      /\bairport\b/i,
      /\bferry\b/i,
      /\bby road\b/i,
      /\bdrive\b/i,
      /\bdeparts?\b/i,
      /\bharbou?r\b/i,
      /\bhours? each way\b/i,
      /\btransfers?\b/i,
      /\bonly (?:access|way|format|practical way|sensible format)\b/i,
      /\bcannot get there\b/i,
      /\bbook(?:ing)? \d+[-–]\d+ months\b/i,
      /\bsell out\b/i,
      /\bday boats?\b/i,
    ),
    ...t(
      1,
      /\bbased?\b/i,
      /\bhub\b/i,
      /\bstay(?:ing)? (?:in|on)\b/i,
      /\bresorts?\b/i,
      /\bpensions?\b/i,
      /\bguesthouses?\b/i,
      /\breach\w*\b/i,
      /\bitinerar\w+\b/i,
      /\bliveaboards?\b/i,
      /\b(?:out of|from) (?:[A-Z][a-zé]+)(?: [A-Z][a-zé]+)?\b/,
    ),
  ],
};

/** Where a concern's evidence usually lives: a small prior on the claim type. */
const TYPE_PRIOR: Partial<Record<ConcernId, Partial<Record<Passage["claim"]["type"], number>>>> = {
  getting_there: { format: 1 },
  experience: { experience: 1, cert: 1 },
};

/** Minimum lexicon score for a sentence to be shown as evidence. */
/**
 * A few phrases per worry, for the worked example on the About page: what a
 * diver calls it, versus the words the notes actually use. Every phrase here is
 * one the concern really matches — evals/concerns.test.ts checks that against
 * CONCERN_TERMS, so the illustration cannot drift from the lexicon.
 */
export const CONCERN_PHRASES: Partial<Record<ConcernId, string[]>> = {
  seasickness: ["a 10-12 hour crossing", "swell", "open-ocean passage"],
  cold: ["thermocline", "5 mm wetsuit", "drysuit"],
  current: ["strong current", "drift dive", "reef hook"],
};

export const LEXICON_THRESHOLD = 2;

export function lexiconScore(concern: ConcernId, p: Passage) {
  const text = contextual(p);
  const terms = CONCERN_TERMS[concern].reduce(
    (n, term) => n + (term.re.test(text) ? term.w : 0),
    0,
  );
  return terms > 0 ? terms + (TYPE_PRIOR[concern]?.[p.claim.type] ?? 0) : 0;
}

// ---------------------------------------------------------------------------
// BM25 over claim sentences (corpus-wide IDF, scored within one destination)

let INDEX: { index: ReturnType<typeof bm25Index>; tokens: Map<string, string[]> } | null = null;

function bm25Corpus() {
  if (INDEX) return INDEX;
  const docs = allPassages().map((p) => ({ id: p.id, tokens: tokenize(contextual(p)) }));
  INDEX = { index: bm25Index(docs), tokens: new Map(docs.map((d) => [d.id, d.tokens])) };
  return INDEX;
}

export function bm25Hits(d: Destination, query: string): Hit[] {
  const { index, tokens } = bm25Corpus();
  const q = tokenize(query);
  return passagesFor(d)
    .map((passage) => ({
      passage,
      score: bm25Score(q, { tokens: tokens.get(passage.id)! }, index),
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.passage.index - b.passage.index);
}

// ---------------------------------------------------------------------------
// Public API

export const MAX_EVIDENCE = 3;

export type ConcernAnswer = {
  concern: ConcernId;
  /** Verbatim sentences, best first. Empty means the record doesn't address it. */
  hits: Hit[];
};

export function concernHits(d: Destination, concern: ConcernId): Hit[] {
  return passagesFor(d)
    .map((passage) => ({ passage, score: lexiconScore(concern, passage) }))
    .filter((h) => h.score >= LEXICON_THRESHOLD)
    .sort((a, b) => b.score - a.score || order(a.passage) - order(b.passage));
}

/** Tie-break: operating and conditions notes first, then the record's own order. */
function order(p: Passage) {
  const rank = { operating: 0, experience: 1, format: 2, cert: 3, highlight: 4, species: 5 };
  return rank[p.claim.type] * 1000 + p.index;
}

export function answerConcern(d: Destination, concern: ConcernId): ConcernAnswer {
  return { concern, hits: concernHits(d, concern).slice(0, MAX_EVIDENCE) };
}

export function concernById(id: string) {
  return CONCERNS.find((c) => c.id === id);
}
