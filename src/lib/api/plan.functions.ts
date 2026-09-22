import { createServerFn } from "@tanstack/react-start";

import { getDestination } from "@/lib/destinations";
import { askRules, type AskAnswer } from "@/lib/ask";
import { parseTripRules, type ParsedTrip } from "@/lib/understand";
import type { FallbackReason } from "@/lib/llm-guard";
import type { Engine } from "@/lib/llm-route";
import { AskInput, UnderstandInput } from "@/lib/api/plan.schemas";

export type { Engine };

export type Understood = {
  trip: ParsedTrip;
  engine: Engine;
  /** Set when Claude is configured but didn't answer, and why (quota, kill switch, failure). */
  fallback?: FallbackReason;
};

/**
 * Free text → brief. Claude when a key is configured and the guard allows it;
 * the rules parser otherwise, or on any failure. The raw text is not stored or
 * logged: the event records its length, tokens, timing and versions.
 */
export const understandTrip = createServerFn({ method: "POST" })
  .inputValidator(UnderstandInput)
  .handler(async ({ data }): Promise<Understood> => {
    const { routeLlm } = await import("@/lib/llm-route");
    const { llmRuntime } = await import("@/lib/llm-runtime.server");
    const llm = await import("@/lib/llm.server");
    const out = await routeLlm({
      ...(await llmRuntime(data.session)),
      route: "understand",
      promptVersion: llm.promptVersion("understand"),
      inputChars: data.text.length,
      estimateUsd: llm.reservationUsd(llm.understandParams(data.text)),
      rules: () => parseTripRules(data.text),
      claude: async () => {
        const r = await llm.understandWithClaude(data.text);
        return {
          value: r.trip,
          usage: r.usage,
          model: r.model,
          counts: { dropped: r.dropped.length },
        };
      },
    });
    return { trip: out.value, engine: out.engine, fallback: out.fallback };
  });

/** A question about one destination → the record's own sentences that answer it. */
export const askDestination = createServerFn({ method: "POST" })
  .inputValidator(AskInput)
  .handler(async ({ data }): Promise<AskAnswer & { fallback?: FallbackReason }> => {
    const d = getDestination(data.destination);
    if (!d) throw new Error("unknown destination");
    const { routeLlm } = await import("@/lib/llm-route");
    const { llmRuntime } = await import("@/lib/llm-runtime.server");
    const llm = await import("@/lib/llm.server");
    const out = await routeLlm<AskAnswer>({
      ...(await llmRuntime(data.session)),
      route: "ask",
      promptVersion: llm.promptVersion("ask"),
      inputChars: data.question.length,
      estimateUsd: llm.reservationUsd(llm.selectParams(d, data.question)),
      rules: () => askRules(d, data.question),
      claude: async () => {
        const s = await llm.selectWithClaude(d, data.question);
        return {
          value: {
            engine: "claude",
            status: s.status,
            passageIds: s.passageIds,
            concerns: [],
          },
          usage: s.usage ?? { input_tokens: 0, output_tokens: 0 },
          model: s.model,
          counts: { selected: s.passageIds.length, rejected: s.rejected.length },
        };
      },
    });
    return out.fallback ? { ...out.value, fallback: out.fallback } : out.value;
  });
