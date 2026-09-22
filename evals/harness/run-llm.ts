/**
 * Shared plumbing for the Claude halves of evals/understand.ts, ask.ts and
 * verifier.ts: split and limit selection, per-case outcomes, and the summary.
 */
import { LlmError } from "@/lib/llm-guard";
import { LlmHarness, usd, type HarnessArgs, type Split } from "./llm-harness";

export type FailReason =
  | "dry_run"
  | "cache_miss"
  | "budget"
  | "refusal"
  | "invalid_output"
  | "timeout"
  | "api_error";
export type Outcome<R> = { ok: true; value: R } | { ok: false; reason: FailReason };

export async function attempt<R>(fn: () => Promise<R>): Promise<Outcome<R>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    if (LlmHarness.isDryRun(error)) return { ok: false, reason: "dry_run" };
    if (LlmHarness.isCacheMiss(error)) return { ok: false, reason: "cache_miss" };
    if (LlmHarness.isBudgetExceeded(error)) return { ok: false, reason: "budget" };
    if (error instanceof LlmError) return { ok: false, reason: error.reason };
    const name = error instanceof Error ? error.constructor.name : "";
    if (/Timeout/.test(name)) return { ok: false, reason: "timeout" };
    console.error(`  api error: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, reason: "api_error" };
  }
}

export function tally(outcomes: Outcome<unknown>[]) {
  const t: Partial<Record<FailReason | "ok", number>> = {};
  for (const o of outcomes) {
    const k = o.ok ? "ok" : o.reason;
    t[k] = (t[k] ?? 0) + 1;
  }
  return t;
}

/** Dev cases are for prompt tuning; test cases are scored, never tuned on. */
export function pick<C>(
  sets: { name: string; split: Exclude<Split, "all">; cases: C[] }[],
  args: Pick<HarnessArgs, "split" | "limit">,
) {
  return sets
    .filter((s) => args.split === "all" || s.split === args.split)
    .map((s) => ({ ...s, cases: s.cases.slice(0, args.limit) }));
}

export function banner(name: string, args: HarnessArgs) {
  const what = {
    "dry-run": "dry run: prints the requests and estimates cost; sends nothing",
    replay: "replay: scores cached responses only; sends nothing",
    record: `record: uncached requests are sent and paid for (budget ${usd(args.maxUsd)}), then cached`,
  }[args.mode];
  console.log(`\n=== ${name} · Claude · ${what} ===`);
  if (args.limit !== Infinity) console.log(`limit: first ${args.limit} cases of each set`);
  if (args.split !== "all") console.log(`split: ${args.split} only`);
}

export function footer(h: LlmHarness, outcomes: Outcome<unknown>[]) {
  const t = tally(outcomes);
  const failures = Object.entries(t)
    .filter(([k]) => k !== "ok")
    .map(([k, v]) => `${k} ${v}`);
  console.log(
    `\nrequests ${h.stats.requests} · recorded ${h.stats.recorded} · from cache ${h.stats.cacheHits}` +
      ` · spent this run ${usd(h.stats.spentUsd)} (all responses together: ${usd(h.stats.representedUsd)})` +
      (failures.length ? ` · not scored: ${failures.join(", ")}` : ""),
  );
  const lat = [...h.stats.latencyMs].sort((a, b) => a - b);
  if (lat.length)
    console.log(
      `latency as recorded: p50 ${lat[Math.floor(lat.length * 0.5)]} ms · p95 ${lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))]} ms (n=${lat.length})`,
    );
  if (t.cache_miss)
    console.log(
      `${t.cache_miss} cases have no cached response: run with ANTHROPIC_API_KEY set to record them.`,
    );
  if (t.budget) console.log(`budget reached: raise --max-usd to finish the remaining cases.`);
}
