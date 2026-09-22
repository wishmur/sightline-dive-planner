/**
 * Claude, in the request path. Server-only (the .server.ts suffix keeps it out of
 * the client bundle) and optional: with no ANTHROPIC_API_KEY every caller falls
 * back to the deterministic path, and the UI says which engine answered.
 *
 * Two jobs, both measured in evals/ (understand.ts, ask.ts):
 * - understandWithClaude: a diver's own words → the structured brief. Output is
 *   constrained to the product's enums by structured outputs, then re-validated
 *   by normalizeTrip().
 * - selectWithClaude: pick the sentences of ONE destination record that answer a
 *   question. Claude chooses sentence numbers; the product shows those sentences
 *   verbatim. It never writes a fact the diver sees.
 */
import process from "node:process";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { DESTINATIONS, MONTHS, type Destination } from "@/lib/destinations";
import { CONCERNS, UNSUPPORTED } from "@/lib/concerns";
import {
  CERT_OPTIONS,
  CONTINENTS,
  DIVE_TYPE_OPTIONS,
  FORMAT_OPTIONS,
  TARGET_GROUPS,
  TARGET_SPECIES,
} from "@/lib/filters";
import { passagesFor, type Passage } from "@/lib/passages";
import { normalizeTrip, type ParsedTrip } from "@/lib/understand";

export const LLM_MODEL = "claude-opus-5";
export const PROMPT_VERSION = "2026-09-21";

export function hasClaude() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 });
}

// The SDK sends enums to the API as descriptions, not hard constraints, and then
// validates the reply client-side: one out-of-list ID would void the whole parse.
// So fields are plain strings, the allowed values are in the prompt, and
// normalizeTrip() drops (and we count) anything unknown.
const TripSchema = z.object({
  month: z.string().nullable().describe("A month name, or null"),
  also_months: z.array(z.string()).describe("Month names"),
  targets: z.array(z.string()).describe("Target IDs from the list"),
  cert: z
    .string()
    .nullable()
    .describe(`One of: ${CERT_OPTIONS.map((o) => o.value).join(", ")}; or null`),
  current_limit: z.string().nullable().describe("mild, moderate, or null"),
  format: z
    .string()
    .nullable()
    .describe(`One of: ${FORMAT_OPTIONS.map((o) => o.value).join(", ")}; or null`),
  dive_type: z
    .string()
    .nullable()
    .describe(`One of: ${DIVE_TYPE_OPTIONS.map((o) => o.value).join(", ")}; or null`),
  where: z
    .string()
    .nullable()
    .describe("continent:<name> or country:<name> from the list, or null"),
  concerns: z.array(z.string()).describe("Concern IDs from the list"),
  unsupported: z.array(z.string()).describe("Unsupported IDs from the list"),
  destinations: z.array(z.string()).describe("Destination IDs from the list"),
});

const WHERE_VALUES = CONTINENTS.flatMap((c) => [
  `continent:${c.name}`,
  ...c.countries.map((x) => `country:${x}`),
]);

const UNDERSTAND_SYSTEM = `You turn a scuba diver's description of a trip into the search brief of a dive-destination reference. Divers see your output as editable filters, so a wrong value costs them a wrong shortlist; an empty value costs them one click. When unsure, leave a field empty.

Fields:
- month: the trip month. For a window ("late Oct to early Nov") use its first month and put the rest in also_months. Leave it null for hemisphere-dependent words (summer, autumn, winter), moving holidays (Easter), or no date. Christmas is December; New Year is January.
- targets: animals the diver wants to see, as IDs from the list. Prefer a group ID ("manta-rays") when they name the animal generally, a species ID when they name the species ("giant mantas" → giant-oceanic-manta-ray). "Sharks" alone matches no target: leave it out rather than guess a species.
- cert: the diver's own level. Advanced with 50 or more logged dives, Rescue, Divemaster or Instructor → advanced_plus_experience. A dive count with no card: 25 or fewer → open_water, 100 or more → advanced_plus_experience, otherwise null.
- current_limit: only when the diver states a limit ("nothing strong" → mild, "moderate is fine" → moderate). Nervousness about current without a limit is the "current" concern instead.
- format, dive_type: only what the diver asks for. "Not a liveaboard" sets nothing. Worries are not requests ("drift dives make me nervous" is not dive_type drift).
- where: a country or continent they name. A place that is itself a listed destination (Malta, Palau) goes in destinations, not where. Regions that aren't a country (Bali, the Caribbean) set nothing.
- destinations: listed destinations they name.
- concerns: worries the filters can't express, from the list below, including ones stated indirectly ("I turn green on boats" → seasickness; "she doesn't dive" → non_diver; "never dived dry" → cold and experience). A dive count on its own is not a concern; doubt about it is.
- unsupported: things they ask for that the reference holds no data on.

Concerns:
${CONCERNS.map((c) => `- ${c.id}: ${c.definition}`).join("\n")}

Unsupported:
${UNSUPPORTED.map((u) => `- ${u.id}: ${u.label}`).join("\n")}

Where (use exactly):
${WHERE_VALUES.join(", ")}

Targets (id: name):
${[...TARGET_GROUPS, ...TARGET_SPECIES].map((t) => `${t.id}: ${t.label}`).join("\n")}

Destinations (id: name, country):
${DESTINATIONS.map((d) => `${d.id}: ${d.name}, ${d.country}`).join("\n")}`;

export async function understandWithClaude(
  text: string,
): Promise<{ trip: ParsedTrip; model: string; dropped: string[] }> {
  const response = await client().beta.messages.parse({
    model: LLM_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: UNDERSTAND_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `<trip>\n${text}\n</trip>` }],
    output_config: { effort: "low", format: betaZodOutputFormat(TripSchema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`no parse (stop_reason ${response.stop_reason})`);
  }
  const p = response.parsed_output;
  const monthIndex = (m: string) =>
    MONTHS.findIndex((name) => name.toLowerCase() === m.trim().toLowerCase());
  const raw = {
    month: p.month ? monthIndex(p.month) : null,
    alsoMonths: p.also_months.map(monthIndex),
    targets: p.targets,
    cert: p.cert as ParsedTrip["cert"],
    current: p.current_limit as ParsedTrip["current"],
    format: p.format,
    diveType: p.dive_type,
    where: p.where,
    concerns: p.concerns as ParsedTrip["concerns"],
    unsupported: p.unsupported as ParsedTrip["unsupported"],
    destinations: p.destinations,
  };
  const trip = normalizeTrip(raw);
  const dropped = [
    ...(p.month && trip.month === null ? [`month:${p.month}`] : []),
    ...(["cert", "current", "format", "diveType", "where"] as const).flatMap((k) =>
      raw[k] && trip[k] !== raw[k] ? [`${k}:${raw[k]}`] : [],
    ),
    ...(["targets", "concerns", "unsupported", "destinations"] as const).flatMap((k) =>
      (raw[k] as string[])
        .filter((v) => !(trip[k] as string[]).includes(v))
        .map((v) => `${k}:${v}`),
    ),
  ];
  return { model: response.model, trip, dropped };
}

// ---------------------------------------------------------------------------
// Select evidence for a question

const SelectSchema = z.object({
  sentences: z.array(z.number().int()).describe("Sentence numbers, most useful first, at most 3"),
  status: z.string().describe("answered, partly, or not_covered"),
});

const SELECT_SYSTEM = `You help a scuba diver read one destination's record in a dive reference. The record is a numbered list of sentences, each with the note it comes from. Given the diver's question, choose the sentences that answer it: at most three, most useful first.

The diver will see exactly the sentences you choose, verbatim, and nothing else, so choose sentences that state the facts they need, not sentences that merely share a word with the question. If no sentence answers the question, return no sentences and status "not_covered"; that answer is correct and useful, and a loosely related sentence is not. Use "partly" when the sentences answer only part of it.`;

function numbered(passages: Passage[]) {
  return passages.map((p, i) => `S${i + 1} [${p.claim.label}] ${p.text}`).join("\n");
}

export type Selection = {
  passageIds: string[];
  status: "answered" | "partly" | "not_covered";
  /** Sentence numbers Claude returned that don't exist in the record. */
  rejected: number[];
  model: string;
};

export async function selectWithClaude(d: Destination, question: string): Promise<Selection> {
  const passages = passagesFor(d);
  const response = await client().beta.messages.parse({
    model: LLM_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SELECT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `<record destination="${d.name}, ${d.country}">\n${numbered(passages)}\n</record>\n\n<question>\n${question}\n</question>`,
      },
    ],
    output_config: { effort: "low", format: betaZodOutputFormat(SelectSchema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`no selection (stop_reason ${response.stop_reason})`);
  }
  const out = response.parsed_output;
  const status =
    (["answered", "partly", "not_covered"] as const).find((x) => x === out.status) ?? "answered";
  return validateSelection({ sentences: out.sentences, status }, passages, response.model);
}

/** Deterministic gate: only real sentence numbers survive, at most three, no repeats. */
export function validateSelection(
  out: { sentences: number[]; status: Selection["status"] },
  passages: Passage[],
  model: string,
): Selection {
  const rejected = out.sentences.filter(
    (n) => !Number.isInteger(n) || n < 1 || n > passages.length,
  );
  const ids = [
    ...new Set(out.sentences.filter((n) => !rejected.includes(n)).map((n) => passages[n - 1]!.id)),
  ].slice(0, 3);
  const status = out.status === "not_covered" || ids.length === 0 ? "not_covered" : out.status;
  return { passageIds: status === "not_covered" ? [] : ids, status, rejected, model };
}
