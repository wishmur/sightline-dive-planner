/**
 * "Ask about this destination" report: `bun evals/ask.ts [llm] [--errors]`
 *
 * Scores the rules path (concern routing → lexicon, else BM25) and, with `llm`,
 * Claude's sentence selection (needs ANTHROPIC_API_KEY; ~100 short calls), on
 * evals/ask.gold.ts. The BM25 threshold is tuned on the dev half (even case
 * numbers) and reported on the test half.
 */
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { askRules, type AskAnswer } from "@/lib/ask";
import { contextual } from "@/lib/retrieve";
import { ASK_CASES, type AskCase } from "./ask.gold";
import { GOLD } from "./concern-metrics";

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
  console.log(
    `\n=== Ask about this destination (${ASK_CASES.length} questions, ${DESTINATIONS.length} records) ===\n`,
  );
  const rules = ASK_CASES.map((c) => ({
    c,
    a: askRules(getDestination(c.destination)!, c.question),
  }));
  console.log("dev half:");
  report(
    "rules",
    rules.filter((r) => isDev(r.c)),
  );
  console.log("\ntest half:");
  report(
    "rules",
    rules.filter((r) => !isDev(r.c)),
  );

  if (process.argv.includes("llm")) {
    const { hasClaude, selectWithClaude } = await import("@/lib/llm.server");
    if (!hasClaude()) console.log("\nllm: skipped (ANTHROPIC_API_KEY not set)");
    else {
      const claude: { c: AskCase; a: AskAnswer }[] = [];
      let rejected = 0;
      for (const c of ASK_CASES) {
        const s = await selectWithClaude(getDestination(c.destination)!, c.question);
        rejected += s.rejected.length;
        claude.push({
          c,
          a: { engine: "claude", status: s.status, passageIds: s.passageIds, concerns: [] },
        });
      }
      console.log(
        `\nclaude (all ${ASK_CASES.length}; nothing was tuned on it) · invalid sentence numbers rejected: ${rejected}`,
      );
      report("claude", claude);
    }
  }
}
