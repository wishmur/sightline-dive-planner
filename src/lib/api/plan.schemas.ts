import { z } from "zod";

/** The browser's per-tab session id; used for rate limiting and joining events. */
const session = z.string().max(64).optional();

/** Input bounds for the two public server functions: the first line of defence on length. */
export const UnderstandInput = z.object({ text: z.string().trim().min(1).max(1000), session });

export const AskInput = z.object({
  destination: z.string().min(1).max(80),
  question: z.string().trim().min(2).max(500),
  session,
});
