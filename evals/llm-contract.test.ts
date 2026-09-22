/**
 * Contract test for the Claude layer, with no Claude: a local stand-in for the
 * Messages API records what the SDK sends and returns canned structured output.
 * Checks the request (model, fallback beta, effort, allowed IDs in the cached
 * system prompt) and that whatever comes back is validated before use. Quality
 * is measured separately by `bun evals/understand.ts llm` and `bun evals/ask.ts llm`.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";

type Body = {
  model: string;
  fallbacks: string;
  output_config: { effort: string; format: { type: string } };
  system: { cache_control?: unknown }[];
  messages: { content: string | { type: string; text: string; cache_control?: unknown }[] }[];
};
type Captured = { headers: Record<string, string>; body: Body };
const captured: Captured[] = [];
let reply: unknown = {};
let refusal = false;
let server: ReturnType<typeof Bun.serve>;
const env = { key: process.env.ANTHROPIC_API_KEY, url: process.env.ANTHROPIC_BASE_URL };

function message(json: unknown) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: refusal ? [] : [{ type: "text", text: JSON.stringify(json) }],
    stop_reason: refusal ? "refusal" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      captured.push({
        headers: Object.fromEntries(req.headers.entries()),
        body: (await req.json()) as Body,
      });
      return Response.json(message(reply));
    },
  });
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
  if (env.key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = env.key;
  if (env.url === undefined) delete process.env.ANTHROPIC_BASE_URL;
  else process.env.ANTHROPIC_BASE_URL = env.url;
});

describe("understandWithClaude", () => {
  test("sends the brief schema and normalises the reply", async () => {
    const { understandWithClaude } = await import("@/lib/llm.server");
    reply = {
      month: "September",
      also_months: ["October"],
      targets: ["manta-rays"],
      cert: "advanced",
      current_limit: null,
      format: null,
      dive_type: null,
      where: null,
      concerns: ["seasickness", "non_diver", "sharks"],
      unsupported: ["cost"],
      destinations: ["atlantis"],
    };
    const { trip, dropped, usage } = await understandWithClaude(
      "Mantas in September, I get seasick",
    );
    expect(usage).toEqual({ input_tokens: 1, output_tokens: 1 });
    // One bad ID is dropped and counted; it doesn't void the rest of the parse.
    expect(dropped).toEqual(["concerns:sharks", "destinations:atlantis"]);
    expect(trip).toEqual({
      month: 8,
      alsoMonths: [9],
      targets: ["manta-rays"],
      cert: "advanced",
      current: null,
      format: null,
      diveType: null,
      where: null,
      concerns: ["seasickness", "non_diver"],
      unsupported: ["cost"],
      destinations: [],
    });

    const req = captured.at(-1)!;
    expect(req.body.model).toBe("claude-opus-5");
    expect(req.body.fallbacks).toBe("default");
    expect(req.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(req.body.output_config.effort).toBe("low");
    expect(req.body.output_config.format.type).toBe("json_schema");
    // Allowed values travel in the cached system prompt.
    const system = JSON.stringify(req.body.system);
    for (const id of ["seasickness: ", "manta-rays: ", "komodo: ", "country:Egypt"])
      expect(system).toContain(id);
    expect(req.body.system[0].cache_control).toEqual({ type: "ephemeral" });
    // The diver's text goes in the user turn, never the (cached) system prompt.
    expect(JSON.stringify(req.body.system)).not.toContain("I get seasick");
  });
});

describe("selectWithClaude", () => {
  test("numbers the record and keeps only real sentences", async () => {
    const { selectWithClaude } = await import("@/lib/llm.server");
    const d = getDestination("komodo")!;
    const ps = passagesFor(d);
    reply = { sentences: [24, 999, 25], status: "answered" };
    const s = await selectWithClaude(d, "Can I see Manta Alley from Labuan Bajo?");
    expect(s.passageIds).toEqual([ps[23]!.id, ps[24]!.id]);
    expect(s.rejected).toEqual([999]);
    expect(s.usage).toEqual({ input_tokens: 1, output_tokens: 1 });
    const content = captured.at(-1)!.body.messages[0]!.content;
    if (typeof content === "string") throw new Error("expected content blocks");
    // The record is its own block with a cache breakpoint, so follow-up questions
    // on the same destination read it from cache; the question comes after it.
    const [record, question] = content;
    expect(record!.text).toContain(`S1 [${ps[0]!.claim.label}] ${ps[0]!.text}`);
    expect(record!.text).toContain(`S${ps.length} `);
    expect(record!.cache_control).toEqual({ type: "ephemeral" });
    expect(record!.text).not.toContain("Manta Alley from Labuan Bajo");
    expect(question!.text).toContain("Can I see Manta Alley from Labuan Bajo?");
    expect(question!.cache_control).toBeUndefined();
  });

  test("a refusal is a typed failure carrying what it cost", async () => {
    const { selectWithClaude } = await import("@/lib/llm.server");
    const { LlmError } = await import("@/lib/llm-guard");
    refusal = true;
    try {
      await selectWithClaude(getDestination("komodo")!, "anything");
      throw new Error("expected a refusal");
    } catch (e) {
      expect(e).toBeInstanceOf(LlmError);
      expect((e as InstanceType<typeof LlmError>).reason).toBe("refusal");
      expect((e as InstanceType<typeof LlmError>).usage).toEqual({
        input_tokens: 1,
        output_tokens: 1,
      });
    } finally {
      refusal = false;
    }
  });
});

describe("server fallback", () => {
  test("a failing Claude call falls back to the rules engine", async () => {
    const { understandWithClaude } = await import("@/lib/llm.server");
    const { parseTripRules } = await import("@/lib/understand");
    process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:9"; // nothing listens here
    let engine = "claude";
    let trip;
    try {
      trip = (await understandWithClaude("whale sharks in March, open water")).trip;
    } catch {
      engine = "rules";
      trip = parseTripRules("whale sharks in March, open water");
    }
    expect(engine).toBe("rules");
    expect(trip.month).toBe(2);
    process.env.ANTHROPIC_BASE_URL = `http://localhost:${server.port}`;
  }, 60_000);
});
