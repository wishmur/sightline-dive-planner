/**
 * Spend and abuse guard for the Claude-backed server functions.
 *
 * Every Claude call first reserves its worst-case cost against three counters:
 * calls per session per hour, calls per address per day (a keyed hash, never the
 * address itself), and calls plus dollars per day for the whole site. After the
 * call the reservation is settled to what it really cost. Any denial, and any
 * failure of the guard itself, sends the request to the deterministic rules,
 * which answer every request anyway. A kill switch turns Claude off without a
 * deploy.
 *
 * Pure module: no server imports, so the same logic is tested in evals/ and
 * used in production (src/lib/llm-runtime.server.ts wires in Supabase).
 */

export type GuardDenial =
  | "kill_switch"
  | "session_limit"
  | "ip_limit"
  | "daily_calls"
  | "daily_spend"
  | "guard_unavailable";
export type ClaudeFailure = "refusal" | "invalid_output" | "timeout" | "api_error";
export type FallbackReason = GuardDenial | ClaudeFailure;

export type LlmRouteId = "understand" | "ask";
export const LLM_ROUTES: LlmRouteId[] = ["understand", "ask"];

export type GuardConfig = {
  killSwitch: boolean;
  /** Routes Claude may answer. Opt-in: a route goes on only after it passes its eval. */
  routes: LlmRouteId[];
  sessionPerHour: number;
  ipPerDay: number;
  dailyCalls: number;
  dailyUsd: number;
};

/**
 * A diver describing one trip and asking a handful of questions makes well under
 * 20 calls an hour. The daily dollar cap is the real backstop.
 */
export const GUARD_DEFAULTS: GuardConfig = {
  killSwitch: false,
  routes: [],
  sessionPerHour: 20,
  ipPerDay: 60,
  dailyCalls: 500,
  dailyUsd: 5,
};

export const GUARD_ENV = {
  killSwitch: "SIGHTLINE_LLM_KILL_SWITCH",
  routes: "SIGHTLINE_LLM_ROUTES",
  sessionPerHour: "SIGHTLINE_LLM_SESSION_PER_HOUR",
  ipPerDay: "SIGHTLINE_LLM_IP_PER_DAY",
  dailyCalls: "SIGHTLINE_LLM_DAILY_CALLS",
  dailyUsd: "SIGHTLINE_LLM_DAILY_USD",
} as const;

export function readGuardConfig(env: Record<string, string | undefined>): GuardConfig {
  const num = (key: string, fallback: number) => {
    const raw = env[key]?.trim();
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    killSwitch: /^(1|true|on|yes)$/i.test(env[GUARD_ENV.killSwitch]?.trim() ?? ""),
    routes: LLM_ROUTES.filter((r) =>
      (env[GUARD_ENV.routes] ?? "")
        .split(",")
        .map((x) => x.trim())
        .includes(r),
    ),
    sessionPerHour: num(GUARD_ENV.sessionPerHour, GUARD_DEFAULTS.sessionPerHour),
    ipPerDay: num(GUARD_ENV.ipPerDay, GUARD_DEFAULTS.ipPerDay),
    dailyCalls: num(GUARD_ENV.dailyCalls, GUARD_DEFAULTS.dailyCalls),
    dailyUsd: num(GUARD_ENV.dailyUsd, GUARD_DEFAULTS.dailyUsd),
  };
}

// ---------------------------------------------------------------------------
// Cost

/** Anthropic list prices, USD per million tokens (5-minute cache writes). Checked 2026-09-21. */
export const PRICES_PER_MTOK: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-opus-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  // The server-side refusal fallback may answer on Opus 4.8, at the same rates.
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

function priceFor(model: string) {
  const known = PRICES_PER_MTOK[model];
  if (known) return known;
  // Unknown model: assume the most expensive known rate rather than zero.
  const all = Object.values(PRICES_PER_MTOK);
  return {
    input: Math.max(...all.map((p) => p.input)),
    output: Math.max(...all.map((p) => p.output)),
    cacheWrite: Math.max(...all.map((p) => p.cacheWrite)),
    cacheRead: Math.max(...all.map((p) => p.cacheRead)),
  };
}

export function costUsd(usage: Usage, model: string): number {
  const p = priceFor(model);
  return (
    (usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * p.cacheRead) /
    1_000_000
  );
}

/** Upper bound for one call: no cache hit, every allowed output token used. */
export function worstCaseUsd(inputTokens: number, maxTokens: number, model: string): number {
  return costUsd({ input_tokens: inputTokens, output_tokens: maxTokens }, model);
}

// ---------------------------------------------------------------------------
// Reservations

export type Identity = { session: string; ip: string };
export type Reservation = Identity & { day: string; hour: string; usd: number };

export function reservationFor(identity: Identity, now: Date, usd: number): Reservation {
  const iso = now.toISOString();
  return { ...identity, day: iso.slice(0, 10), hour: iso.slice(0, 13), usd };
}

export interface QuotaStore {
  /** Null when the call may go ahead (and is now counted); otherwise why not. */
  reserve(r: Reservation, limits: GuardConfig): Promise<GuardDenial | null>;
  /** Adjust the day's spend by (actual − reserved). */
  settle(day: string, deltaUsd: number): Promise<void>;
}

export async function checkGuard(
  store: QuotaStore,
  config: GuardConfig,
  r: Reservation,
): Promise<GuardDenial | null> {
  if (config.killSwitch) return "kill_switch";
  try {
    return await store.reserve(r, config);
  } catch (error) {
    console.error("llm guard unavailable; answering from rules", error);
    return "guard_unavailable";
  }
}

/**
 * Same semantics as public.llm_reserve() in the migration; both pass the same
 * contract test. Per process only: for tests and local development.
 */
export class MemoryQuotaStore implements QuotaStore {
  private calls = new Map<string, number>();
  private usd = new Map<string, number>();

  async reserve(r: Reservation, c: GuardConfig): Promise<GuardDenial | null> {
    const g = `global:${r.day}`;
    const s = `session:${r.session}:${r.hour}`;
    const i = `ip:${r.ip}:${r.day}`;
    const n = (k: string) => this.calls.get(k) ?? 0;
    if (n(g) >= c.dailyCalls) return "daily_calls";
    if ((this.usd.get(g) ?? 0) + r.usd > c.dailyUsd) return "daily_spend";
    if (n(s) >= c.sessionPerHour) return "session_limit";
    if (n(i) >= c.ipPerDay) return "ip_limit";
    for (const k of [g, s, i]) this.calls.set(k, n(k) + 1);
    this.usd.set(g, (this.usd.get(g) ?? 0) + r.usd);
    return null;
  }

  async settle(day: string, deltaUsd: number) {
    const g = `global:${day}`;
    this.usd.set(g, Math.max(0, (this.usd.get(g) ?? 0) + deltaUsd));
  }
}

type Rpc = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** Calls public.llm_reserve / public.llm_settle (supabase-js `.rpc`, or SQL in tests). */
export class RpcQuotaStore implements QuotaStore {
  constructor(private rpc: Rpc) {}

  async reserve(r: Reservation, c: GuardConfig): Promise<GuardDenial | null> {
    const { data, error } = await this.rpc("llm_reserve", {
      p_day: r.day,
      p_hour: r.hour,
      p_session: r.session,
      p_ip: r.ip,
      p_usd: r.usd,
      p_session_limit: c.sessionPerHour,
      p_ip_limit: c.ipPerDay,
      p_daily_calls: c.dailyCalls,
      p_daily_usd: c.dailyUsd,
    });
    if (error) throw new Error(`llm_reserve: ${error.message}`);
    if (data === "ok") return null;
    const denials: GuardDenial[] = ["session_limit", "ip_limit", "daily_calls", "daily_spend"];
    const denial = denials.find((d) => d === data);
    if (!denial) throw new Error(`llm_reserve: unexpected result ${String(data)}`);
    return denial;
  }

  async settle(day: string, deltaUsd: number) {
    const { error } = await this.rpc("llm_settle", { p_day: day, p_delta: deltaUsd });
    if (error) throw new Error(`llm_settle: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------

/** A Claude call that failed after the request was made, with what it cost if known. */
export class LlmError extends Error {
  constructor(
    readonly reason: ClaudeFailure,
    readonly usage?: Usage,
    readonly model?: string,
  ) {
    super(reason);
    this.name = "LlmError";
  }
}
