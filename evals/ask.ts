/**
 * "Ask about this destination" report:
 *   bun evals/ask.ts [--errors]              rules path only (free)
 *   bun evals/ask.ts llm --dry-run           Claude: print requests, estimate cost, send nothing
 *   bun evals/ask.ts llm --limit 5           Claude: smoke run, first 5 of each half
 *   bun evals/ask.ts llm                     Claude: full run (records once; replays free after)
 *   … --split dev | test   --replay   --max-usd N
 *
 * Scores the rules path (concern routing → lexicon, else BM25) and Claude's
 * sentence selection on evals/ask.gold.ts. The BM25 threshold is tuned on the
 * dev half (even case numbers) and reported on the test half; Claude prompt
 * tuning, if any, is held to the same split. Claude results are scored as
 * shipped: a failed call counts as the rules answer. Reports go to
 * evals/reports/ask.<mode>.json.
 */
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { askRules, type AskAnswer } from "@/lib/ask";
import { contextual } from "@/lib/retrieve";
import { ASK_CASES, type AskCase } from "./ask.gold";
import { GOLD } from "./concern-metrics";
import { LlmHarness, parseHarnessArgs, printDryRun } from "./harness/llm-harness";
import { attempt, banner, footer, pick, tally, type Outcome } from "./harness/run-llm";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function relevantIds(c: AskCase): string[] {
  if (c.concern) return GOLD[c.destination]?.[c.concern] ?? [];
  const ps = passagesFor(getDestination(c.destination)!);
  return (c.relevant ?? []).map((n) => ps[n - 1]!.id);
}

export const isDev = (c: AskCase) => ASK_CASES.indexOf(c) % 2 === 0;

export function scoreAsk(results: { c: AskCase; a: AskAnswer }[]) {
  const answerable = results.filter((r) => relevantIds(r.c).length > 0);
  const unanswerable = results.filter((r) => relevantIds(r.c).length === 0);
  const shown = results.reduce((n, r) => n + r.a.passageIds.length, 0);
  const good = results.reduce(
    (n, r) => n + r.a.passageIds.filter((id) => relevantIds(r.c).includes(id)).length,
    0,
  );
  return {
    n: results.length,
    hit:
      answerable.filter((r) => r.a.passageIds.some((id) => relevantIds(r.c).includes(id))).length /
      Math.max(1, answerable.length),
    precision: shown ? good / shown : 1,
    abstain:
      unanswerable.filter((r) => r.a.passageIds.length === 0).length /
      Math.max(1, unanswerable.length),
    answerable: answerable.length,
    unanswerable: unanswerable.length,
  };
}

function report(name: string, results: { c: AskCase; a: AskAnswer }[]) {
  for (const kind of ["specific", "off_record", "paraphrase", "all"] as const) {
    const subset = kind === "all" ? results : results.filter((r) => r.c.kind === kind);
    const s = scoreAsk(subset);
    console.log(
      `${name.padEnd(7)} ${kind.padEnd(11)} n=${String(s.n).padStart(3)} · hit ${pct(s.hit).padStart(4)} of ${s.answerable} · precision ${pct(s.precision).padStart(4)} · abstains ${pct(s.abstain).padStart(4)} of ${s.unanswerable}`,
    );
  }
  if (process.argv.includes("--errors"))
    for (const r of results) {
      const gold = relevantIds(r.c);
      const ok = gold.length
        ? r.a.passageIds.some((id) => gold.includes(id))
        : r.a.passageIds.length === 0;
      if (ok) continue;
      const d = getDestination(r.c.destination)!;
      const text = (id: string) =>
        contextual(passagesFor(d).find((p) => p.id === id)!).slice(0, 110);
      console.log(
        `\n  ${r.c.id} · ${r.c.destination}: ${r.c.question}  [${r.a.concerns.join(",") || "bm25"}]`,
      );
      for (const id of r.a.passageIds) console.log(`    shown: ${text(id)}`);
      for (const id of gold.slice(0, 2)) console.log(`    want:  ${text(id)}`);
    }
}

if (import.meta.main) {
  const args = parseHarnessArgs(process.argv.slice(2), process.env);
  const byHalf = (cases: AskCase[]) => [
    { name: "dev half", split: "dev" as const, cases: cases.filter(isDev) },
    { name: "test half", split: "test" as const, cases: cases.filter((c) => !isDev(c)) },
  ];

  if (!args.llm || args.mode !== "dry-run") {
    console.log(
      `\n=== Ask about this destination (${ASK_CASES.length} questions, ${DESTINATIONS.length} records) ===`,
    );
    for (const half of byHalf(ASK_CASES)) {
      console.log(`\n${half.name}:`);
      report(
        "rules",
        half.cases.map((c) => ({ c, a: askRules(getDestination(c.destination)!, c.question) })),
      );
    }
  }

  if (args.llm) {
    const llm = await import("@/lib/llm.server");
    const h = new LlmHarness({
      name: "ask",
      mode: args.mode,
      maxUsd: args.maxUsd,
      totalUsd: args.totalUsd,
    });
    const opts = { fetch: h.fetch, apiKey: args.mode === "record" ? undefined : "no-network" };
    banner("Ask about this destination", args);
    const all: Outcome<unknown>[] = [];
    const halves: Record<string, unknown>[] = [];
    for (const half of pick(byHalf(ASK_CASES), args)) {
      const outcomes = [];
      for (const c of half.cases)
        outcomes.push(
          await attempt(() =>
            llm.selectWithClaude(getDestination(c.destination)!, c.question, opts),
          ),
        );
      all.push(...outcomes);
      if (args.mode === "dry-run") continue;
      const scored = half.cases.flatMap((c, i) => {
        const o = outcomes[i]!;
        const d = getDestination(c.destination)!;
        if (o.ok)
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
        if (["cache_miss", "budget"].includes(o.reason)) return [];
        return [{ c, a: askRules(d, c.question) }];
      });
      const rejected = outcomes.reduce((n, o) => n + (o.ok ? o.value.rejected.length : 0), 0);
      console.log(
        `\n${half.name} · ${scored.length} of ${half.cases.length} scored · invalid sentence numbers rejected: ${rejected}`,
      );
      report("claude", scored);
      halves.push({
        half: half.name,
        split: half.split,
        cases: half.cases.length,
        scored: scored.length,
        outcomes: tally(outcomes),
        rejected,
        byKind: Object.fromEntries(
          (["specific", "off_record", "paraphrase", "all"] as const).map((k) => [
            k,
            scoreAsk(k === "all" ? scored : scored.filter((r) => r.c.kind === k)),
          ]),
        ),
        rows: scored.map((r) => ({
          id: r.c.id,
          kind: r.c.kind,
          engine: r.a.engine,
          status: r.a.status,
          shown: r.a.passageIds,
          relevant: relevantIds(r.c),
        })),
      });
    }
    const meta = {
      model: llm.LLM_MODEL,
      prompt_version: llm.promptVersion("ask"),
      split: args.split,
      limit: args.limit === Infinity ? null : args.limit,
    };
    if (args.mode === "dry-run") {
      const estimate = printDryRun(h, { low: 100, high: 800 }, args.showPrompts);
      h.writeReport({ ...meta, estimate });
    } else {
      footer(h, all);
      if (h.stats.cacheHits + h.stats.recorded)
        console.log(`report: ${h.writeReport({ ...meta, halves })}`);
    }
  }
}
