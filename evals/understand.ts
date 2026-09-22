/**
 * "Describe your trip" report: `bun evals/understand.ts [llm]`
 *
 * Scores the rules parser, and with `llm` the Claude parser (needs
 * ANTHROPIC_API_KEY; ~40 short calls), against evals/understand.gold.ts.
 * Hard cases (colloquial or indirect phrasing) are reported separately.
 */
import { parseTripRules, type ParsedTrip } from "@/lib/understand";
import { UNDERSTAND_CASES, type UnderstandCase } from "./understand.gold";
import { HELDOUT_CASES } from "./understand.heldout";
import { scoreCase, summarize, type CaseResult } from "./understand-metrics";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

async function run(
  name: string,
  parse: (text: string) => Promise<ParsedTrip> | ParsedTrip,
  cases: UnderstandCase[],
) {
  const results: CaseResult[] = [];
  for (const c of cases) results.push(scoreCase(c, await parse(c.text)));
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
  const s = summarize(results);
  console.log(
    `         per field: ${Object.entries(s.perField)
      .map(([f, v]) => `${f} ${pct(v)}`)
      .join(" · ")}`,
  );
  if (process.argv.includes("--errors"))
    for (const r of results.filter((x) => x.wrong.length)) {
      console.log(`\n  ${r.c.id}${r.c.hard ? " (hard)" : ""}: ${r.c.text}`);
      for (const f of r.wrong) {
        const got = (r.got as Record<string, unknown>)[f];
        console.log(
          `    ${f}: got ${JSON.stringify(got)}${r.extra[f] ? ` extra ${r.extra[f]}` : ""}${r.missed[f] ? ` missed ${r.missed[f]}` : ""}`,
        );
      }
    }
  return results;
}

const sets = [
  { name: "gold (dev: the rules parser was fitted to it)", cases: UNDERSTAND_CASES },
  { name: "held-out (frozen before the first run)", cases: HELDOUT_CASES },
];
for (const set of sets) {
  console.log(`\n=== Describe your trip · ${set.name} ===\n`);
  await run("rules", parseTripRules, set.cases);
}

if (process.argv.includes("llm")) {
  const { understandWithClaude } = await import("@/lib/llm.server");
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("\nllm: skipped (ANTHROPIC_API_KEY not set)");
  } else {
    for (const set of sets) {
      console.log(`\n=== ${set.name} ===\n`);
      const dropped: string[] = [];
      await run(
        "claude",
        async (text) => {
          const r = await understandWithClaude(text);
          dropped.push(...r.dropped);
          return r.trip;
        },
        set.cases,
      );
      console.log(
        `         out-of-list values dropped: ${dropped.length}${dropped.length ? ` (${dropped.join(", ")})` : ""}`,
      );
    }
  }
}
