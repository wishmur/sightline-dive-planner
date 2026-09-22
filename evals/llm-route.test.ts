/**
 * The request path around a Claude call: key → kill switch → quota → Claude →
 * validate → settle spend → log. Any failure answers from the rules engine.
 * Written before src/lib/llm-route.ts.
 */
import { describe, expect, test } from "bun:test";
import { LlmError, MemoryQuotaStore, type GuardConfig, type QuotaStore } from "@/lib/llm-guard";
import { routeLlm, type LlmEvent, type RouteDeps } from "@/lib/llm-route";

const SECRET = "I get seasick and my partner snorkels (sentinel-7f3a)";
const OPEN: GuardConfig = {
  killSwitch: false,
  routes: ["understand", "ask"],
  sessionPerHour: 100,
  ipPerDay: 100,
  dailyCalls: 100,
  dailyUsd: 100,
};
const USAGE = {
  input_tokens: 1200,
  output_tokens: 300,
  cache_read_input_tokens: 3000,
  cache_creation_input_tokens: 0,
};

type Spy = { store: QuotaStore; settled: number[]; reserved: number };
function spyStore(inner: QuotaStore = new MemoryQuotaStore()): Spy {
  const spy: Spy = {
    settled: [],
    reserved: 0,
    store: {
      reserve: async (r, c) => {
        const out = await inner.reserve(r, c);
        if (!out) spy.reserved++;
        return out;
      },
      settle: async (day, delta) => {
        spy.settled.push(delta);
        await inner.settle(day, delta);
      },
    },
  };
  return spy;
}

function deps(over: Partial<RouteDeps<string>> = {}) {
  const events: LlmEvent[] = [];
  const spy = spyStore();
  let claudeCalls = 0;
  const d: RouteDeps<string> = {
    route: "understand",
    hasKey: true,
    config: OPEN,
    store: spy.store,
    identity: { session: "11111111-1111-4111-8111-111111111111", ip: "hash" },
    now: () => new Date("2026-09-21T10:00:00Z"),
    promptVersion: "test.v1",
    inputChars: SECRET.length,
    estimateUsd: 0.12,
    rules: () => `rules:${SECRET}`,
    claude: async () => {
      claudeCalls++;
      return { value: `claude:${SECRET}`, usage: USAGE, model: "claude-opus-5" };
    },
    log: async (e) => {
      events.push(e);
    },
    ...over,
  };
  return { d, events, spy, claudeCalls: () => claudeCalls };
}

describe("routeLlm", () => {
  test("no key: rules, no fallback reason shown, Claude never called", async () => {
    const t = deps({ hasKey: false });
    const out = await routeLlm(t.d);
    expect(out).toEqual({ value: `rules:${SECRET}`, engine: "rules" });
    expect(t.claudeCalls()).toBe(0);
    expect(t.events[0]).toMatchObject({ engine: "rules", attempted: false, reason: "no_key" });
  });

  test("a route not switched on: rules, Claude and store untouched", async () => {
    const t = deps({ config: { ...OPEN, routes: ["ask"] } });
    const out = await routeLlm(t.d);
    expect(out).toEqual({ value: `rules:${SECRET}`, engine: "rules" });
    expect(t.claudeCalls()).toBe(0);
    expect(t.spy.reserved).toBe(0);
    expect(t.events[0]).toMatchObject({ attempted: false, reason: "route_off" });
  });

  test("kill switch: rules, store untouched", async () => {
    const t = deps({ config: { ...OPEN, killSwitch: true } });
    const out = await routeLlm(t.d);
    expect(out).toMatchObject({ engine: "rules", fallback: "kill_switch" });
    expect(t.claudeCalls()).toBe(0);
    expect(t.spy.reserved).toBe(0);
  });

  test("quota denial: rules with the reason", async () => {
    const t = deps({ config: { ...OPEN, dailyUsd: 0 } });
    const out = await routeLlm(t.d);
    expect(out).toMatchObject({ engine: "rules", fallback: "daily_spend" });
    expect(t.claudeCalls()).toBe(0);
    expect(t.events[0]).toMatchObject({ attempted: false, reason: "daily_spend" });
  });

  test("success: Claude's value, reservation settled to the real cost", async () => {
    const t = deps();
    const out = await routeLlm(t.d);
    expect(out).toEqual({ value: `claude:${SECRET}`, engine: "claude" });
    expect(t.spy.reserved).toBe(1);
    const actual = (1200 * 5 + 300 * 25 + 3000 * 0.5) / 1_000_000;
    expect(t.spy.settled).toHaveLength(1);
    expect(t.spy.settled[0]!).toBeCloseTo(actual - 0.12);
    expect(t.events[0]).toMatchObject({
      route: "understand",
      engine: "claude",
      attempted: true,
      reason: null,
      model: "claude-opus-5",
      prompt_version: "test.v1",
      input_tokens: 1200,
      output_tokens: 300,
      cache_read_tokens: 3000,
      cache_write_tokens: 0,
    });
    expect(t.events[0]!.usd).toBeCloseTo(actual);
    expect(t.events[0]!.latency_ms).toBeGreaterThanOrEqual(0);
  });

  test("refusal: rules, and the refused call's real cost is what's kept", async () => {
    const t = deps({
      claude: async () => {
        throw new LlmError("refusal", { input_tokens: 0, output_tokens: 0 }, "claude-opus-5");
      },
    });
    const out = await routeLlm(t.d);
    expect(out).toMatchObject({ engine: "rules", fallback: "refusal" });
    expect(t.spy.settled[0]!).toBeCloseTo(-0.12);
    expect(t.events[0]).toMatchObject({ engine: "rules", attempted: true, reason: "refusal" });
  });

  test("invalid output with no usage: rules, reservation kept (it was probably billed)", async () => {
    const t = deps({
      claude: async () => {
        throw new LlmError("invalid_output");
      },
    });
    expect(await routeLlm(t.d)).toMatchObject({ engine: "rules", fallback: "invalid_output" });
    expect(t.spy.settled).toEqual([]);
  });

  test("an unexpected error: rules, api_error", async () => {
    const t = deps({
      claude: async () => {
        throw new TypeError("boom");
      },
    });
    expect(await routeLlm(t.d)).toMatchObject({ engine: "rules", fallback: "api_error" });
  });

  test("a store outage fails closed to rules", async () => {
    const broken: QuotaStore = {
      reserve: async () => {
        throw new Error("supabase down");
      },
      settle: async () => {},
    };
    const t = deps({ store: broken });
    expect(await routeLlm(t.d)).toMatchObject({ engine: "rules", fallback: "guard_unavailable" });
    expect(t.claudeCalls()).toBe(0);
  });

  test("logging failures never break the answer", async () => {
    const t = deps({
      log: async () => {
        throw new Error("events insert failed");
      },
    });
    expect(await routeLlm(t.d)).toMatchObject({ engine: "claude" });
  });

  test("a failing settle never breaks the answer", async () => {
    const inner = new MemoryQuotaStore();
    const t = deps({
      store: {
        reserve: (r, c) => inner.reserve(r, c),
        settle: async () => {
          throw new Error("settle failed");
        },
      },
    });
    expect(await routeLlm(t.d)).toMatchObject({ engine: "claude" });
  });

  test("the logged event never contains the diver's text, on any path", async () => {
    const paths: Partial<RouteDeps<string>>[] = [
      {},
      { hasKey: false },
      { config: { ...OPEN, killSwitch: true } },
      {
        claude: async () => {
          throw new LlmError("refusal", USAGE, "claude-opus-5");
        },
      },
      {
        claude: async () => {
          throw new Error(`upstream echoed: ${SECRET}`);
        },
      },
    ];
    for (const p of paths) {
      const t = deps(p);
      await routeLlm(t.d);
      const json = JSON.stringify(t.events);
      expect(json).not.toContain("sentinel-7f3a");
      expect(json).not.toContain("seasick");
      expect(t.events[0]!.chars).toBe(SECRET.length);
    }
  });

  test("the event has a fixed set of keys", async () => {
    const t = deps();
    await routeLlm(t.d);
    expect(Object.keys(t.events[0]!).sort()).toEqual(
      [
        "attempted",
        "cache_read_tokens",
        "cache_write_tokens",
        "chars",
        "counts",
        "engine",
        "input_tokens",
        "latency_ms",
        "model",
        "output_tokens",
        "prompt_version",
        "reason",
        "route",
        "total_ms",
        "usd",
      ].sort(),
    );
  });
});
