/**
 * Ask confirmation run: `bun evals/ask-confirm.ts [llm] [--dry-run|--replay] [--errors]`
 *
 * Scores evals/ask.confirm.ts, written and labelled before any of it was sent.
 * Reports the keyword rules and, with `llm`, Claude as shipped (two sentences).
 * Pass marks are in the case file and were fixed before the run.
 */
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { askRules, type AskAnswer } from "@/lib/ask";
import { contextual } from "@/lib/retrieve";
import { CONFIRM_CASES } from "./ask.confirm";
import { relevantIds, scoreAsk } from "./ask";
import type { AskCase } from "./ask.gold";
import { LlmHarness, parseHarnessArgs, printDryRun } from "./harness/llm-harness";
import { attempt, banner, footer, tally, type Outcome } from "./harness/run-llm";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const args = parseHarnessArgs(process.argv.slice(2), process.env);

function report(name: string, results: { c: AskCase; a: AskAnswer }[]) {
  for (const kind of ["specific", "off_record", "paraphrase", "all"] as const) {
    const subset = kind === "all" ? results : results.filter((r) => r.c.kind === kind);
    if (!subset.length) continue;
    const s = scoreAsk(subset);
    console.log(
      `${name.padEnd(7)} ${kind.padEnd(11)} n=${String(s.n).padStart(2)} · hit ${pct(s.hit).padStart(4)} of ${s.answerable} · precision ${pct(s.precision).padStart(4)} · abstains ${pct(s.abstain).padStart(4)} of ${s.unanswerable}`,
    );
  }
  if (args.errors)
    for (const r of results) {
      const gold = relevantIds(r.c);
      const ok = gold.length
        ? r.a.passageIds.some((id) => gold.includes(id))
        : r.a.passageIds.length === 0;
      if (ok) continue;
      const d = getDestination(r.c.destination)!;
      const text = (id: string) =>
        contextual(passagesFor(d).find((p) => p.id === id)!).slice(0, 110);
      console.log(`\n  ${r.c.id} · ${r.c.destination}: ${r.c.question}`);
      for (const id of r.a.passageIds) console.log(`    shown: ${text(id)}`);
      for (const id of gold.slice(0, 2)) console.log(`    want:  ${text(id)}`);
    }
  return scoreAsk(results);
}

console.log(
  `\n=== Ask · confirmation set (${CONFIRM_CASES.length} questions, labelled first) ===\n`,
);
const rules = CONFIRM_CASES.map((c) => ({
  c,
  a: askRules(getDestination(c.destination)!, c.question),
}));
const rulesScore = report("rules", rules);

if (args.llm) {
  const llm = await import("@/lib/llm.server");
  const h = new LlmHarness({
    name: "ask-confirm",
    mode: args.mode,
    maxUsd: args.maxUsd,
    totalUsd: args.totalUsd,
  });
  const opts = { fetch: h.fetch, apiKey: args.mode === "record" ? undefined : "no-network" };
  banner("Ask confirmation set", args);
  const outcomes: Outcome<{ status: AskAnswer["status"]; passageIds: string[] }>[] = [];
  for (const c of CONFIRM_CASES)
    outcomes.push(
      await attempt(() => llm.selectWithClaude(getDestination(c.destination)!, c.question, opts)),
    );
  if (args.mode === "dry-run") {
    printDryRun(h, { low: 25, high: 100 }, args.showPrompts);
  } else {
    const scored = CONFIRM_CASES.flatMap((c, i) => {
      const o = outcomes[i]!;
      if (!o.ok) return o.reason === "cache_miss" || o.reason === "budget" ? [] : [];
      return [
        {
          c,
          a: {
            engine: "claude" as const,
            status: o.value.status,
            passageIds: o.value.passageIds,
            concerns: [],
          },
        },
      ];
    });
    console.log(`\nclaude · ${scored.length} of ${CONFIRM_CASES.length} scored\n`);
    const claudeScore = report("claude", scored);
    const offRecord = scored.filter((r) => r.c.kind === "off_record");
    const abstained = offRecord.filter((r) => r.a.passageIds.length === 0).length;
    const invalid = outcomes.reduce(
      (n, o) => n + (o.ok ? ((o.value as { rejected?: number[] }).rejected?.length ?? 0) : 0),
      0,
    );
    const verdict = {
      precision: [pct(claudeScore.precision), "≥ 80%", claudeScore.precision >= 0.8],
      hit: [
        pct(claudeScore.hit),
        `≥ rules (${pct(rulesScore.hit)})`,
        claudeScore.hit >= rulesScore.hit,
      ],
      abstains: [`${abstained}/${offRecord.length}`, "≥ 4/5", abstained >= 4],
      invalidSentences: [String(invalid), "0", invalid === 0],
      failedCalls: [String(outcomes.filter((o) => !o.ok).length), "0", outcomes.every((o) => o.ok)],
    } as const;
    console.log(`\npre-registered pass marks:`);
    for (const [k, [got, bar, ok]] of Object.entries(verdict))
      console.log(
        `  ${ok ? "PASS" : "FAIL"}  ${k.padEnd(16)} ${String(got).padStart(6)}  (${bar})`,
      );
    footer(h, outcomes);
    if (h.stats.cacheHits + h.stats.recorded)
      console.log(
        `report: ${h.writeReport({
          model: llm.LLM_MODEL,
          prompt_version: llm.promptVersion("ask"),
          cases: CONFIRM_CASES.length,
          outcomes: tally(outcomes),
          rules: rulesScore,
          claude: claudeScore,
          verdict,
          rows: scored.map((r) => ({
            id: r.c.id,
            kind: r.c.kind,
            status: r.a.status,
            shown: r.a.passageIds,
            relevant: relevantIds(r.c),
          })),
        })}`,
      );
  }
}
