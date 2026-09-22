/**
 * Verifier eval:
 *   bun evals/verifier.ts                     lexical baseline (free)
 *   bun evals/verifier.ts llm --dry-run       Claude: estimate cost, send nothing
 *   bun evals/verifier.ts llm --limit 5       Claude: smoke run, first 5 of each split
 *   bun evals/verifier.ts llm                 Claude: full run (records once; replays free after)
 *   … --split dev | test   --replay   --max-usd N   --show-prompts
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
 * calls the Claude API and costs money; it runs only when you ask for it, and
 * through the eval harness: each response is paid for once and replayed free.
 * Split for any prompt tuning: claims sorted by ID, even positions dev, odd test.
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
  VERIFIER_MODEL,
  VERIFIER_PROMPT_VERSION,
  type Verdict,
  type Verifier,
  type VerifierInput,
} from "../scripts/verify/verifiers";
import { LlmHarness, parseHarnessArgs, printDryRun } from "./harness/llm-harness";
import { attempt, banner, footer, pick, tally, type Outcome } from "./harness/run-llm";

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

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i]!);
    }),
  );
  return out;
}

async function runLlm(cases: GoldCase[]) {
  const args = parseHarnessArgs(process.argv.slice(2), process.env);
  const h = new LlmHarness({ name: "verifier", mode: args.mode, maxUsd: args.maxUsd });
  const client = new Anthropic({
    fetch: h.fetch,
    maxRetries: 1,
    ...(args.mode === "record" ? {} : { apiKey: "no-network" }),
  });
  const verifier = llmVerifier(client);
  banner("Source verifier", args);
  const sorted = [...cases].sort((a, b) => a.input.claimId.localeCompare(b.input.claimId));
  const sets = [
    { name: "dev", split: "dev" as const, cases: sorted.filter((_, i) => i % 2 === 0) },
    { name: "test", split: "test" as const, cases: sorted.filter((_, i) => i % 2 === 1) },
  ];
  const all: Outcome<unknown>[] = [];
  const results: Record<string, unknown>[] = [];
  for (const set of pick(sets, args)) {
    const outcomes = await pool(set.cases, 4, (c) => attempt(() => verifier(c.input)));
    all.push(...outcomes);
    if (args.mode === "dry-run") continue;
    const ran = set.cases.filter((_, i) => outcomes[i]!.ok);
    const outputs = new Map(
      ran.map((c) => {
        const o = outcomes[set.cases.indexOf(c)]!;
        return [c.input.claimId, o.ok ? o.value : null] as const;
      }),
    );
    // The verifier turns a refusal into a "no verdict" not_found; count those apart.
    const noVerdict = [...outputs.values()].filter((o) => o?.note.startsWith("no verdict")).length;
    const s = await score(ran, async (input) => outputs.get(input.claimId)!);
    print(`LLM verifier (${VERIFIER_MODEL}, whole cited pages) · ${set.name}`, s);
    console.log(`no verdict (refusal or unparseable): ${noVerdict}`);
    results.push({ set: set.name, outcomes: tally(outcomes), noVerdict, ...s });
  }
  const meta = {
    model: VERIFIER_MODEL,
    prompt_version: VERIFIER_PROMPT_VERSION,
    split: args.split,
  };
  if (args.mode === "dry-run") {
    const estimate = printDryRun(h, { low: 1000, high: 5000 }, args.showPrompts, {
      privatePrompts: true,
    });
    h.writeReport({ ...meta, estimate });
  } else {
    footer(h, all);
    if (h.stats.cacheHits + h.stats.recorded) console.log(`report: ${h.writeReport({ ...meta, sets: results })}`);
  }
}

if (import.meta.main) {
  const llm = process.argv.includes("llm") || process.argv.includes("--dry-run");
  const cases = goldCases();
  if (!cases.length) {
    console.log(
      "No gold cases: run `bun scripts/sources/fetch.ts` first (the source cache is private).",
    );
    process.exit(0);
  }
  if (llm) {
    await runLlm(cases);
  } else {
    const s = await score(cases, lexicalVerifier);
    print("Lexical baseline (token overlap, a-priori thresholds)", s);
    const contradictedPredictions = s.rows
      .filter((r) => r.gold === "contradicted")
      .map((r) => `${r.claimId} → ${r.predicted}`);
    console.log(
      `\ncontradicted claims, as the baseline saw them:\n  ${contradictedPredictions.join("\n  ")}`,
    );
    mkdirSync("evals/reports", { recursive: true });
    writeFileSync("evals/reports/verifier-lexical.json", JSON.stringify(s, null, 2) + "\n");
  }
}
