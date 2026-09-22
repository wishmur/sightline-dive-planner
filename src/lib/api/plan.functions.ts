import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getDestination } from "@/lib/destinations";
import { askRules, type AskAnswer } from "@/lib/ask";
import { parseTripRules, type ParsedTrip } from "@/lib/understand";

export type Engine = "claude" | "rules";

export type Understood = {
  trip: ParsedTrip;
  engine: Engine;
  /** Set when Claude is configured but the call failed and rules answered instead. */
  fallback?: string;
};

/**
 * Free text → brief. Claude when a key is configured, the rules parser otherwise
 * or on any failure. The raw text is not stored or logged.
 */
export const understandTrip = createServerFn({ method: "POST" })
  .inputValidator(z.object({ text: z.string().trim().min(1).max(1000) }))
  .handler(async ({ data }): Promise<Understood> => {
    const { hasClaude, understandWithClaude } = await import("@/lib/llm.server");
    if (!hasClaude()) return { trip: parseTripRules(data.text), engine: "rules" };
    try {
      const { trip } = await understandWithClaude(data.text);
      return { trip, engine: "claude" };
    } catch (error) {
      console.error("understandTrip: falling back to rules", error);
      return { trip: parseTripRules(data.text), engine: "rules", fallback: "claude_unavailable" };
    }
  });

/** A question about one destination → the record's own sentences that answer it. */
export const askDestination = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      destination: z.string().min(1).max(80),
      question: z.string().trim().min(2).max(500),
    }),
  )
  .handler(async ({ data }): Promise<AskAnswer & { fallback?: string }> => {
    const d = getDestination(data.destination);
    if (!d) throw new Error("unknown destination");
    const { hasClaude, selectWithClaude } = await import("@/lib/llm.server");
    if (!hasClaude()) return askRules(d, data.question);
    try {
      const s = await selectWithClaude(d, data.question);
      return { engine: "claude", status: s.status, passageIds: s.passageIds, concerns: [] };
    } catch (error) {
      console.error("askDestination: falling back to rules", error);
      return { ...askRules(d, data.question), fallback: "claude_unavailable" };
    }
  });
