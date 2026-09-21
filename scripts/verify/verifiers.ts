/**
 * Claim verifiers: does a claim's cited source text support it?
 *
 * - lexicalVerifier: deterministic baseline (token overlap). It cannot see a
 *   contradiction, which is the point of measuring it.
 * - llmVerifier: Claude judges support from the whole cited pages. The retrieval
 *   eval showed claim-as-query retrieval is confirmation-biased, so the model
 *   reads the pages instead of retrieved passages.
 *
 * Every verifier's output goes through validateOutput(): a quote that isn't
 * verbatim in the page it names is rejected and counted, never shown.
 * Verifier output is a proposal for human review; it never edits the dataset.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { chunk, containsQuote, tokenize } from "../lib/retrieval";

export const VERDICTS = ["supported", "partial", "contradicted", "not_found"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Page = { url: string; text: string };
export type VerifierInput = { claimId: string; label: string; text: string; pages: Page[] };
export type Quote = { url: string; text: string };
export type VerifierOutput = {
  verdict: Verdict;
  quotes: Quote[];
  conflict: Quote | null;
  note: string;
};
export type Verifier = (input: VerifierInput) => Promise<VerifierOutput>;

// ---------------------------------------------------------------------------
// Deterministic gate

export type Validated = { output: VerifierOutput; rejectedQuotes: Quote[] };

export function validateOutput(output: VerifierOutput, input: VerifierInput): Validated {
  const pageFor = new Map(input.pages.map((p) => [p.url, p.text]));
  const ok = (q: Quote) => {
    const page = pageFor.get(q.url);
    return Boolean(page) && q.text.split(/\s+/).length <= 25 && containsQuote(page!, q.text);
  };
  const rejectedQuotes = [
    ...output.quotes.filter((q) => !ok(q)),
    ...(output.conflict && !ok(output.conflict) ? [output.conflict] : []),
  ];
  const quotes = output.quotes.filter(ok);
  const conflict = output.conflict && ok(output.conflict) ? output.conflict : null;
  // A "supported" verdict with no surviving evidence cannot stand.
  const verdict =
    output.verdict === "supported" && quotes.length === 0 ? "not_found" : output.verdict;
  return { output: { ...output, verdict, quotes, conflict }, rejectedQuotes };
}

// ---------------------------------------------------------------------------
// Baseline: lexical overlap (thresholds fixed a priori, not tuned on gold)

export const LEXICAL_THRESHOLDS = { supported: 0.35, partial: 0.2 };

export function lexicalScore(input: VerifierInput) {
  const claim = new Set(tokenize(input.text));
  let best = { coverage: 0, url: "", sentence: "" };
  for (const page of input.pages) {
    for (const p of chunk(page.url, page.text)) {
      const tokens = new Set(p.tokens);
      const coverage = [...claim].filter((t) => tokens.has(t)).length / Math.max(1, claim.size);
      if (coverage > best.coverage) {
        const sentence =
          p.text
            .split(/(?<=[.!?])\s+|\n/)
            .map((s) => ({ s, n: tokenize(s).filter((t) => claim.has(t)).length }))
            .sort((a, b) => b.n - a.n)[0]?.s ?? "";
        best = { coverage, url: page.url, sentence };
      }
    }
  }
  return best;
}

export const lexicalVerifier: Verifier = async (input) => {
  const best = lexicalScore(input);
  const verdict: Verdict =
    best.coverage >= LEXICAL_THRESHOLDS.supported
      ? "supported"
      : best.coverage >= LEXICAL_THRESHOLDS.partial
        ? "partial"
        : "not_found";
  const quote = best.sentence.split(/\s+/).slice(0, 25).join(" ");
  return {
    verdict,
    quotes: quote ? [{ url: best.url, text: quote }] : [],
    conflict: null,
    note: `token coverage ${best.coverage.toFixed(2)}`,
  };
};

// ---------------------------------------------------------------------------
// LLM verifier

const VerdictSchema = z.object({
  verdict: z.enum(VERDICTS),
  quotes: z.array(z.object({ url: z.string(), text: z.string() })),
  conflict: z.object({ url: z.string(), text: z.string() }).nullable(),
  note: z.string(),
});

export const VERIFIER_MODEL = "claude-opus-5";
export const VERIFIER_PROMPT_VERSION = "v1-2026-09-21";

const SYSTEM = `You check claims from a dive-travel reference against the web pages the claim cites. Divers book trips on these claims, so a wrongly confirmed claim is the costly error.

Judge only against the pages provided, not general knowledge. Separate the claim's decisive facts (month windows, access and closures, rules, requirements, numbers, where something happens) from its editorial framing ("the trade nobody mentions", "the useful thing to know"); only the facts are checked.

Verdicts:
- supported: the pages state the decisive facts.
- partial: some decisive facts are stated; others are absent from the pages.
- contradicted: a page states something incompatible with a decisive fact.
- not_found: the pages do not address the decisive facts.

Quote the passages your verdict rests on verbatim, at most 25 words each, with the url of the page they come from. Quote the passage that contradicts when the verdict is contradicted. If two cited pages disagree with each other on a decisive fact, put the other side in "conflict". In "note", say in one or two sentences which facts are and aren't supported.`;

export function llmVerifier(client: Anthropic): Verifier {
  return async (input) => {
    const pages = input.pages.map((p) => `<page url="${p.url}">\n${p.text}\n</page>`).join("\n\n");
    const response = await client.beta.messages.parse({
      model: VERIFIER_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${pages}\n\n<claim id="${input.claimId}" label="${input.label}">\n${input.text}\n</claim>`,
        },
      ],
      output_config: { format: betaZodOutputFormat(VerdictSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return {
        verdict: "not_found",
        quotes: [],
        conflict: null,
        note: `no verdict (stop_reason ${response.stop_reason})`,
      };
    }
    return response.parsed_output;
  };
}
