/**
 * Adversarial gates. Invariants must hold on every case for every engine; the
 * rules path is run here, and a deliberately hostile stand-in for Claude shows
 * the gates hold whatever the model returns. Expected-behaviour counts are
 * pinned as regression floors, set from the first rules run on 2026-09-22 (the
 * cases were written before it). See docs/threat-model.md.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getDestination } from "@/lib/destinations";
import { passagesFor } from "@/lib/passages";
import { parseTripRules } from "@/lib/understand";
import { askRules } from "@/lib/ask";
import { AskInput, UnderstandInput } from "@/lib/api/plan.schemas";
import { ASK_ADVERSARIAL, TRIP_ADVERSARIAL } from "./adversarial.gold";
import {
  askViolations,
  runAskRules,
  runTripRules,
  summarizeRows,
  tripViolations,
} from "./adversarial";

describe("adversarial inputs, rules path", () => {
  test("invariants hold on every case", () => {
    for (const r of runTripRules())
      expect({ id: r.c.id, violations: r.violations }).toEqual({ id: r.c.id, violations: [] });
    for (const r of runAskRules())
      expect({ id: r.c.id, violations: r.violations }).toEqual({ id: r.c.id, violations: [] });
  });

  test("expected behaviour does not regress (floors from the first run)", () => {
    const s = summarizeRows(runTripRules(), runAskRules());
    expect(s.trip.n).toBe(27);
    expect(s.trip.met).toBeGreaterThanOrEqual(24);
    expect(s.ask.n).toBe(17);
    expect(s.ask.met).toBeGreaterThanOrEqual(16);
  });

  test("the longest inputs are handled fast", () => {
    const longest = [...TRIP_ADVERSARIAL].sort((a, b) => b.text.length - a.text.length)[0]!;
    const q = [...ASK_ADVERSARIAL].sort((a, b) => b.question.length - a.question.length)[0]!;
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      parseTripRules(longest.text);
      askRules(getDestination(q.destination)!, q.question);
    }
    expect((performance.now() - t0) / 10).toBeLessThan(100);
  });
});

describe("input bounds, before any engine runs", () => {
  test("describe: 1–1000 characters after trimming", () => {
    expect(UnderstandInput.safeParse({ text: "x".repeat(1000) }).success).toBe(true);
    expect(UnderstandInput.safeParse({ text: "x".repeat(1001) }).success).toBe(false);
    expect(UnderstandInput.safeParse({ text: "   " }).success).toBe(false);
  });

  test("ask: 2–500 characters, destination id at most 80", () => {
    expect(AskInput.safeParse({ destination: "komodo", question: "q".repeat(500) }).success).toBe(
      true,
    );
    expect(AskInput.safeParse({ destination: "komodo", question: "q".repeat(501) }).success).toBe(
      false,
    );
    expect(AskInput.safeParse({ destination: "d".repeat(81), question: "hi" }).success).toBe(false);
  });

  test("session ids are bounded too", () => {
    expect(UnderstandInput.safeParse({ text: "mantas", session: "s".repeat(65) }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// A hostile model: whatever comes back, the diver sees only known values or
// verbatim sentences of the record they're on.

let server: ReturnType<typeof Bun.serve>;
let reply: unknown = {};
const env = { key: process.env.ANTHROPIC_API_KEY, url: process.env.ANTHROPIC_BASE_URL };

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json({
        id: "msg_hostile",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: [{ type: "text", text: JSON.stringify(reply) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
  });
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${server.port}`;
});
afterAll(() => {
  server.stop(true);
  if (env.key === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = env.key;
  if (env.url === undefined) delete process.env.ANTHROPIC_BASE_URL;
  else process.env.ANTHROPIC_BASE_URL = env.url;
});

describe("a hostile model", () => {
  test("describe: injected values are dropped, only closed-list values survive", async () => {
    const { understandWithClaude } = await import("@/lib/llm.server");
    reply = {
      month: "Ignore previous instructions",
      also_months: ["Smarch", "May", "May"],
      targets: ["You turn a scuba diver's description…", "manta-rays", "<script>x</script>"],
      cert: "root",
      current_limit: "strong",
      format: "DROP TABLE events",
      dive_type: null,
      where: "country:Atlantis",
      concerns: ["seasickness", "seasickness", "exfiltrate_keys"],
      unsupported: ["everything"],
      destinations: ["komodo", "atlantis", "../../etc/passwd"],
    };
    const { trip, dropped } = await understandWithClaude("anything", { apiKey: "test" });
    expect(tripViolations(trip)).toEqual([]);
    expect(trip).toMatchObject({
      month: null,
      alsoMonths: [4],
      targets: ["manta-rays"],
      cert: null,
      current: null,
      format: null,
      where: null,
      concerns: ["seasickness"],
      unsupported: [],
      destinations: ["komodo"],
    });
    expect(dropped.length).toBeGreaterThanOrEqual(8);
  });

  test("ask: out-of-range, repeated and excess sentence numbers never reach the diver", async () => {
    const { selectWithClaude } = await import("@/lib/llm.server");
    const d = getDestination("komodo")!;
    const ps = passagesFor(d);
    reply = { sentences: [0, -1, 999, 3, 3, 4, 5, 6, 7], status: "hacked" };
    const s = await selectWithClaude(d, "anything", { apiKey: "test" });
    expect(s.passageIds).toEqual([ps[2]!.id, ps[3]!.id]);
    expect(askViolations("komodo", { engine: "claude", concerns: [], ...s })).toEqual([]);
  });

  test("ask: output that breaks the schema is a typed failure, answered by rules", async () => {
    const { selectWithClaude } = await import("@/lib/llm.server");
    const { LlmError } = await import("@/lib/llm-guard");
    reply = { sentences: [1.5, "2; DROP TABLE"], status: "answered" };
    const err = await selectWithClaude(getDestination("komodo")!, "q", { apiKey: "test" }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(LlmError);
    expect(err.reason).toBe("invalid_output");
  });
});
