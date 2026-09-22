/**
 * The paid-eval harness, with no Claude: a local stand-in for the Messages API
 * behind the real SDK. Written before evals/harness/llm-harness.ts.
 *
 * What it must guarantee: a paid response is fetched once and replayed free
 * forever after; replay and dry-run never touch the network; a budget stops new
 * paid calls; the cache stores responses and a hash of the request, never the
 * request text (verifier requests carry private source pages).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BudgetExceeded,
  CacheMiss,
  DryRun,
  LlmHarness,
  estimateRun,
  parseHarnessArgs,
  requestKey,
  spentInCache,
} from "./harness/llm-harness";

let server: ReturnType<typeof Bun.serve>;
let hits = 0;
const env = { key: process.env.ANTHROPIC_API_KEY, url: process.env.ANTHROPIC_BASE_URL };
const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "llm-cache-"));
  dirs.push(d);
  return d;
};

const REPLY = {
  month: "March",
  also_months: [],
  targets: ["whale-shark"],
  cert: null,
  current_limit: null,
  format: null,
  dive_type: null,
  where: null,
  concerns: [],
  unsupported: [],
  destinations: [],
};

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch() {
      hits++;
      return Response.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: [{ type: "text", text: JSON.stringify(REPLY) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 3000 },
      });
    },
  });
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${server.port}`;
});
afterAll(() => {
  server.stop(true);
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  if (env.key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = env.key;
  if (env.url === undefined) delete process.env.ANTHROPIC_BASE_URL;
  else process.env.ANTHROPIC_BASE_URL = env.url;
});
beforeEach(() => {
  hits = 0;
});

const TEXT = "Whale sharks in March (private-marker-91c)";

async function parseWith(h: LlmHarness) {
  const { understandWithClaude } = await import("@/lib/llm.server");
  return understandWithClaude(TEXT, { fetch: h.fetch, apiKey: "test-key" });
}

describe("record and replay", () => {
  test("a response is fetched once, then served from the cache", async () => {
    const dir = tmp();
    const h = new LlmHarness({ name: "t", mode: "record", cacheDir: dir });
    const first = await parseWith(h);
    const second = await parseWith(h);
    expect(hits).toBe(1);
    expect(first.trip).toEqual(second.trip);
    expect(first.trip.month).toBe(2);
    expect(h.stats).toMatchObject({ requests: 2, recorded: 1, cacheHits: 1, misses: 0 });
    // Spent only on the recorded call; the cached one is free.
    expect(h.stats.spentUsd).toBeCloseTo((1000 * 5 + 200 * 25 + 3000 * 0.5) / 1e6);
  });

  test("replay never calls the network: a miss is an error, a hit is free", async () => {
    const dir = tmp();
    const recorder = new LlmHarness({ name: "t", mode: "record", cacheDir: dir });
    await parseWith(recorder);
    hits = 0;
    const replay = new LlmHarness({ name: "t", mode: "replay", cacheDir: dir });
    expect((await parseWith(replay)).trip.month).toBe(2);
    const { understandWithClaude } = await import("@/lib/llm.server");
    const miss = understandWithClaude("something never recorded", {
      fetch: replay.fetch,
      apiKey: "x",
    });
    expect(miss).rejects.toThrow();
    await miss.catch(() => {});
    expect(hits).toBe(0);
    expect(replay.stats.misses).toBe(1);
    expect(replay.stats.spentUsd).toBe(0);
  });

  test("the cache holds the response and a request hash, never the request text", async () => {
    const dir = tmp();
    await parseWith(new LlmHarness({ name: "t", mode: "record", cacheDir: dir }));
    const files = readdirSync(dir);
    expect(files).toHaveLength(1);
    const raw = readFileSync(join(dir, files[0]!), "utf8");
    expect(raw).not.toContain("private-marker-91c");
    expect(raw).not.toContain("You turn a scuba diver");
    const rec = JSON.parse(raw);
    expect(rec.key).toBe(files[0]!.replace(/\.json$/, ""));
    expect(rec.response.usage.output_tokens).toBe(200);
    expect(typeof rec.latency_ms).toBe("number");
  });

  test("measured latency survives replay", async () => {
    const dir = tmp();
    const recorder = new LlmHarness({ name: "t", mode: "record", cacheDir: dir });
    await parseWith(recorder);
    expect(recorder.stats.latencyMs).toHaveLength(1);
    const replay = new LlmHarness({ name: "t", mode: "replay", cacheDir: dir });
    await parseWith(replay);
    expect(replay.stats.latencyMs).toEqual(recorder.stats.latencyMs);
  });

  test("the key ignores object key order but not content", () => {
    const a = requestKey("/v1/messages", { model: "m", max_tokens: 1, messages: [{ a: 1, b: 2 }] });
    const b = requestKey("/v1/messages", { messages: [{ b: 2, a: 1 }], max_tokens: 1, model: "m" });
    const c = requestKey("/v1/messages", { model: "m", max_tokens: 2, messages: [{ a: 1, b: 2 }] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("dry run", () => {
  test("captures each request once, sends nothing", async () => {
    const h = new LlmHarness({ name: "t", mode: "dry-run", cacheDir: tmp() });
    await parseWith(h).catch((e) => e);
    await parseWith(h).catch((e) => e);
    expect(hits).toBe(0);
    // An identical request is captured once: on a real run it would be a cache hit.
    expect(h.captured).toHaveLength(1);
    expect(JSON.stringify(h.captured[0]!.body)).toContain("private-marker-91c");
  });

  test("the dry-run sentinel is recognisable through the SDK's wrapping", async () => {
    const h = new LlmHarness({ name: "t", mode: "dry-run", cacheDir: tmp() });
    const err = await parseWith(h).catch((e) => e);
    expect(LlmHarness.isDryRun(err)).toBe(true);
    expect(new DryRun()).toBeInstanceOf(Error);
    expect(new CacheMiss("k")).toBeInstanceOf(Error);
  });

  test("already-cached requests are free even in a dry run", async () => {
    const dir = tmp();
    await parseWith(new LlmHarness({ name: "t", mode: "record", cacheDir: dir }));
    hits = 0;
    const h = new LlmHarness({ name: "t", mode: "dry-run", cacheDir: dir });
    await parseWith(h);
    expect(h.captured).toHaveLength(0);
    expect(h.stats.cacheHits).toBe(1);
    expect(hits).toBe(0);
  });
});

describe("budget", () => {
  test("no new paid call once the run budget can't cover its worst case", async () => {
    // Worst case per call ≈ $0.1225: the first fits in $0.13, the second (after $0.0115 spent) doesn't.
    const h = new LlmHarness({ name: "t", mode: "record", cacheDir: tmp(), maxUsd: 0.13 });
    await parseWith(h);
    expect(hits).toBe(1);
    const { understandWithClaude } = await import("@/lib/llm.server");
    const err = await understandWithClaude("another trip", { fetch: h.fetch, apiKey: "x" }).catch(
      (e) => e,
    );
    expect(LlmHarness.isBudgetExceeded(err)).toBe(true);
    expect(new BudgetExceeded(1)).toBeInstanceOf(Error);
    expect(hits).toBe(1);
  });

  test("the total budget counts everything already spent, across runs", async () => {
    const dir = tmp();
    await parseWith(new LlmHarness({ name: "t", mode: "record", cacheDir: dir }));
    const spent = spentInCache(dir);
    expect(spent).toBeCloseTo((1000 * 5 + 200 * 25 + 3000 * 0.5) / 1e6);
    hits = 0;
    // A new run whose total cap is already used up sends nothing new.
    const h = new LlmHarness({ name: "t", mode: "record", cacheDir: dir, totalUsd: spent });
    const { understandWithClaude } = await import("@/lib/llm.server");
    const err = await understandWithClaude("a new trip", { fetch: h.fetch, apiKey: "x" }).catch(
      (e) => e,
    );
    expect(LlmHarness.isBudgetExceeded(err)).toBe(true);
    expect(hits).toBe(0);
    // Cached responses are still free under an exhausted cap.
    expect((await parseWith(h)).trip.month).toBe(2);
  });

  test("a call is refused if its worst case could cross the total", async () => {
    // One describe call's worst case is about $0.12 (4,000 output tokens at $25/M).
    const h = new LlmHarness({ name: "t", mode: "record", cacheDir: tmp(), totalUsd: 0.05 });
    const err = await parseWith(h).catch((e) => e);
    expect(LlmHarness.isBudgetExceeded(err)).toBe(true);
    expect(hits).toBe(0);
    const ok = new LlmHarness({ name: "t", mode: "record", cacheDir: tmp(), totalUsd: 0.5 });
    await parseWith(ok);
    expect(hits).toBe(1);
  });

  test("concurrent calls reserve their worst case before any is sent", async () => {
    const h = new LlmHarness({ name: "t", mode: "record", cacheDir: tmp(), totalUsd: 0.2 });
    const { understandWithClaude } = await import("@/lib/llm.server");
    const results = await Promise.all(
      ["a", "b", "c"].map((t) =>
        understandWithClaude(`trip ${t}`, { fetch: h.fetch, apiKey: "x" }).then(
          () => "ok",
          (e) => (LlmHarness.isBudgetExceeded(e) ? "refused" : "error"),
        ),
      ),
    );
    // Only one ~$0.12 worst case fits under $0.20 at a time.
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === "refused")).toHaveLength(2);
  });
});

describe("cost estimate", () => {
  const big = "x".repeat(20_000); // ≈ 5.7k tokens at 3.5 chars/token: cacheable
  const body = (system: string, user: string) => ({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });

  test("a shared cached prefix is written once and read after", () => {
    const e = estimateRun([body(big, "a"), body(big, "b"), body(big, "c")], {
      low: 100,
      high: 1000,
    });
    expect(e.requests).toBe(3);
    expect(e.cacheWrites).toBe(1);
    expect(e.cacheReads).toBe(2);
    expect(e.usd.low).toBeLessThan(e.usd.high);
    expect(e.usd.high).toBeLessThan(e.usd.worstCase);
  });

  test("a prefix under Opus 5's 512-token minimum is never cached", () => {
    const e = estimateRun([body("short", "a"), body("short", "b")], { low: 100, high: 1000 });
    expect(e.cacheWrites).toBe(0);
    expect(e.cacheReads).toBe(0);
  });

  test("a breakpoint inside the user turn caches everything up to it", () => {
    const withRecord = (q: string) => ({
      model: "claude-opus-5",
      max_tokens: 4000,
      system: "short system",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: big, cache_control: { type: "ephemeral" } },
            { type: "text", text: q },
          ],
        },
      ],
    });
    const e = estimateRun([withRecord("q1"), withRecord("q2")], { low: 100, high: 1000 });
    expect(e.cacheWrites).toBe(1);
    expect(e.cacheReads).toBe(1);
  });
});

describe("arguments", () => {
  test("defaults: Claude off; with it on, record if a key is set, else replay", () => {
    expect(parseHarnessArgs([], {})).toMatchObject({ llm: false });
    expect(parseHarnessArgs(["llm"], { ANTHROPIC_API_KEY: "k" })).toMatchObject({
      llm: true,
      mode: "record",
      limit: Infinity,
      split: "all",
    });
    expect(parseHarnessArgs(["llm"], {})).toMatchObject({ mode: "replay" });
  });

  test("flags", () => {
    expect(
      parseHarnessArgs(["llm", "--dry-run", "--limit", "5", "--split", "dev", "--max-usd", "2"], {
        ANTHROPIC_API_KEY: "k",
      }),
    ).toMatchObject({ mode: "dry-run", limit: 5, split: "dev", maxUsd: 2 });
    expect(parseHarnessArgs(["llm"], {}).totalUsd).toBe(15);
    expect(parseHarnessArgs(["llm", "--total-usd", "9"], {}).totalUsd).toBe(9);
    expect(parseHarnessArgs(["llm"], { SIGHTLINE_EVAL_TOTAL_USD: "7" }).totalUsd).toBe(7);
    expect(parseHarnessArgs(["llm", "--replay"], { ANTHROPIC_API_KEY: "k" }).mode).toBe("replay");
    expect(parseHarnessArgs(["llm", "--dry-run"], {}).llm).toBe(true);
  });

  test("a bad --limit is refused, not silently ignored", () => {
    expect(() => parseHarnessArgs(["llm", "--limit", "zero"], {})).toThrow();
    expect(() => parseHarnessArgs(["llm", "--split", "train"], {})).toThrow();
  });
});
