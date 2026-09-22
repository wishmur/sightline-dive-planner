/**
 * Harness for the paid Claude evals (understand, ask, verifier).
 *
 * It sits under the Anthropic SDK as its `fetch`, so the product code runs
 * unchanged:
 * - record: a request not seen before goes to the API once; the response is
 *   stored in evals/cache/llm/<hash>.json and replayed free on every later run.
 * - replay: never touches the network. Misses fail that case, visibly.
 * - dry-run: never touches the network. Captures the exact requests so the
 *   runner can print them and estimate tokens and cost.
 * Two budgets stop new paid calls: --max-usd for this run, and --total-usd
 * (default $15, the owner's cap) for everything ever spent, counted from the
 * cache. Each call reserves its worst case before it is sent, so neither can
 * be crossed, even by concurrent calls.
 *
 * The cache stores the response and a hash of the request, never the request:
 * verifier requests carry whole source pages, which stay private.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { costUsd, PRICES_PER_MTOK, type Usage } from "@/lib/llm-guard";

export type HarnessMode = "record" | "replay" | "dry-run";
export type Split = "dev" | "test" | "all";

export const CACHE_DIR = "evals/cache/llm";
/**
 * Responses that may quote publishers' pages at length (the verifier's) stay
 * out of git, next to the private source snapshots. They still count toward
 * the total budget.
 */
export const PRIVATE_CACHE_DIR = "data/.llm-cache";
export const ALL_CACHE_DIRS = [CACHE_DIR, PRIVATE_CACHE_DIR];
export const REPORT_DIR = "evals/reports";
/** Characters per token for estimates only. Real counts come from `usage` in the report. */
export const CHARS_PER_TOKEN = 3.5;
/** Claude Opus 5 caches prefixes from 512 tokens; shorter ones silently don't cache. */
export const MIN_CACHEABLE_TOKENS = 512;

export class DryRun extends Error {
  constructor() {
    super("dry run: request captured, not sent");
    this.name = "DryRun";
  }
}
export class CacheMiss extends Error {
  constructor(readonly key: string) {
    super(`not in the eval cache (${key}); run with an API key to record it`);
    this.name = "CacheMiss";
  }
}
export class BudgetExceeded extends Error {
  constructor(readonly maxUsd: number) {
    super(`eval budget of $${maxUsd} reached; no further paid calls this run`);
    this.name = "BudgetExceeded";
  }
}

// ---------------------------------------------------------------------------
// Keys

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, canonical((value as Record<string, unknown>)[k])]),
    );
  return value;
}

export function requestKey(path: string, body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical({ path, body })))
    .digest("hex")
    .slice(0, 24);
}

/** Everything already paid for: the cost of every cached response, across cache folders. */
export function spentInCache(dirs: string | string[] = ALL_CACHE_DIRS): number {
  let usd = 0;
  for (const dir of typeof dirs === "string" ? [dirs] : dirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const rec = JSON.parse(readFileSync(join(dir, f), "utf8"));
      if (rec.response?.usage) usd += costUsd(rec.response.usage, rec.response.model);
    }
  }
  return usd;
}

/** Upper bound for one request: input estimated with a 50% margin, every output token used. */
function worstCase(body: Record<string, unknown>): number {
  const p = PRICES_PER_MTOK[String(body.model)] ?? PRICES_PER_MTOK["claude-opus-5"]!;
  const input = tokenSplit(body).total * 1.5;
  return (input * p.input + Number(body.max_tokens ?? 0) * p.output) / 1e6;
}

// ---------------------------------------------------------------------------

export type Captured = { key: string; path: string; body: Record<string, unknown> };
export type HarnessStats = {
  requests: number;
  cacheHits: number;
  recorded: number;
  misses: number;
  /** Spent by this run: recorded calls only. */
  spentUsd: number;
  /** What every response used, cached or not: the cost of the run if nothing had been cached. */
  representedUsd: number;
  usage: Required<Usage>;
  /** Wall-clock time of each response when it was recorded (replays keep the original). */
  latencyMs: number[];
};

/**
 * Harness failures reach the caller as non-retryable HTTP errors (the SDK would
 * retry a thrown fetch error), tagged so the runner can tell them apart.
 */
const TAG = "sightline-harness";
function harnessError(kind: "dry_run" | "cache_miss" | "budget_exceeded", message: string) {
  return new Response(
    JSON.stringify({ type: "error", error: { type: TAG, message: `${TAG}:${kind} ${message}` } }),
    { status: 400, headers: { "content-type": "application/json" } },
  );
}
function isHarnessError(err: unknown, kind: string): boolean {
  for (let e = err; e; e = (e as { cause?: unknown }).cause) {
    if (e instanceof Error && e.message.includes(`${TAG}:${kind}`)) return true;
  }
  return false;
}

export class LlmHarness {
  readonly captured: Captured[] = [];
  readonly stats: HarnessStats = {
    requests: 0,
    cacheHits: 0,
    recorded: 0,
    misses: 0,
    spentUsd: 0,
    representedUsd: 0,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    latencyMs: [],
  };

  /** Spent before this run started (only counted when a total budget is set). */
  readonly priorUsd: number;
  private inFlightUsd = 0;

  constructor(
    readonly opts: {
      name: string;
      mode: HarnessMode;
      cacheDir?: string;
      maxUsd?: number;
      totalUsd?: number;
      /** Folders whose spend counts toward totalUsd. Default: this cache, or all standard ones. */
      ledger?: string[];
    },
  ) {
    const ledger = opts.ledger ?? (opts.cacheDir ? [opts.cacheDir] : ALL_CACHE_DIRS);
    this.priorUsd = opts.totalUsd === undefined ? 0 : spentInCache(ledger);
  }

  static isDryRun = (err: unknown) => isHarnessError(err, "dry_run");
  static isCacheMiss = (err: unknown) => isHarnessError(err, "cache_miss");
  static isBudgetExceeded = (err: unknown) => isHarnessError(err, "budget_exceeded");

  private get dir() {
    return this.opts.cacheDir ?? CACHE_DIR;
  }

  private account(usage: Usage, model: string, paid: boolean) {
    const usd = costUsd(usage, model);
    this.stats.representedUsd += usd;
    if (paid) this.stats.spentUsd += usd;
    const u = this.stats.usage;
    u.input_tokens += usage.input_tokens;
    u.output_tokens += usage.output_tokens;
    u.cache_creation_input_tokens += usage.cache_creation_input_tokens ?? 0;
    u.cache_read_input_tokens += usage.cache_read_input_tokens ?? 0;
  }

  readonly fetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const text =
      typeof init?.body === "string" ? init.body : await new Request(input, init).clone().text();
    const path = new URL(url).pathname;
    const body = JSON.parse(text) as Record<string, unknown>;
    const key = requestKey(path, body);
    const file = join(this.dir, `${key}.json`);
    this.stats.requests++;

    if (existsSync(file)) {
      const rec = JSON.parse(readFileSync(file, "utf8"));
      this.stats.cacheHits++;
      this.account(rec.response.usage, rec.response.model, false);
      if (typeof rec.latency_ms === "number") this.stats.latencyMs.push(rec.latency_ms);
      return new Response(JSON.stringify(rec.response), {
        status: 200,
        headers: { "content-type": "application/json", "request-id": rec.request_id ?? "cached" },
      });
    }

    if (this.opts.mode === "dry-run") {
      // An identical request later in the run would be a cache hit on a real run.
      if (this.captured.some((c) => c.key === key)) this.stats.cacheHits++;
      else this.captured.push({ key, path, body });
      return harnessError("dry_run", key);
    }
    if (this.opts.mode === "replay") {
      this.stats.misses++;
      return harnessError("cache_miss", new CacheMiss(key).message);
    }
    // Reserve the worst case before sending (synchronously, so concurrent calls
    // see each other's reservations), and refuse if either budget could be crossed.
    const reserve = worstCase(body);
    const committed = this.stats.spentUsd + this.inFlightUsd + reserve;
    if (this.opts.maxUsd !== undefined && committed > this.opts.maxUsd) {
      return harnessError("budget_exceeded", new BudgetExceeded(this.opts.maxUsd).message);
    }
    if (this.opts.totalUsd !== undefined && this.priorUsd + committed > this.opts.totalUsd) {
      return harnessError("budget_exceeded", new BudgetExceeded(this.opts.totalUsd).message);
    }
    this.inFlightUsd += reserve;

    const started = performance.now();
    let res: Response;
    try {
      res = await globalThis.fetch(input, init);
    } finally {
      this.inFlightUsd -= reserve;
    }
    if (res.ok) {
      const response = await res.clone().json();
      const latency = Math.round(performance.now() - started);
      this.stats.latencyMs.push(latency);
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(
        file,
        JSON.stringify(
          {
            key,
            eval: this.opts.name,
            recorded_at: new Date().toISOString(),
            request_id: res.headers.get("request-id"),
            latency_ms: latency,
            response,
          },
          null,
          2,
        ) + "\n",
      );
      this.stats.recorded++;
      this.account(response.usage, response.model, true);
    }
    return res;
  }) as typeof fetch;

  /** Exact requests of a dry run, for inspection. Gitignored: verifier requests hold private pages. */
  dumpCaptured(dir = join(REPORT_DIR, "dry-run")) {
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${this.opts.name}.jsonl`);
    writeFileSync(file, this.captured.map((c) => JSON.stringify(c.body)).join("\n") + "\n");
    return file;
  }

  /** A dev- or test-only run gets its own file, so it never replaces a full run's report. */
  writeReport(
    payload: Record<string, unknown>,
    suffix = payload.split && payload.split !== "all"
      ? `${this.opts.mode}.${String(payload.split)}`
      : this.opts.mode,
  ) {
    mkdirSync(REPORT_DIR, { recursive: true });
    const file = join(REPORT_DIR, `${this.opts.name}.${suffix}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          eval: this.opts.name,
          mode: this.opts.mode,
          generated_at: new Date().toISOString(),
          harness: this.stats,
          ...payload,
        },
        null,
        2,
      ) + "\n",
    );
    return file;
  }
}

// ---------------------------------------------------------------------------
// Cost estimate for a dry run

type Block = { type?: string; text?: string; cache_control?: unknown };
type Segment = { text: string; breakpoint: boolean };

function segments(body: Record<string, unknown>): Segment[] {
  const out: Segment[] = [];
  const push = (content: unknown) => {
    if (typeof content === "string") out.push({ text: content, breakpoint: false });
    else if (Array.isArray(content))
      for (const b of content as Block[])
        out.push({ text: b.text ?? JSON.stringify(b), breakpoint: Boolean(b.cache_control) });
  };
  // Render order: tools → system → messages. The output schema travels with the request.
  if (body.tools) out.push({ text: JSON.stringify(body.tools), breakpoint: false });
  push(body.system);
  for (const m of (body.messages as { content: unknown }[] | undefined) ?? []) push(m.content);
  const format = (body.output_config as { format?: unknown } | undefined)?.format;
  if (format) out.push({ text: JSON.stringify(format), breakpoint: false });
  return out;
}

/** Estimated input tokens of one request, and how many sit before its last cache breakpoint. */
export function tokenSplit(body: Record<string, unknown>) {
  const segs = segments(body);
  const tokens = (s: string) => s.length / CHARS_PER_TOKEN;
  const total = segs.reduce((n, s) => n + tokens(s.text), 0);
  const last = segs.map((s) => s.breakpoint).lastIndexOf(true);
  const prefix = last >= 0 ? segs.slice(0, last + 1).reduce((n, s) => n + tokens(s.text), 0) : 0;
  return { total, prefix, cacheable: prefix >= MIN_CACHEABLE_TOKENS };
}

export type RunEstimate = {
  requests: number;
  inputTokens: number;
  cachedPrefixTokens: number;
  cacheWrites: number;
  cacheReads: number;
  outputAssumed: { low: number; high: number };
  usd: { low: number; high: number; worstCase: number };
};

/**
 * Tokens ≈ characters ÷ 3.5. Output tokens are an assumption until a real run
 * measures them. Worst case: no cache hits and every allowed output token used.
 */
export function estimateRun(
  bodies: Record<string, unknown>[],
  outputPerRequest: { low: number; high: number },
): RunEstimate {
  const seen = new Set<string>();
  const e: RunEstimate = {
    requests: bodies.length,
    inputTokens: 0,
    cachedPrefixTokens: 0,
    cacheWrites: 0,
    cacheReads: 0,
    outputAssumed: outputPerRequest,
    usd: { low: 0, high: 0, worstCase: 0 },
  };
  for (const body of bodies) {
    const model = String(body.model);
    const p = PRICES_PER_MTOK[model] ?? PRICES_PER_MTOK["claude-opus-5"]!;
    const segs = segments(body);
    const tokens = (s: string) => s.length / CHARS_PER_TOKEN;
    const total = segs.reduce((n, s) => n + tokens(s.text), 0);
    const last = segs.map((s) => s.breakpoint).lastIndexOf(true);
    const prefix = last >= 0 ? segs.slice(0, last + 1) : [];
    const prefixTokens = prefix.reduce((n, s) => n + tokens(s.text), 0);
    let input = total * p.input;
    if (prefixTokens >= MIN_CACHEABLE_TOKENS) {
      const k = createHash("sha256")
        .update(model + prefix.map((s) => s.text).join(" "))
        .digest("hex");
      const rest = (total - prefixTokens) * p.input;
      if (seen.has(k)) {
        e.cacheReads++;
        input = rest + prefixTokens * p.cacheRead;
      } else {
        seen.add(k);
        e.cacheWrites++;
        input = rest + prefixTokens * p.cacheWrite;
      }
      e.cachedPrefixTokens += prefixTokens;
    }
    const maxTokens = Number(body.max_tokens ?? 0);
    e.inputTokens += total;
    e.usd.low += (input + outputPerRequest.low * p.output) / 1e6;
    e.usd.high += (input + outputPerRequest.high * p.output) / 1e6;
    e.usd.worstCase += (total * p.input + maxTokens * p.output) / 1e6;
  }
  e.inputTokens = Math.round(e.inputTokens);
  e.cachedPrefixTokens = Math.round(e.cachedPrefixTokens);
  return e;
}

// ---------------------------------------------------------------------------
// Command line

export type HarnessArgs = {
  llm: boolean;
  mode: HarnessMode;
  limit: number;
  split: Split;
  maxUsd: number;
  totalUsd: number;
  showPrompts: boolean;
  errors: boolean;
};

export const DEFAULT_MAX_USD = 5;
/** The owner's cap on all paid eval spend, set 2026-09-22. */
export const DEFAULT_TOTAL_USD = 15;

export function parseHarnessArgs(
  argv: string[],
  env: Record<string, string | undefined>,
): HarnessArgs {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const limitRaw = value("--limit");
  const limit = limitRaw === undefined ? Infinity : Number(limitRaw);
  if (!(limit === Infinity || (Number.isInteger(limit) && limit > 0)))
    throw new Error(`--limit needs a positive whole number, got "${limitRaw}"`);
  const split = (value("--split") ?? "all") as Split;
  if (!["dev", "test", "all"].includes(split))
    throw new Error(`--split must be dev, test or all, got "${split}"`);
  const maxRaw = value("--max-usd");
  const maxUsd = maxRaw === undefined ? DEFAULT_MAX_USD : Number(maxRaw);
  if (!Number.isFinite(maxUsd) || maxUsd < 0)
    throw new Error(`--max-usd needs a number, got "${maxRaw}"`);
  const totalRaw = value("--total-usd") ?? env.SIGHTLINE_EVAL_TOTAL_USD;
  const totalUsd = totalRaw === undefined ? DEFAULT_TOTAL_USD : Number(totalRaw);
  if (!Number.isFinite(totalUsd) || totalUsd < 0)
    throw new Error(`--total-usd needs a number, got "${totalRaw}"`);
  const dry = argv.includes("--dry-run");
  const hasKey = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  return {
    llm: argv.includes("llm") || dry,
    mode: dry ? "dry-run" : argv.includes("--replay") || !hasKey ? "replay" : "record",
    limit,
    split,
    maxUsd,
    totalUsd,
    showPrompts: argv.includes("--show-prompts"),
    errors: argv.includes("--errors"),
  };
}

export const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;

/** Prints a dry run: the exact prompts, token and cost estimates, the assumptions. */
export function printDryRun(
  h: LlmHarness,
  output: { low: number; high: number },
  showPrompts: boolean,
  opts: { privatePrompts?: boolean } = {},
) {
  const bodies = h.captured.map((c) => c.body);
  const e = estimateRun(bodies, output);
  console.log(`\n--- ${h.opts.name}: dry run (nothing sent) ---`);
  console.log(
    `requests: ${e.requests} to send · ${h.stats.cacheHits} already cached (free on a real run)`,
  );
  if (!bodies.length) return e;
  const first = bodies[0]!;
  const system =
    typeof first.system === "string"
      ? first.system
      : ((first.system as Block[] | undefined) ?? []).map((b) => b.text).join("\n");
  const user = (b: Record<string, unknown>) => {
    const c = (b.messages as { content: unknown }[])[0]!.content;
    return typeof c === "string" ? c : (c as Block[]).map((x) => x.text).join("\n");
  };
  console.log(
    `model ${String(first.model)} · effort ${String((first.output_config as { effort?: string })?.effort ?? "default (high)")} · max_tokens ${String(first.max_tokens)}`,
  );
  if (!opts.privatePrompts || showPrompts) {
    console.log(`\nsystem prompt (exact, ${system.length} chars):\n${indent(system)}`);
    const shown = showPrompts ? bodies : bodies.slice(0, 1);
    for (const b of shown) console.log(`\nuser turn (exact):\n${indent(user(b))}`);
    if (!showPrompts && bodies.length > 1)
      console.log(`\n(${bodies.length - 1} more; --show-prompts prints them all)`);
  } else {
    console.log("(prompts hold private source pages: pass --show-prompts to print them)");
  }
  console.log(`\nexact requests written to ${h.dumpCaptured()} (gitignored)`);
  console.log(
    `input ≈ ${e.inputTokens.toLocaleString()} tokens (chars ÷ ${CHARS_PER_TOKEN}; an estimate) · cache: ${e.cacheWrites} writes, ${e.cacheReads} reads`,
  );
  console.log(
    `output assumed ${output.low}–${output.high} tokens a request, thinking included (unmeasured)`,
  );
  console.log(
    `estimated cost ${usd(e.usd.low)}–${usd(e.usd.high)} · worst case ${usd(e.usd.worstCase)} (no cache, every max_token used)`,
  );
  return e;
}

const indent = (s: string) =>
  s
    .split("\n")
    .map((l) => `  │ ${l}`)
    .join("\n");
