/** Field-level scoring for "Describe your trip", shared by the test and the report. */
import type { ParsedTrip } from "@/lib/understand";
import type { TripExpectation, UnderstandCase } from "./understand.gold";

export const SCALAR_FIELDS = ["month", "cert", "current", "format", "diveType", "where"] as const;
export const SET_FIELDS = [
  "alsoMonths",
  "targets",
  "concerns",
  "unsupported",
  "destinations",
] as const;
export type Field = (typeof SCALAR_FIELDS)[number] | (typeof SET_FIELDS)[number];

export function expected(e: TripExpectation): ParsedTrip {
  return {
    month: e.month,
    alsoMonths: e.alsoMonths ?? [],
    targets: e.targets ?? [],
    cert: e.cert ?? null,
    current: e.current ?? null,
    format: e.format ?? null,
    diveType: e.diveType ?? null,
    where: e.where ?? null,
    concerns: e.concerns ?? [],
    unsupported: e.unsupported ?? [],
    destinations: e.destinations ?? [],
  };
}

export type CaseResult = {
  c: UnderstandCase;
  got: ParsedTrip;
  wrong: Field[];
  /** Set fields: items predicted that gold doesn't have / gold items missed. */
  extra: Record<string, string[]>;
  missed: Record<string, string[]>;
};

export function scoreCase(c: UnderstandCase, got: ParsedTrip): CaseResult {
  const want = expected(c.expect);
  const wrong: Field[] = [];
  const extra: Record<string, string[]> = {};
  const missed: Record<string, string[]> = {};
  for (const f of SCALAR_FIELDS) if (got[f] !== want[f]) wrong.push(f);
  for (const f of SET_FIELDS) {
    const g = (got[f] as (string | number)[]).map(String);
    const w = (want[f] as (string | number)[]).map(String);
    const x = g.filter((v) => !w.includes(v));
    const m = w.filter((v) => !g.includes(v));
    if (x.length || m.length) wrong.push(f);
    if (x.length) extra[f] = x;
    if (m.length) missed[f] = m;
  }
  return { c, got, wrong, extra, missed };
}

export function summarize(results: CaseResult[]) {
  const fields = [...SCALAR_FIELDS, ...SET_FIELDS];
  const perField = Object.fromEntries(
    fields.map((f) => [f, results.filter((r) => !r.wrong.includes(f)).length / results.length]),
  ) as Record<Field, number>;
  // Set precision/recall for concerns: the field that drives new UI.
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const r of results) {
    const want = expected(r.c.expect).concerns;
    tp += r.got.concerns.filter((c) => want.includes(c)).length;
    fp += r.got.concerns.filter((c) => !want.includes(c)).length;
    fn += want.filter((c) => !r.got.concerns.includes(c)).length;
  }
  return {
    cases: results.length,
    exact: results.filter((r) => r.wrong.length === 0).length / results.length,
    fieldAccuracy:
      results.reduce((n, r) => n + (fields.length - r.wrong.length), 0) /
      (results.length * fields.length),
    perField,
    concernPrecision: tp + fp ? tp / (tp + fp) : 1,
    concernRecall: tp + fn ? tp / (tp + fn) : 1,
  };
}
