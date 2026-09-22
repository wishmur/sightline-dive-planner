/**
 * The request path around one Claude call, shared by both server functions:
 *
 *   key? → route on? → kill switch → quota reservation → Claude → settle spend → log
 *
 * Every exit that isn't a validated Claude answer is the rules engine's answer,
 * with the reason recorded. Logging and settling are best-effort and can never
 * break the answer. The event carries counts, tokens, timing and versions, and
 * never the diver's text.
 *
 * Pure: dependencies are injected (src/lib/llm-runtime.server.ts in production,
 * fakes in evals/llm-route.test.ts).
 */
import {
  LlmError,
  checkGuard,
  costUsd,
  reservationFor,
  type FallbackReason,
  type GuardConfig,
  type Identity,
  type LlmRouteId,
  type QuotaStore,
  type Usage,
} from "@/lib/llm-guard";

export type Engine = "claude" | "rules";
export type LlmRoute = LlmRouteId;

export type ClaudeResult<T> = {
  value: T;
  usage: Usage;
  model: string;
  /** Numeric diagnostics only (dropped values, rejected sentence numbers, …). */
  counts?: Record<string, number>;
};

export type RouteDeps<T> = {
  route: LlmRoute;
  hasKey: boolean;
  config: GuardConfig;
  store: QuotaStore;
  identity: Identity;
  now: () => Date;
  promptVersion: string;
  /** Length of the diver's text: sizes cost, reveals nothing. */
  inputChars: number;
  /** Worst-case cost reserved before the call. */
  estimateUsd: number;
  rules: () => T;
  claude: () => Promise<ClaudeResult<T>>;
  log: (event: LlmEvent) => Promise<void>;
};

export type LlmEvent = {
  route: LlmRoute;
  engine: Engine;
  /** Whether a Claude request was actually sent. */
  attempted: boolean;
  /** Why rules answered; null when Claude did. */
  reason: FallbackReason | "no_key" | "route_off" | null;
  prompt_version: string;
  model: string | null;
  latency_ms: number | null;
  total_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  usd: number | null;
  chars: number;
  counts: Record<string, number> | null;
};

export type Routed<T> = { value: T; engine: Engine; fallback?: FallbackReason };

function failureOf(error: unknown): { reason: FallbackReason; usage?: Usage; model?: string } {
  if (error instanceof LlmError)
    return { reason: error.reason, usage: error.usage, model: error.model };
  const name = error instanceof Error ? error.constructor.name : "";
  if (/Timeout/i.test(name)) return { reason: "timeout" };
  return { reason: "api_error" };
}

export async function routeLlm<T>(d: RouteDeps<T>): Promise<Routed<T>> {
  const started = Date.now();
  const base = {
    route: d.route,
    prompt_version: d.promptVersion,
    chars: d.inputChars,
  };
  const blank = {
    model: null,
    latency_ms: null,
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    cache_write_tokens: null,
    usd: null,
    counts: null,
  };
  const emit = async (event: Omit<LlmEvent, "total_ms">) => {
    try {
      await d.log({ ...event, total_ms: Date.now() - started });
    } catch (error) {
      console.error("llm event log failed", error instanceof Error ? error.message : "");
    }
  };
  const settle = async (day: string, delta: number) => {
    try {
      await d.store.settle(day, delta);
    } catch (error) {
      console.error("llm settle failed", error instanceof Error ? error.message : "");
    }
  };

  if (!d.hasKey) {
    const value = d.rules();
    await emit({ ...base, ...blank, engine: "rules", attempted: false, reason: "no_key" });
    return { value, engine: "rules" };
  }

  // Not switched on for this route (yet): the rules engine is the product here.
  if (!d.config.routes.includes(d.route)) {
    const value = d.rules();
    await emit({ ...base, ...blank, engine: "rules", attempted: false, reason: "route_off" });
    return { value, engine: "rules" };
  }

  const reservation = reservationFor(d.identity, d.now(), d.estimateUsd);
  const denied = await checkGuard(d.store, d.config, reservation);
  if (denied) {
    const value = d.rules();
    await emit({ ...base, ...blank, engine: "rules", attempted: false, reason: denied });
    return { value, engine: "rules", fallback: denied };
  }

  const callStarted = Date.now();
  try {
    const out = await d.claude();
    const latency = Date.now() - callStarted;
    const usd = costUsd(out.usage, out.model);
    await settle(reservation.day, usd - d.estimateUsd);
    await emit({
      ...base,
      engine: "claude",
      attempted: true,
      reason: null,
      model: out.model,
      latency_ms: latency,
      input_tokens: out.usage.input_tokens,
      output_tokens: out.usage.output_tokens,
      cache_read_tokens: out.usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: out.usage.cache_creation_input_tokens ?? 0,
      usd,
      counts: out.counts ?? null,
    });
    return { value: out.value, engine: "claude" };
  } catch (error) {
    const latency = Date.now() - callStarted;
    const f = failureOf(error);
    // Known cost: keep exactly that. API errors aren't billed: release it all.
    // Unknown (timeouts, unparseable output): keep the reservation.
    let usd: number | null = null;
    if (f.usage) {
      usd = costUsd(f.usage, f.model ?? "");
      await settle(reservation.day, usd - d.estimateUsd);
    } else if (f.reason === "api_error") {
      await settle(reservation.day, -d.estimateUsd);
    }
    console.error(`llm ${d.route}: ${f.reason}; answering from rules`);
    const value = d.rules();
    await emit({
      ...base,
      ...blank,
      engine: "rules",
      attempted: true,
      reason: f.reason,
      model: f.model ?? null,
      latency_ms: latency,
      input_tokens: f.usage?.input_tokens ?? null,
      output_tokens: f.usage?.output_tokens ?? null,
      cache_read_tokens: f.usage ? (f.usage.cache_read_input_tokens ?? 0) : null,
      cache_write_tokens: f.usage ? (f.usage.cache_creation_input_tokens ?? 0) : null,
      usd,
    });
    return { value, engine: "rules", fallback: f.reason };
  }
}
