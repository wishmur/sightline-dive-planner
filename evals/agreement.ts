/**
 * Agreement between the concern gold and the second labeller:
 *   bun evals/label/server.ts     label the 60 sampled pairs (blind)
 *   bun evals/agreement.ts        this report → evals/reports/agreement.json
 *
 * Cohen's kappa at two levels with bootstrap 95% intervals, positive agreement
 * on sentences, and every disagreement listed for adjudication. Adjudication
 * outcomes go in the gold's `changes` with a dated reason; the agreement number
 * is always the pre-adjudication one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { GOLD } from "./concern-metrics";
import { band, compareLabels, type Level } from "./label/agreement-metrics";
import { LABELS_FILE, loadSample, validateLabels, type SecondLabels } from "./label/sample";

const sample = loadSample();
if (!existsSync(LABELS_FILE)) {
  console.log(
    `No second labels yet. Label the ${sample.pairs.length} sampled pairs blind:\n  bun evals/label/server.ts   (then open http://localhost:4321)`,
  );
  process.exit(0);
}
const labels = JSON.parse(readFileSync(LABELS_FILE, "utf8")) as SecondLabels;
const errors = validateLabels(sample, labels);
if (errors.length) {
  console.error(`labels don't match the sample:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const r = compareLabels(sample, labels, GOLD);
const f = (x: number) => x.toFixed(2);
const line = (name: string, l: Level) =>
  `${name.padEnd(10)} n=${String(l.n).padStart(4)} · κ ${f(l.kappa)} [${f(l.ci.low)}, ${f(l.ci.high)}] (${band(l.kappa)}) · observed agreement ${(l.observed * 100).toFixed(0)}% · table both/gold-only/second-only/neither ${l.table.a}/${l.table.b}/${l.table.c}/${l.table.d}`;

console.log(
  `\n=== Inter-annotator agreement · gold vs ${labels.labeller} · sample ${sample.version} ===`,
);
if (r.unfinished)
  console.log(`(${r.unfinished} of ${sample.pairs.length} pairs not labelled yet: left out)`);
console.log(line("pairs", r.pairs));
console.log(line("sentences", r.sentences));
console.log(
  `positive agreement on sentences (F1 between labellers): ${(r.sentences.positiveAgreement * 100).toFixed(0)}%`,
);
if (process.argv.includes("--disagreements")) {
  const text = (d: string, id: string) =>
    passagesFor(getDestination(d)!)
      .find((p) => p.id === id)
      ?.text.slice(0, 120) ?? id;
  for (const x of r.disagreements) {
    console.log(`\n  ${x.destination} · ${x.concern}`);
    for (const id of x.goldOnly) console.log(`    gold only:   ${text(x.destination, id)}`);
    for (const id of x.secondOnly) console.log(`    second only: ${text(x.destination, id)}`);
  }
} else if (r.disagreements.length) {
  console.log(`${r.disagreements.length} pairs disagree somewhere: --disagreements lists them`);
}

mkdirSync("evals/reports", { recursive: true });
writeFileSync(
  "evals/reports/agreement.json",
  JSON.stringify(
    { sample: sample.version, labeller: labels.labeller, labelledAt: labels.updatedAt, ...r },
    null,
    2,
  ) + "\n",
);
