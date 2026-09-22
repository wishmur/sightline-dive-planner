/**
 * Trip-fit eval report: `bun evals/report.ts`
 *
 * 1. Scenario goldens, shipped filter vs trip-fit engine.
 * 2. Evidence selection ("critical catches"): recall vs panel size, with an
 *    ablation of the linking strategy, and every miss listed.
 */
import { EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { runFit } from "@/lib/fit";
import { BASELINE_EMPTY, baselineApplyFilters } from "./baseline-filters";
import { SCENARIOS, type Scenario } from "./scenarios";
import { scoreCatches, summarize } from "./catches";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

type Check = { pass: number; total: number; failures: string[] };

function checkIds(s: Scenario, got: string[], near: Map<string, { reason?: string }>): Check {
  const failures: string[] = [];
  let pass = 0;
  let total = 0;
  const ok = (cond: boolean, msg: string) => {
    total++;
    if (cond) pass++;
    else failures.push(msg);
  };
  for (const id of s.mustInclude ?? []) ok(got.includes(id), `missing ${id}`);
  for (const id of s.mustExclude ?? []) ok(!got.includes(id), `wrongly shows ${id}`);
  if (s.exactCount !== undefined)
    ok(got.length === s.exactCount, `count ${got.length} ≠ ${s.exactCount}`);
  for (const n of s.nearMiss ?? [])
    ok(near.get(n.id)?.reason === n.reason, `no near miss for ${n.id} (${n.reason})`);
  return { pass, total, failures };
}

console.log("\n=== 1. Scenario goldens: shipped filter vs trip-fit ===\n");
let basePassed = 0;
let fitPassed = 0;
let baseChecks = 0;
let fitChecks = 0;
let checksTotal = 0;
const briefScenarios = SCENARIOS.filter((s) => !s.sameAsBaseline);
for (const s of briefScenarios) {
  const f: Filters = { ...EMPTY_FILTERS, ...s.brief };
  const fit = runFit(f);
  const fitIds = fit.results.map((r) => r.destination.id);
  const fitNear = new Map(
    fit.nearMisses.map((n) => [n.destination.id, { reason: n.violation?.reason }]),
  );
  const baseIds = baselineApplyFilters({
    ...BASELINE_EMPTY,
    ...s.brief,
    species: s.baselineSpecies ?? [],
  }).map((d) => d.id);

  const b = checkIds(s, baseIds, new Map());
  const n = checkIds(s, fitIds, fitNear);
  basePassed += Number(b.failures.length === 0);
  fitPassed += Number(n.failures.length === 0);
  baseChecks += b.pass;
  fitChecks += n.pass;
  checksTotal += b.total;
  const line = `${s.id.padEnd(34)} shipped ${String(b.pass).padStart(2)}/${b.total}   trip-fit ${String(n.pass).padStart(2)}/${n.total}`;
  console.log(
    line + (b.failures.length ? `   · shipped: ${b.failures.slice(0, 3).join("; ")}` : ""),
  );
}
console.log(
  `\nScenarios fully correct: shipped ${basePassed}/${briefScenarios.length} · trip-fit ${fitPassed}/${briefScenarios.length}`,
);
console.log(
  `Individual checks passed: shipped ${baseChecks}/${checksTotal} · trip-fit ${fitChecks}/${checksTotal}`,
);
console.log(
  `(Tier and flag expectations are checked in fit.test.ts; the shipped filter has no tiers or flags.)`,
);

console.log("\n=== 2. Evidence selection: critical-catch recall vs panel size ===\n");
for (const [name, options] of [
  ["alias linking", { siteLinking: false, monthLinking: false }],
  ["+ site-name linking", { siteLinking: true, monthLinking: false }],
  ["+ month linking (shipped)", { siteLinking: true, monthLinking: true }],
] as const) {
  const all = scoreCatches(options);
  const original = all.filter((r) => !r.c.addedAfter);
  const added = all.filter((r) => r.c.addedAfter);
  const s = summarize(original);
  const a = summarize(added);
  const results = all;
  console.log(
    `${name.padEnd(28)} recall ${pct(s.recall)} (${s.hit}/${s.total})  cases fully covered ${s.casesFullyCovered}/${s.cases}  ` +
      `panel median ${s.median}, max ${s.max}  ·  ${pct(s.shareOfPage)} of the claims on the page`,
  );
  console.log(
    `${"".padEnd(28)} post-hoc cases (written after month linking was designed): ${a.hit}/${a.total}`,
  );
  for (const r of results.filter((r) => r.missed.length)) {
    console.log(
      `   miss  ${r.c.id}: ${r.missed.map((m) => (Array.isArray(m) ? `any of ${m.join(" | ")}` : m)).join(", ")}`,
    );
  }
}

console.log("\n=== 3. Example panels (shipped settings) ===\n");
for (const r of scoreCatches({ siteLinking: true, monthLinking: true }).filter((r) =>
  [
    "komodo-mantas-jan",
    "baa-mantas-sep",
    "galapagos-whale-sharks-sep",
    "cabo-pulmo-bull-sharks-mar",
  ].includes(r.c.id),
)) {
  console.log(
    `${r.c.id} (${r.selected.length} of ${r.pageClaims} claims): ${r.selected.join(", ")}`,
  );
}
console.log(
  "\nKnown limitation: one labeller (the builder) wrote every gold label. External-diver review is pending.\n",
);
