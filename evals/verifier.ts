/**
 * Verifier eval: `bun evals/verifier.ts [lexical|llm] [--limit N]`
 *
 * Gold: the reviewed claims in data/verification/reviews.json. Claims corrected
 * after review are evaluated on their ORIGINAL text with their ORIGINAL verdict:
 * the contradicted cases are the ones a verifier most needs to catch.
 *
 * Headline metrics are not averaged together:
 *  - false-support rate: P(verifier says supported | gold contradicted or not_found).
 *    This is the dangerous error, and it gates adoption.
 *  - contradiction recall.
 *  - hallucinated-quote rate: quotes not verbatim in the named page (rejected).
 *  - accuracy and the confusion matrix, for context.
 *
 * Needs the private source cache (`bun scripts/sources/fetch.ts`). The llm mode
 * calls the Claude API and costs money; it runs only when you ask for it.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { getDestination } from "@/lib/destinations";
import { claimsFor } from "@/lib/claims";
import { cachePath } from "../scripts/sources/fetch";
import { REVIEWS, type ReviewFile } from "../scripts/verify/merge-reviews";
import { asReviewedText } from "./as-reviewed";
import {
  VERDICTS,
  lexicalVerifier,
  llmVerifier,
  validateOutput,
  type Verdict,
  type Verifier,
  type VerifierInput,
} from "../scripts/verify/verifiers";

export type GoldCase = { input: VerifierInput; gold: Verdict };

export function goldCases(): GoldCase[] {
  if (!existsSync(REVIEWS)) return [];
  const file: ReviewFile = JSON.parse(readFileSync(REVIEWS, "utf8"));
  const cases: GoldCase[] = [];
  for (const [id, review] of Object.entries(file.reviews)) {
    const claim = claimsFor(getDestination(id.split("/")[0]!)!).find((c) => c.id === id);
    if (!claim) continue;
    const text = asReviewedText(id, claim.text);
    const pages = claim.sources
      .filter((u) => existsSync(cachePath(u)))
      .map((u) => ({ url: u, text: readFileSync(cachePath(u), "utf8") }));
    if (!pages.length) continue;
    const gold = (review.correction?.previousVerdict ?? review.verdict) as Verdict;
    if (!VERDICTS.includes(gold)) continue;
    cases.push({ input: { claimId: id, label: claim.label, text, pages }, gold });
  }
  return cases;
}

export type Scored = {
  n: number;
  accuracy: number;
  falseSupportRate: number;
  falseSupportDenominator: number;
  contradictionRecall: number;
  contradictions: number;
  hallucinatedQuoteRate: number;
  confusion: Record<Verdict, Record<Verdict, number>>;
  rows: {
    claimId: string;
    gold: Verdict;
    predicted: Verdict;
    rejectedQuotes: number;
    note: string;
  }[];
};

export async function score(
  cases: GoldCase[],
  verifier: Verifier,
  concurrency = 1,
): Promise<Scored> {
  const confusion = Object.fromEntries(
    VERDICTS.map((g) => [g, Object.fromEntries(VERDICTS.map((p) => [p, 0]))]),
  ) as Scored["confusion"];
  const rows: Scored["rows"] = [];
  let quotes = 0;
  let rejected = 0;
  const queue = [...cases];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        const raw = await verifier(c.input);
        const { output, rejectedQuotes } = validateOutput(raw, c.input);
        quotes += raw.quotes.length + (raw.conflict ? 1 : 0);
        rejected += rejectedQuotes.length;
        confusion[c.gold][output.verdict]++;
        rows.push({
          claimId: c.input.claimId,
          gold: c.gold,
          predicted: output.verdict,
          rejectedQuotes: rejectedQuotes.length,
          note: output.note,
        });
      }
    }),
  );
  const bad = rows.filter((r) => r.gold === "contradicted" || r.gold === "not_found");
  const contradictions = rows.filter((r) => r.gold === "contradicted");
  return {
    n: rows.length,
    accuracy: rows.filter((r) => r.gold === r.predicted).length / rows.length,
    falseSupportRate: bad.length
      ? bad.filter((r) => r.predicted === "supported").length / bad.length
      : 0,
    falseSupportDenominator: bad.length,
    contradictionRecall: contradictions.length
      ? contradictions.filter((r) => r.predicted === "contradicted").length / contradictions.length
      : 0,
    contradictions: contradictions.length,
    hallucinatedQuoteRate: quotes ? rejected / quotes : 0,
    confusion,
    rows: rows.sort((a, b) => a.claimId.localeCompare(b.claimId)),
  };
}

function print(name: string, s: Scored) {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  console.log(`\n=== ${name} · ${s.n} claims ===`);
  console.log(
    `false-support rate   ${pct(s.falseSupportRate)}  (of ${s.falseSupportDenominator} claims whose sources contradict or don't state them)`,
  );
  console.log(`contradiction recall ${pct(s.contradictionRecall)}  (of ${s.contradictions})`);
  console.log(`hallucinated quotes  ${pct(s.hallucinatedQuoteRate)}`);
  console.log(`accuracy             ${pct(s.accuracy)}`);
  console.log(`confusion (rows = gold, cols = predicted):`);
  console.log(`  ${"".padEnd(13)}${VERDICTS.map((v) => v.slice(0, 11).padStart(13)).join("")}`);
  for (const g of VERDICTS)
    console.log(
      `  ${g.padEnd(13)}${VERDICTS.map((p) => String(s.confusion[g][p]).padStart(13)).join("")}`,
    );
}

if (import.meta.main) {
  const mode = process.argv[2] ?? "lexical";
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
  const cases = goldCases().slice(0, limit);
  if (!cases.length) {
    console.log(
      "No gold cases: run `bun scripts/sources/fetch.ts` first (the source cache is private).",
    );
    process.exit(0);
  }
  let verifier: Verifier;
  if (mode === "llm") {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      console.log(
        "The llm verifier needs Claude API credentials (ANTHROPIC_API_KEY). It was not run.",
      );
      process.exit(0);
    }
    verifier = llmVerifier(new Anthropic());
  } else {
    verifier = lexicalVerifier;
  }
  const s = await score(cases, verifier, mode === "llm" ? 4 : 1);
  print(
    mode === "llm"
      ? "LLM verifier (claude-opus-5, whole cited pages)"
      : "Lexical baseline (token overlap, a-priori thresholds)",
    s,
  );
  if (mode === "lexical") {
    const contradictedPredictions = s.rows
      .filter((r) => r.gold === "contradicted")
      .map((r) => `${r.claimId} → ${r.predicted}`);
    console.log(
      `\ncontradicted claims, as the baseline saw them:\n  ${contradictedPredictions.join("\n  ")}`,
    );
  }
  mkdirSync("evals/reports", { recursive: true });
  writeFileSync(`evals/reports/verifier-${mode}.json`, JSON.stringify(s, null, 2) + "\n");
}
