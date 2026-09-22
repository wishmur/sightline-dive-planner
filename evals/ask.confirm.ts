/**
 * Ask: confirmation set. 30 questions written and labelled on 2026-09-22,
 * AFTER the first paid run and BEFORE any of them was sent to Claude.
 *
 * Why it exists: the two-sentence cap that lifted precision from 75% to 89% was
 * chosen after seeing the test half, so that 89% is a post-hoc number. This set
 * is fresh evidence for the same question, scored once.
 *
 * Pre-registered pass marks for the capped configuration, fixed before the run:
 * - precision ≥ 80% (the bar the first run missed at 75%)
 * - hit rate not below the keyword rules on this same set
 * - abstains on at least 4 of the 5 off-record questions
 * - 0 invalid sentence numbers, 0 failed calls
 *
 * Labels: `relevant` holds 1-based sentence indices into passagesFor(destination),
 * chosen by reading the record. Paraphrase cases take their relevant set from the
 * frozen concern gold, so they add fresh questions without new labels. None of
 * these questions appears in evals/ask.gold.ts.
 */
import type { ConcernId } from "@/lib/concerns";
import type { AskCase } from "./ask.gold";

const specific: [string, string, number[]][] = [
  ["tulamben", "Do porters carry the tanks down to the water?", [25, 24]],
  ["tulamben", "How early do I need to be on the Liberty to beat the crowd?", [18, 26]],
  ["komodo", "Which months are best for Manta Alley?", [10, 3]],
  ["komodo", "How cold does the water get in southern Komodo?", [6, 7]],
  ["komodo", "Will I need a reef hook?", [16, 8]],
  ["socorro", "What are the park fees at Socorro?", [9, 35]],
  ["socorro", "How far ahead should I book for the whale window?", [34]],
  ["socorro", "Is Socorro a sensible first liveaboard?", [8, 6]],
  ["palau", "Are the grey reef sharks at Blue Corner baited?", [9, 8]],
  ["palau", "What is visibility like in Palau in July?", [2]],
  ["silfra", "Can I dive Silfra in a wetsuit?", [4, 26, 24]],
  ["silfra", "Is there any life to see at Silfra?", [16, 9, 7]],
  ["ningaloo", "Do I need to be a strong swimmer for the whale shark tour?", [5]],
  ["ningaloo", "Why is the Navy Pier hard to get onto?", [20, 29]],
  ["ningaloo", "Can I snorkel the reef straight from the beach?", [31, 32]],
  ["galapagos", "How cold is it in the cool season?", [6, 41]],
  ["galapagos", "Can I reach Darwin and Wolf on a day boat?", [22, 36, 31]],
  ["galapagos", "Is the cold season better for hammerhead schools?", [11, 12]],
  ["moorea", "Is Moorea gentle enough for a nervous diver?", [3, 4, 5]],
  ["moorea", "When are the humpbacks around Moorea?", [10, 2]],
];

const offRecord: [string, string][] = [
  ["silfra", "Can I hire an underwater camera there?"],
  ["moorea", "What does a rental car cost on the island?"],
  ["galapagos", "Which airlines fly into Baltra?"],
  ["tulamben", "Is there an ATM in the village?"],
  ["komodo", "How much is a hotel in Labuan Bajo?"],
];

/** Fresh wording for worries the concern gold already labels. */
const paraphrase: [string, ConcernId, string][] = [
  ["galapagos", "cold", "Will I freeze in a 5mm?"],
  ["komodo", "current", "Is the water pulling hard there?"],
  ["socorro", "getting_there", "How long is the boat ride out to the islands?"],
  ["ningaloo", "non_diver", "My son only snorkels, is that a problem?"],
  ["silfra", "experience", "I have about 20 dives, is that enough?"],
];

export const CONFIRM_CASES: AskCase[] = [
  ...specific.map(([destination, question, relevant], i) => ({
    id: `c-specific-${i + 1}`,
    destination,
    question,
    relevant,
    kind: "specific" as const,
  })),
  ...offRecord.map(([destination, question], i) => ({
    id: `c-offrecord-${i + 1}`,
    destination,
    question,
    relevant: [],
    kind: "off_record" as const,
  })),
  ...paraphrase.map(([destination, concern, question], i) => ({
    id: `c-paraphrase-${i + 1}`,
    destination,
    question,
    concern,
    kind: "paraphrase" as const,
  })),
];
