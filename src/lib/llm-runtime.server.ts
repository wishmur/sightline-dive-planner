/**
 * Production wiring for src/lib/llm-route.ts: env config, the quota store,
 * who's asking (session id + keyed hash of the address), and the event log.
 *
 * Env (all optional; read per request, as Workers bind env at request time):
 *   ANTHROPIC_API_KEY                makes Claude available
 *   SIGHTLINE_LLM_ROUTES=understand,ask  routes it may answer (opt-in; default none:
 *                                    a route is switched on once it passes its eval)
 *   SIGHTLINE_LLM_KILL_SWITCH=1      turns every route off, no deploy needed
 *   SIGHTLINE_LLM_SESSION_PER_HOUR   default 20
 *   SIGHTLINE_LLM_IP_PER_DAY         default 60
 *   SIGHTLINE_LLM_DAILY_CALLS        default 500
 *   SIGHTLINE_LLM_DAILY_USD          default 5
 *   SIGHTLINE_LLM_GUARD=memory       per-process counters, for local dev only
 *   SIGHTLINE_HASH_SALT              key for the address hash (else the service key)
 *
 * Quota needs the llm_quota migration and SUPABASE_SERVICE_ROLE_KEY. Without
 * them every Claude call fails closed to the rules engine ("guard_unavailable").
 */
import process from "node:process";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import {
  MemoryQuotaStore,
  RpcQuotaStore,
  readGuardConfig,
  type Identity,
  type QuotaStore,
} from "@/lib/llm-guard";
import type { LlmEvent, RouteDeps } from "@/lib/llm-route";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOG_TIMEOUT_MS = 1500;

let memory: MemoryQuotaStore | undefined;

function store(): QuotaStore {
  if (process.env.SIGHTLINE_LLM_GUARD === "memory") return (memory ??= new MemoryQuotaStore());
  return new RpcQuotaStore(async (fn, args) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The generated types don't know these functions until Lovable regenerates them.
    const rpc = supabaseAdmin.rpc as unknown as (
      f: string,
      a: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    return rpc.call(supabaseAdmin, fn, args);
  });
}

async function hmacHex(key: string, message: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
  return [...sig.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The address is keyed-hashed with the day, so counters can't be reversed to an
 * address or linked across days. Behind Cloudflare, cf-connecting-ip is set by
 * the edge and can't be forged by the client.
 */
async function identity(session: string | undefined, now: Date): Promise<Identity> {
  let ip: string | undefined;
  try {
    ip = getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true });
  } catch {
    ip = undefined;
  }
  const key =
    process.env.SIGHTLINE_HASH_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "sightline-dev";
  const ipHash = await hmacHex(key, `${now.toISOString().slice(0, 10)}|${ip ?? "unknown"}`);
  // No valid session id: count the caller by address instead of one shared bucket.
  return { session: session && UUID.test(session) ? session : `ip-${ipHash}`, ip: ipHash };
}

async function logEvent(sessionId: string, event: LlmEvent) {
  if (process.env.SIGHTLINE_LLM_GUARD === "memory") {
    console.info("llm_call", JSON.stringify(event));
    return;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const insert = supabaseAdmin
    .from("events")
    .insert({ session_id: sessionId, event_type: "llm_call", payload: event as never })
    .then(({ error }) => {
      if (error) throw new Error(error.message);
    });
  await Promise.race([
    insert,
    new Promise((_, reject) => setTimeout(() => reject(new Error("log timeout")), LOG_TIMEOUT_MS)),
  ]);
}

type Runtime = Pick<RouteDeps<unknown>, "hasKey" | "config" | "store" | "identity" | "now" | "log">;

export async function llmRuntime(session: string | undefined): Promise<Runtime> {
  const now = new Date();
  const who = await identity(session, now);
  return {
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
    config: readGuardConfig(process.env),
    store: store(),
    identity: who,
    now: () => now,
    log: (event) => logEvent(session && UUID.test(session) ? session : "server", event),
  };
}
