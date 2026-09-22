/**
 * Cost and latency model for the two Claude routes: `bun evals/cost-model.ts`
 *
 * Token counts are MEASURED where the paid evals recorded them (evals/cache/llm:
 * input, cached prefix and output tokens per call, adaptive thinking included),
 * and fall back to characters ÷ 3.5 otherwise. The usage mix per visitor and the
 * cache-hit model are still assumptions, to be replaced by docs/metrics.sql
 * queries 8, 11 and 14 once the site has traffic. Prices are list prices
 * (src/lib/llm-guard.ts).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { getDestination } from "@/lib/destinations";
import { parseTripRules } from "@/lib/understand";
import { askRules } from "@/lib/ask";
import { GUARD_DEFAULTS, PRICES_PER_MTOK } from "@/lib/llm-guard";
import { LLM_MODEL, MAX_TOKENS, selectParams, understandParams } from "@/lib/llm.server";
import { ASK_CASES } from "./ask.gold";
import { UNDERSTAND_CASES } from "./understand.gold";
import { HELDOUT_CASES } from "./understand.heldout";
import { CACHE_DIR, CHARS_PER_TOKEN, tokenSplit } from "./harness/llm-harness";

const P = PRICES_PER_MTOK[LLM_MODEL]!;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const p90 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.9)]!;
const TTL_MIN = 5;
const DAYS = 30;

// --- Measured usage from the paid evals, when recorded ------------------------
type Measured = {
  n: number;
  total: number;
  prefix: number;
  out: { low: number; mid: number; high: number };
};
function measured(route: "understand" | "ask"): Measured | null {
  if (!existsSync(CACHE_DIR)) return null;
  const rows = readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${CACHE_DIR}/${f}`, "utf8")))
    .filter((r) => r.eval === route)
    .map((r) => r.response.usage);
  if (!rows.length) return null;
  const prefix = rows.map(
    (u) => (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
  );
  const total = rows.map((u, i) => u.input_tokens + prefix[i]!);
  const out = rows.map((u) => u.output_tokens as number);
  return {
    n: rows.length,
    total: median(total),
    prefix: median(prefix),
    out: {
      low: median(out),
      mid: out.reduce((a, b) => a + b, 0) / out.length,
      high: Math.max(...out),
    },
  };
}

// --- Assumptions where nothing is measured -----------------------------------
const ASSUMED_OUTPUT = {
  understand: { low: 150, mid: 400, high: 1000 },
  ask: { low: 100, mid: 300, high: 800 },
};
/** Of monthly visitors: share who use each feature, and uses per user. */
const MIX = {
  understand: { share: 0.4, perUser: 1.3 },
  ask: { share: 0.25, perUser: 2.5 },
};
/** Ask questions per destination page visit, in a burst (the record stays cached). */
const QUESTIONS_PER_PAGE = 2;
const SCALES = [1_000, 10_000, 100_000];

// --- Real request sizes -----------------------------------------------------

const u = [...UNDERSTAND_CASES, ...HELDOUT_CASES].map((c) => tokenSplit(understandParams(c.text)));
const a = ASK_CASES.map((c) =>
  tokenSplit(selectParams(getDestination(c.destination)!, c.question)),
);

type Split = { total: number; prefix: number; cacheable: boolean };
function perCall(s: Split, output: number, hit: boolean | "none") {
  const rest = s.total - s.prefix;
  const prefixRate = !s.cacheable || hit === "none" ? P.input : hit ? P.cacheRead : P.cacheWrite;
  return (rest * P.input + s.prefix * prefixRate + output * P.output) / 1e6;
}
const typical = (xs: Split[]): Split => ({
  total: median(xs.map((x) => x.total)),
  prefix: median(xs.map((x) => x.prefix)),
  cacheable: xs.every((x) => x.cacheable),
});
const Um = measured("understand");
const Am = measured("ask");
const estU = typical(u);
const estA = typical(a);
const U: Split = Um ? { total: Um.total, prefix: Um.prefix, cacheable: true } : estU;
const A: Split = Am ? { total: Am.total, prefix: Am.prefix, cacheable: true } : estA;
const OUTPUT = {
  understand: Um ? Um.out : ASSUMED_OUTPUT.understand,
  ask: Am ? Am.out : ASSUMED_OUTPUT.ask,
};

/** Chance another Describe call lands within the cache TTL, if calls arrive at random. */
function describeHitRate(users: number) {
  const perMinute = (users * MIX.understand.share * MIX.understand.perUser) / (DAYS * 24 * 60);
  return 1 - Math.exp(-perMinute * TTL_MIN);
}
/** Ask: the first question on a page writes the record to cache, the rest read it. */
const askHitRate = (QUESTIONS_PER_PAGE - 1) / QUESTIONS_PER_PAGE;

function monthly(users: number, level: "low" | "mid" | "high") {
  const hu = describeHitRate(users);
  const cu =
    hu * perCall(U, OUTPUT.understand[level], true) +
    (1 - hu) * perCall(U, OUTPUT.understand[level], false);
  const ca =
    askHitRate * perCall(A, OUTPUT.ask[level], true) +
    (1 - askHitRate) * perCall(A, OUTPUT.ask[level], false);
  const calls = {
    understand: users * MIX.understand.share * MIX.understand.perUser,
    ask: users * MIX.ask.share * MIX.ask.perUser,
  };
  return { usd: calls.understand * cu + calls.ask * ca, calls, hu };
}

// --- Rules latency, measured on this machine ---------------------------------
function timeIt(fn: () => void, n: number) {
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn();
  return (performance.now() - t0) / n;
}
const rulesParseMs =
  timeIt(() => {
    for (const c of HELDOUT_CASES) parseTripRules(c.text);
  }, 20) / HELDOUT_CASES.length;
const rulesAskMs =
  timeIt(() => {
    for (const c of ASK_CASES) askRules(getDestination(c.destination)!, c.question);
  }, 5) / ASK_CASES.length;

// --- Report -----------------------------------------------------------------
const $ = (n: number) =>
  n < 0.01 ? `$${n.toFixed(4)}` : n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
const k = (n: number) => `${(n / 1000).toFixed(1)}k`;

console.log(
  `\n# Cost and latency model · ${LLM_MODEL} · effort low · max_tokens ${MAX_TOKENS}`,
);
console.log(
  `list prices per MTok: input $${P.input} · output $${P.output} · cache write $${P.cacheWrite} · cache read $${P.cacheRead}`,
);
console.log(
  Um && Am
    ? `tokens: MEASURED from ${Um.n} describe and ${Am.n} ask calls in the paid evals\n`
    : `tokens ≈ characters ÷ ${CHARS_PER_TOKEN} (not yet measured)\n`,
);

console.log(`## Input per call`);
console.log(
  `describe  median ${k(U.total)} tokens (cached prefix ${k(U.prefix)}: system prompt + ID lists)${Um ? ` · the characters ÷ ${CHARS_PER_TOKEN} estimate was ${k(estU.total)} (${(Um.total / estU.total).toFixed(1)}× under)` : ` · p90 ${k(p90(u.map((x) => x.total)))}`}`,
);
console.log(
  `ask       median ${k(A.total)} tokens (cached prefix ${k(A.prefix)}: that destination's record)${Am ? ` · estimate was ${k(estA.total)} (${(Am.total / estA.total).toFixed(1)}× under)` : ` · p90 ${k(p90(a.map((x) => x.total)))}`}\n`,
);

console.log(
  `## Cost per call (output ${Um && Am ? "measured: median / mean / max" : "assumed: low / mid / high"} = describe ${Math.round(OUTPUT.understand.low)}/${Math.round(OUTPUT.understand.mid)}/${Math.round(OUTPUT.understand.high)}, ask ${Math.round(OUTPUT.ask.low)}/${Math.round(OUTPUT.ask.mid)}/${Math.round(OUTPUT.ask.high)} tokens)`,
);
for (const [name, s, out] of [
  ["describe", U, OUTPUT.understand],
  ["ask", A, OUTPUT.ask],
] as const) {
  const row = (hit: boolean | "none") =>
    (["low", "mid", "high"] as const).map((l) => $(perCall(s, out[l], hit))).join(" / ");
  console.log(
    `${name.padEnd(9)} cache miss (write) ${row(false)} · cache hit ${row(true)} · no caching ${row("none")}`,
  );
}
console.log(
  `worst case per call (no cache, all ${MAX_TOKENS} output tokens): describe ${$(perCall(U, MAX_TOKENS, "none"))} · ask ${$(perCall(A, MAX_TOKENS, "none"))}\n`,
);

console.log(
  `## Monthly cost by traffic (mix: ${MIX.understand.share * 100}% describe ×${MIX.understand.perUser}, ${MIX.ask.share * 100}% ask ×${MIX.ask.perUser}; ${QUESTIONS_PER_PAGE} questions a page)`,
);
console.log(
  `| visitors/month | Claude calls | describe cache hits | low | mid | high | per 1,000 visitors (mid) |`,
);
console.log(`|---|---|---|---|---|---|---|`);
for (const users of SCALES) {
  const [lo, mid, hi] = (["low", "mid", "high"] as const).map((l) => monthly(users, l));
  const calls = mid!.calls.understand + mid!.calls.ask;
  console.log(
    `| ${users.toLocaleString()} | ${Math.round(calls).toLocaleString()} | ${(mid!.hu * 100).toFixed(0)}% | ${$(lo!.usd)} | ${$(mid!.usd)} | ${$(hi!.usd)} | ${$((mid!.usd / users) * 1000)} |`,
  );
}

// Break-even traffic for caching the describe prompt: hit·0.1 + miss·1.25 = 1.
const pBreak = (P.cacheWrite - P.input) / (P.cacheWrite - P.cacheRead);
const callsPerMinute = -Math.log(1 - pBreak) / TTL_MIN;
const usersBreak =
  (callsPerMinute * DAYS * 24 * 60) / (MIX.understand.share * MIX.understand.perUser);
console.log(
  `\ncaching the describe prompt pays off once ${(pBreak * 100).toFixed(0)}% of calls hit the 5-minute cache: about ${Math.round(usersBreak).toLocaleString()} visitors a month at this mix. Below that each call pays the 1.25× write.`,
);
const mid1k = monthly(1_000, "mid");
const noCache1k =
  mid1k.calls.understand * perCall(U, OUTPUT.understand.mid, "none") +
  mid1k.calls.ask *
    (askHitRate * perCall(A, OUTPUT.ask.mid, true) +
      (1 - askHitRate) * perCall(A, OUTPUT.ask.mid, false));
console.log(`at 1,000 visitors that premium is ${$(mid1k.usd - noCache1k)} a month.`);

const capUsers = (GUARD_DEFAULTS.dailyUsd * DAYS) / (monthly(1_000, "mid").usd / 1_000);
console.log(
  `the default spend cap ($${GUARD_DEFAULTS.dailyUsd}/day) covers about ${Math.round(capUsers).toLocaleString()} visitors a month at the mid estimate before Claude switches off for the day.`,
);

console.log(`\n## Latency`);
console.log(
  `rules engine, measured on this laptop: describe ${rulesParseMs.toFixed(2)} ms · ask ${rulesAskMs.toFixed(2)} ms per request`,
);
function latency(route: string) {
  if (!existsSync(CACHE_DIR)) return null;
  const ms = readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${CACHE_DIR}/${f}`, "utf8")))
    .filter((r) => r.eval === route && typeof r.latency_ms === "number")
    .map((r) => r.latency_ms as number)
    .sort((x, y) => x - y);
  return ms.length
    ? { p50: ms[Math.floor(ms.length / 2)]!, p95: ms[Math.floor(ms.length * 0.95)]!, n: ms.length }
    : null;
}
for (const [route, name] of [
  ["understand", "describe"],
  ["ask", "ask"],
] as const) {
  const l = latency(route);
  console.log(
    l
      ? `Claude ${name}, measured in the evals from this laptop: p50 ${(l.p50 / 1000).toFixed(1)} s · p95 ${(l.p95 / 1000).toFixed(1)} s (n=${l.n}; the decision rules require p95 ≤ 6 s)`
      : `Claude ${name}: not measured yet.`,
  );
}
