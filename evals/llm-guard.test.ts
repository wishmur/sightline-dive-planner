/**
 * Spend and abuse guard for the two public Claude-backed server functions.
 * Written before src/lib/llm-guard.ts and the llm_quota migration.
 *
 * The same quota contract runs against the in-memory store (tests, local dev)
 * and against the real migration in embedded Postgres (PGlite), so the SQL
 * function that production will call is exercised here without touching
 * Supabase.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  GUARD_DEFAULTS,
  MemoryQuotaStore,
  RpcQuotaStore,
  checkGuard,
  costUsd,
  readGuardConfig,
  reservationFor,
  worstCaseUsd,
  type GuardConfig,
  type QuotaStore,
} from "@/lib/llm-guard";

const LIMITS: GuardConfig = {
  killSwitch: false,
  sessionPerHour: 3,
  ipPerDay: 5,
  dailyCalls: 8,
  dailyUsd: 1,
};
const at = (iso: string) => new Date(iso);
const r = (session: string, ip: string, iso = "2026-09-21T10:15:00Z", usd = 0.1) =>
  reservationFor({ session, ip }, at(iso), usd);

describe("config", () => {
  test("defaults when nothing is set", () => {
    expect(readGuardConfig({})).toEqual(GUARD_DEFAULTS);
    expect(GUARD_DEFAULTS.killSwitch).toBe(false);
  });

  test("overrides are read and bad values fall back to the default", () => {
    const c = readGuardConfig({
      SIGHTLINE_LLM_SESSION_PER_HOUR: "7",
      SIGHTLINE_LLM_IP_PER_DAY: "not a number",
      SIGHTLINE_LLM_DAILY_CALLS: "-4",
      SIGHTLINE_LLM_DAILY_USD: "2.5",
    });
    expect(c.sessionPerHour).toBe(7);
    expect(c.ipPerDay).toBe(GUARD_DEFAULTS.ipPerDay);
    expect(c.dailyCalls).toBe(GUARD_DEFAULTS.dailyCalls);
    expect(c.dailyUsd).toBe(2.5);
  });

  test("zero is a valid limit: it switches that path off", () => {
    expect(readGuardConfig({ SIGHTLINE_LLM_DAILY_USD: "0" }).dailyUsd).toBe(0);
  });

  test("kill switch accepts the usual truthy spellings only", () => {
    for (const v of ["1", "true", "on", "yes", "TRUE", " On "])
      expect(readGuardConfig({ SIGHTLINE_LLM_KILL_SWITCH: v }).killSwitch).toBe(true);
    for (const v of ["", "0", "false", "off", "no", "maybe"])
      expect(readGuardConfig({ SIGHTLINE_LLM_KILL_SWITCH: v }).killSwitch).toBe(false);
  });
});

describe("cost", () => {
  test("list prices per million tokens", () => {
    expect(costUsd({ input_tokens: 1_000_000, output_tokens: 0 }, "claude-opus-5")).toBeCloseTo(5);
    expect(costUsd({ input_tokens: 0, output_tokens: 1_000_000 }, "claude-opus-5")).toBeCloseTo(25);
    expect(
      costUsd(
        {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 1_000_000,
          cache_read_input_tokens: 1_000_000,
        },
        "claude-opus-5",
      ),
    ).toBeCloseTo(6.25 + 0.5);
  });

  test("an unknown model is priced at the most expensive known rate, never zero", () => {
    const u = { input_tokens: 1000, output_tokens: 1000 };
    expect(costUsd(u, "some-future-model")).toBeGreaterThanOrEqual(costUsd(u, "claude-opus-5"));
  });

  test("worst case assumes every output token is used and no cache hit", () => {
    expect(worstCaseUsd(2000, 4000, "claude-opus-5")).toBeCloseTo(
      (2000 * 5 + 4000 * 25) / 1_000_000,
    );
  });
});

describe("reservation keys", () => {
  test("UTC day and hour", () => {
    const x = reservationFor({ session: "s", ip: "i" }, at("2026-09-21T23:59:59-02:00"), 0.1);
    expect(x.day).toBe("2026-09-22");
    expect(x.hour).toBe("2026-09-22T01");
  });
});

describe("checkGuard", () => {
  const exploding: QuotaStore = {
    reserve: async () => {
      throw new Error("store must not be called");
    },
    settle: async () => {
      throw new Error("store must not be called");
    },
  };

  test("the kill switch denies before the store is consulted", async () => {
    expect(await checkGuard(exploding, { ...LIMITS, killSwitch: true }, r("s", "i"))).toBe(
      "kill_switch",
    );
  });

  test("a failing store fails closed", async () => {
    expect(await checkGuard(exploding, LIMITS, r("s", "i"))).toBe("guard_unavailable");
  });
});

// ---------------------------------------------------------------------------
// One contract, two stores.

function quotaContract(name: string, make: () => Promise<QuotaStore>) {
  describe(`quota store contract: ${name}`, () => {
    test("allows, then limits a session per hour", async () => {
      const s = await make();
      for (let i = 0; i < 3; i++) expect(await s.reserve(r("a", `ip${i}`), LIMITS)).toBeNull();
      expect(await s.reserve(r("a", "ip9"), LIMITS)).toBe("session_limit");
      expect(await s.reserve(r("b", "ip9"), LIMITS)).toBeNull();
      expect(await s.reserve(r("a", "ip9", "2026-09-21T11:00:00Z"), LIMITS)).toBeNull();
    });

    test("limits an address per day across sessions", async () => {
      const s = await make();
      for (let i = 0; i < 5; i++) expect(await s.reserve(r(`s${i}`, "same"), LIMITS)).toBeNull();
      expect(await s.reserve(r("s9", "same"), LIMITS)).toBe("ip_limit");
      expect(await s.reserve(r("s9", "same", "2026-09-22T00:00:00Z"), LIMITS)).toBeNull();
    });

    test("caps calls per day for everyone", async () => {
      const s = await make();
      for (let i = 0; i < 8; i++) expect(await s.reserve(r(`s${i}`, `ip${i}`), LIMITS)).toBeNull();
      expect(await s.reserve(r("new", "new"), LIMITS)).toBe("daily_calls");
    });

    test("caps spend per day, and settling frees what wasn't spent", async () => {
      const s = await make();
      const big = (sess: string) => r(sess, sess, "2026-09-21T10:00:00Z", 0.4);
      expect(await s.reserve(big("x"), LIMITS)).toBeNull();
      expect(await s.reserve(big("y"), LIMITS)).toBeNull();
      expect(await s.reserve(big("z"), LIMITS)).toBe("daily_spend");
      await s.settle("2026-09-21", -0.35);
      expect(await s.reserve(big("z"), LIMITS)).toBeNull();
    });

    test("a denied call consumes nothing", async () => {
      const s = await make();
      const one: GuardConfig = { ...LIMITS, sessionPerHour: 1, dailyCalls: 2 };
      expect(await s.reserve(r("a", "1"), one)).toBeNull();
      for (let i = 0; i < 5; i++) expect(await s.reserve(r("a", "2"), one)).toBe("session_limit");
      expect(await s.reserve(r("b", "3"), one)).toBeNull();
    });

    test("spend never goes below zero", async () => {
      const s = await make();
      expect(await s.reserve(r("a", "a", "2026-09-21T10:00:00Z", 0.5), LIMITS)).toBeNull();
      await s.settle("2026-09-21", -10);
      const tight = { ...LIMITS, dailyUsd: 0.5 };
      expect(await s.reserve(r("b", "b", "2026-09-21T10:00:00Z", 0.5), tight)).toBeNull();
      expect(await s.reserve(r("c", "c", "2026-09-21T10:00:00Z", 0.01), tight)).toBe("daily_spend");
    });

    test("a zero spend cap turns the path off", async () => {
      const s = await make();
      expect(await s.reserve(r("a", "a"), { ...LIMITS, dailyUsd: 0 })).toBe("daily_spend");
    });
  });
}

quotaContract("memory", async () => new MemoryQuotaStore());

// Embedded Postgres with every migration applied, in order.
let pg: PGlite;
const MIGRATION = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .find((f) => readFileSync(`supabase/migrations/${f}`, "utf8").includes("llm_reserve"));

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec("create role anon; create role authenticated; create role service_role;");
  for (const f of readdirSync("supabase/migrations").sort())
    await pg.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
});
afterAll(async () => {
  await pg?.close();
});

/** What supabase-js `.rpc(fn, args)` does, in SQL: named-argument call. */
async function pgRpc(fn: string, args: Record<string, unknown>) {
  const keys = Object.keys(args);
  const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as out`;
  const res = await pg.query<{ out: unknown }>(sql, Object.values(args));
  return { data: res.rows[0]?.out ?? null, error: null };
}

quotaContract("postgres migration (PGlite)", async () => {
  await pg.exec("delete from public.llm_quota");
  return new RpcQuotaStore(pgRpc);
});

describe("postgres migration: who may call it", () => {
  test("the migration exists", () => {
    expect(MIGRATION).toBeDefined();
  });

  test("browsers (anon, authenticated) cannot reserve, settle or read counters", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const sql of [
        "select public.llm_reserve(current_date, 'h', 's', 'i', 0.1, 1, 1, 1, 1)",
        "select public.llm_settle(current_date, -1)",
        "select * from public.llm_quota",
      ]) {
        await pg.exec(`set role ${role}`);
        let denied = false;
        try {
          await pg.query(sql);
        } catch (e) {
          denied = /permission denied/i.test(String(e));
        } finally {
          await pg.exec("reset role");
        }
        expect({ role, sql, denied }).toEqual({ role, sql, denied: true });
      }
    }
  });

  test("the server role can", async () => {
    await pg.exec("set role service_role");
    try {
      const res = await pg.query<{ out: string }>(
        "select public.llm_reserve(current_date, 'h', 'svc', 'svc', 0.01, 5, 5, 1000, 100) as out",
      );
      expect(res.rows[0]!.out).toBe("ok");
    } finally {
      await pg.exec("reset role");
    }
  });
});
