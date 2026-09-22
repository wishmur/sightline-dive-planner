/**
 * "Describe your trip" report:
 *   bun evals/understand.ts                      rules parser only (free)
 *   bun evals/understand.ts llm --dry-run        Claude: print requests, estimate cost, send nothing
 *   bun evals/understand.ts llm --limit 5        Claude: smoke run, first 5 cases of each set
 *   bun evals/understand.ts llm                  Claude: full run (records once; replays free after)
 *   … --split dev | test   --replay   --max-usd N   --errors
 *
 * Scores against evals/understand.gold.ts (dev: the rules parser was fitted to
 * it; any Claude prompt tuning happens here too) and evals/understand.heldout.ts
 * (test: frozen before the first run; never tuned on). Hard cases (colloquial or
 * indirect phrasing) are reported separately. Claude results are scored as
 * shipped: a failed call counts as the rules parser's answer, and failures are
 * counted. Reports go to evals/reports/understand.<mode>.json.
 */
import { parseTripRules } from "@/lib/understand";
import { UNDERSTAND_CASES } from "./understand.gold";
import { HELDOUT_CASES } from "./understand.heldout";
import { scoreCase, summarize, type CaseResult } from "./understand-metrics";
import { LlmHarness, parseHarnessArgs, printDryRun } from "./harness/llm-harness";
import { attempt, banner, footer, pick, tally, type Outcome } from "./harness/run-llm";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const args = parseHarnessArgs(process.argv.slice(2), process.env);

function report(name: string, results: CaseResult[]) {
  for (const [label, subset] of [
    ["all", results],
    ["normal", results.filter((r) => !r.c.hard)],
    ["hard", results.filter((r) => r.c.hard)],
  ] as const) {
    if (!subset.length) continue;
    const s = summarize([...subset]);
    console.log(
      `${name.padEnd(8)} ${label.padEnd(7)} n=${String(s.cases).padStart(2)} · exact ${pct(s.exact).padStart(4)} · fields ${pct(s.fieldAccuracy).padStart(4)} · concerns P ${pct(s.concernPrecision)} R ${pct(s.concernRecall)}`,
    );
  }
  if (!results.length) return;
  const s = summarize(results);
  console.log(
    `         per field: ${Object.entries(s.perField)
      .map(([f, v]) => `${f} ${pct(v)}`)
      .join(" · ")}`,
  );
  if (args.errors)
    for (const r of results.filter((x) => x.wrong.length)) {
      console.log(`\n  ${r.c.id}${r.c.hard ? " (hard)" : ""}: ${r.c.text}`);
      for (const f of r.wrong) {
        const got = (r.got as Record<string, unknown>)[f];
        console.log(
          `    ${f}: got ${JSON.stringify(got)}${r.extra[f] ? ` extra ${r.extra[f]}` : ""}${r.missed[f] ? ` missed ${r.missed[f]}` : ""}`,
        );
      }
    }
}

const SETS = [
  {
    name: "gold (dev: the rules parser was fitted to it)",
    split: "dev" as const,
    cases: UNDERSTAND_CASES,
  },
  {
    name: "held-out (test: frozen before the first run)",
    split: "test" as const,
    cases: HELDOUT_CASES,
  },
];

if (!args.llm || args.mode !== "dry-run")
  for (const set of SETS) {
    console.log(`\n=== Describe your trip · ${set.name} ===\n`);
    report(
      "rules",
      set.cases.map((c) => scoreCase(c, parseTripRules(c.text))),
    );
  }

if (args.llm) {
  const llm = await import("@/lib/llm.server");
  const h = new LlmHarness({ name: "understand", mode: args.mode, maxUsd: args.maxUsd });
  // Replay and dry runs never reach the API; the SDK still wants a key string.
  const opts = { fetch: h.fetch, apiKey: args.mode === "record" ? undefined : "no-network" };
  banner("Describe your trip", args);
  const all: Outcome<unknown>[] = [];
  const sets: Record<string, unknown>[] = [];
  for (const set of pick(SETS, args)) {
    const outcomes = [];
    for (const c of set.cases)
      outcomes.push(await attempt(() => llm.understandWithClaude(c.text, opts)));
    all.push(...outcomes);
    if (args.mode === "dry-run") continue;
    // As shipped: a failed Claude call is answered by the rules parser. Cases the
    // harness couldn't run (not cached, over budget) aren't scored at all.
    const scored = set.cases.flatMap((c, i) => {
      const o = outcomes[i]!;
      if (o.ok) return [scoreCase(c, o.value.trip)];
      if (["cache_miss", "budget"].includes(o.reason)) return [];
      return [scoreCase(c, parseTripRules(c.text))];
    });
    const dropped = outcomes.flatMap((o) => (o.ok ? o.value.dropped : []));
    console.log(`\n${set.name} · ${scored.length} of ${set.cases.length} scored\n`);
    report("claude", scored);
    console.log(
      `         out-of-list values dropped: ${dropped.length}${dropped.length ? ` (${dropped.join(", ")})` : ""}`,
    );
    sets.push({
      set: set.name,
      split: set.split,
      cases: set.cases.length,
      scored: scored.length,
      outcomes: tally(outcomes),
      summary: scored.length ? summarize(scored) : null,
      dropped,
      rows: scored.map((r) => ({
        id: r.c.id,
        hard: Boolean(r.c.hard),
        wrong: r.wrong,
        extra: r.extra,
        missed: r.missed,
      })),
    });
  }
  const meta = {
    model: llm.LLM_MODEL,
    prompt_version: llm.promptVersion("understand"),
    split: args.split,
    limit: args.limit === Infinity ? null : args.limit,
  };
  if (args.mode === "dry-run") {
    const estimate = printDryRun(h, { low: 150, high: 1000 }, args.showPrompts);
    h.writeReport({ ...meta, estimate });
  } else {
    footer(h, all);
    if (h.stats.cacheHits + h.stats.recorded) console.log(`report: ${h.writeReport({ ...meta, sets })}`);
  }
}
