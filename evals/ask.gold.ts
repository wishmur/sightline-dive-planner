/**
 * "Ask about this destination" gold. Written 2026-09-21 before the ask path
 * existed, then frozen. Three kinds of question:
 *
 * - specific: the long tail no concern covers ("Can I scuba in Jellyfish Lake?").
 *   Relevant sentences are 1-based indices into passagesFor(destination), the same
 *   split evals/concerns.gold.json is pinned to.
 * - off-record: reasonable questions the record doesn't answer. The right output
 *   is "this record doesn't say".
 * - paraphrase: a concern asked in words its triggers don't use ("How warm is the
 *   water?"), on test-split destinations. Relevant = the concern gold.
 */
import type { ConcernId } from "@/lib/concerns";

export type AskCase = {
  id: string;
  destination: string;
  question: string;
  /** 1-based sentence indices; empty = the record doesn't answer it. */
  relevant?: number[];
  /** Paraphrase cases take their relevant set from the concern gold. */
  concern?: ConcernId;
  kind: "specific" | "off_record" | "paraphrase";
};

const specific: [string, string, number[]][] = [
  ["tulamben", "Can I get to the Liberty wreck from the beach?", [16, 24, 25]],
  ["tulamben", "Are the bumphead parrotfish still on the wreck?", [7, 8, 9]],
  ["komodo", "Can I see Manta Alley on day trips from Labuan Bajo?", [23, 24, 27]],
  ["raja-ampat", "Will I see whale sharks in Raja Ampat?", [20, 21, 22, 23]],
  ["malapascua", "What time do the thresher dives leave?", [9, 10, 21]],
  ["socorro", "Will I hear humpback whales underwater?", [12, 27]],
  ["cabo-pulmo", "Am I guaranteed to dive El Vencedor?", [2, 9]],
  ["cozumel", "Are there any fish found only in Cozumel?", [7, 18]],
  ["yucatan-cenotes", "Will I see much marine life in the cenotes?", [24, 25, 26]],
  ["cocos", "Is there a good night dive at Cocos?", [10]],
  ["galapagos", "Can I dive Darwin and Wolf from a land-based hotel?", [22, 31, 36]],
  ["kona", "Are mantas guaranteed on the Kona night dive?", [7, 9]],
  ["la-paz", "Can I scuba dive with the whale sharks in La Paz?", [12, 28, 29, 30]],
  ["palau", "Can I scuba dive in Jellyfish Lake?", [24, 32]],
  ["fakarava", "Where should I stay to dive the Wall of Sharks?", [30, 31]],
  ["moorea", "Are the sharks at Moorea fed?", [7, 15, 16]],
  ["baa-atoll", "Can I scuba dive in Hanifaru Bay?", [12, 21, 23]],
  ["ningaloo", "What happens if we don't find a whale shark?", [9]],
  ["gbr-ribbon-reefs", "When can I swim with minke whales?", [2, 7]],
  ["yonaguni", "Is the Yonaguni monument man-made?", [19, 21, 22]],
  ["tiger-beach", "Are the tiger sharks attracted with bait?", [9, 14]],
  ["azores", "Can I get in the water with sperm whales?", [12, 22, 30]],
  ["aliwal-shoal", "Will a June trip to Aliwal include the sardine run?", [29, 33]],
  ["malta", "Is the Azure Window still standing?", [13, 14]],
  ["oahu", "Are the Haleiwa shark tours a scuba dive?", [25, 27, 33]],
  ["red-sea-north", "Is the Blue Hole in Dahab dangerous?", [22]],
  ["alor", "Can I see blue whales underwater in Alor?", [29, 30]],
  ["lembeh", "Is there any coral or scenery at Lembeh?", [13, 15, 19, 20]],
  ["tubbataha", "When is Tubbataha open?", [2, 3]],
  ["nusa-penida", "How likely am I to see a mola?", [11, 13]],
  ["anilao", "Is there blackwater diving in Anilao?", [6, 15, 17]],
  ["moalboal", "Do the sardines have a season?", [7, 8, 14]],
  ["silfra", "Do I need a drysuit certification for Silfra?", [3, 24]],
  ["rangiroa", "Can I see hammerheads and mantas on the same trip?", [3, 10]],
  ["ari-atoll", "Are the whale sharks fed at South Ari?", [9]],
  ["red-sea-brothers", "Can I do night dives at the Brothers?", [27]],
  ["coral-sea", "Is the North Horn shark dive baited?", [7, 15]],
];

const offRecord: [string, string][] = [
  ["tulamben", "Is there wifi at the dive resorts?"],
  ["cozumel", "Are there direct flights from London?"],
  ["palau", "What's the best restaurant in Koror?"],
  ["galapagos", "Do I need a yellow fever vaccination?"],
  ["malta", "Can I rent a car without a credit card?"],
  ["socorro", "Is there vegetarian food on the boats?"],
  ["kona", "Can I see lava flowing?"],
  ["ningaloo", "Is there good surfing nearby?"],
  ["raja-ampat", "Is there mobile signal on the liveaboards?"],
  ["komodo", "Do I need a visa for Indonesia?"],
];

const PARAPHRASES: Record<ConcernId, [string, string]> = {
  seasickness: ["Will I be on a boat for hours?", "Is the boat ride rough?"],
  cold: ["How warm is the water?", "What wetsuit should I bring?"],
  non_diver: [
    "Is there anything for my wife who doesn't dive?",
    "Can someone who only snorkels come along?",
  ],
  experience: ["Is this OK for a beginner?", "How many dives do I need?"],
  current: ["Are the currents strong?", "Is it drift diving?"],
  crowds: ["Does it get busy?", "Are there lots of other boats?"],
  visibility: ["How clear is the water?", "What's the vis like?"],
  weather: ["Is there a rainy season?", "Do trips get cancelled for weather?"],
  rules: ["Are there park fees?", "Any rules I need to follow?"],
  remote: ["How far is the nearest chamber?", "What if I get bent?"],
  photography: ["Is it good for photography?", "Is it worth bringing my camera?"],
  depth: ["How deep are the dives?", "Do I need nitrox?"],
  getting_there: ["How do I get there?", "Where do the boats leave from?"],
};

/** Test-split destinations, rotated so each paraphrase lands on a different record. */
const TEST_DESTINATIONS = [
  "nusa-penida",
  "raja-ampat",
  "alor",
  "malapascua",
  "moalboal",
  "cabo-pulmo",
  "yucatan-cenotes",
  "galapagos",
  "silfra",
  "palau",
  "rangiroa",
  "ari-atoll",
  "red-sea-north",
  "ningaloo",
  "coral-sea",
  "tiger-beach",
  "aliwal-shoal",
  "oahu",
];

export const ASK_CASES: AskCase[] = [
  ...specific.map(([destination, question, relevant], i) => ({
    id: `specific-${i + 1}`,
    destination,
    question,
    relevant,
    kind: "specific" as const,
  })),
  ...offRecord.map(([destination, question], i) => ({
    id: `off-record-${i + 1}`,
    destination,
    question,
    relevant: [],
    kind: "off_record" as const,
  })),
  ...(Object.entries(PARAPHRASES) as [ConcernId, [string, string]][]).flatMap(([concern, qs], c) =>
    qs.map((question, q) => ({
      id: `paraphrase-${concern}-${q + 1}`,
      destination: TEST_DESTINATIONS[(c * 2 + q) % TEST_DESTINATIONS.length]!,
      question,
      concern,
      kind: "paraphrase" as const,
    })),
  ),
];
