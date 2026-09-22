/**
 * "Describe your trip" gold: what a diver wrote → what Sightline should understand.
 * Written 2026-09-21 BEFORE src/lib/understand.ts existed, then frozen. Change an
 * expectation only with a dated reason in the entry's `note`.
 *
 * Conventions (the labelling rules, applied to every case):
 * - month: the trip month, 0-based. A window ("late Oct to early Nov") takes its
 *   first month; the rest go in alsoMonths. Hemisphere-ambiguous words ("summer")
 *   and undated trips stay null: Sightline should not guess a month.
 * - cert: the diver's own level. Advanced with 50+ logged dives, Rescue,
 *   Divemaster or Instructor → advanced_plus_experience.
 * - current: set only when the diver states a limit ("nothing strong" → mild,
 *   "moderate is fine" → moderate). Worry without a limit is the `current` concern.
 * - format / diveType: only positive requests. "Not a liveaboard" sets nothing.
 * - concerns: the worries the fit engine can't see (src/lib/concerns.ts). A dive
 *   count with doubt ("only 25 dives") is the `experience` concern.
 * - unsupported: things asked for that Sightline holds no evidence on.
 * - destinations: destinations named in the text (→ compare).
 * - hard: colloquial or indirect phrasing that a keyword parser should struggle
 *   with. Reported separately.
 */
import type { ConcernId, UnsupportedId } from "@/lib/concerns";

export type TripExpectation = {
  month: number | null;
  alsoMonths?: number[];
  targets?: string[];
  cert?: "open_water" | "advanced" | "advanced_plus_experience" | null;
  current?: "mild" | "moderate" | null;
  format?: string | null;
  diveType?: string | null;
  where?: string | null;
  concerns?: ConcernId[];
  unsupported?: UnsupportedId[];
  destinations?: string[];
};

export type UnderstandCase = {
  id: string;
  text: string;
  expect: TripExpectation;
  hard?: boolean;
  note?: string;
};

export const UNDERSTAND_CASES: UnderstandCase[] = [
  {
    id: "mantas-sept-aow",
    text: "Mantas in September. I'm AOW.",
    expect: { month: 8, targets: ["manta-rays"], cert: "advanced" },
  },
  {
    id: "whale-sharks-march-ow",
    text: "Want to swim with whale sharks in March, I'm only open water certified",
    expect: { month: 2, targets: ["whale-shark"], cert: "open_water" },
  },
  {
    id: "hammerheads-seasick",
    text: "Looking for hammerheads, any time of year. I get horribly seasick though.",
    expect: { month: null, targets: ["hammerheads"], concerns: ["seasickness"] },
  },
  {
    id: "oct-partner-snorkels",
    text: "Two weeks in October. My partner doesn't dive but loves snorkelling, I'm Advanced with about 40 dives.",
    expect: { month: 9, cert: "advanced", concerns: ["non_diver"] },
  },
  {
    id: "macro-photo-indonesia",
    text: "Macro photography trip to Indonesia, frogfish and pygmy seahorses, sometime in July or August",
    expect: {
      month: 6,
      alsoMonths: [7],
      targets: ["frogfishes", "pygmy-seahorse"],
      diveType: "macro",
      where: "country:Indonesia",
      concerns: ["photography"],
    },
  },
  {
    id: "christmas-warm-easy",
    text: "Christmas holiday dive trip, nothing too crazy current-wise, want warm water and easy diving. OW cert, 20 dives.",
    expect: {
      month: 11,
      cert: "open_water",
      current: "mild",
      concerns: ["cold", "experience"],
    },
  },
  {
    id: "thresher-dawn",
    text: "thresher sharks! feb, advanced",
    expect: { month: 1, targets: ["thresher-sharks"], cert: "advanced" },
  },
  {
    id: "liveaboard-big-animals-aug",
    text: "I want to do a liveaboard in August for big pelagics — sharks, mantas, maybe whale sharks. Rescue diver, 120 dives.",
    expect: {
      month: 7,
      targets: ["manta-rays", "whale-shark"],
      cert: "advanced_plus_experience",
      format: "liveaboard",
      diveType: "pelagic",
    },
    note: "'sharks' alone is not a target: there is no all-sharks group, and guessing one species would be wrong.",
  },
  {
    id: "budget-red-sea",
    text: "Cheap Red Sea trip in April, what will it cost and which dive centre is best?",
    expect: {
      month: 3,
      where: "country:Egypt",
      unsupported: ["cost", "operator_quality"],
    },
  },
  {
    id: "komodo-vs-raja-july",
    text: "Komodo or Raja Ampat in July? Advanced, 60 dives.",
    expect: {
      month: 6,
      cert: "advanced_plus_experience",
      destinations: ["komodo", "raja-ampat"],
    },
  },
  {
    id: "cold-hater-galapagos",
    text: "Galápagos in November, but I really feel the cold. How cold is it and do I need a drysuit?",
    expect: { month: 10, destinations: ["galapagos"], concerns: ["cold"] },
  },
  {
    id: "crowds-sardines",
    text: "The sardine run in Moalboal — is it super crowded? Going in May.",
    expect: {
      month: 4,
      targets: ["bali-sardinella"],
      destinations: ["moalboal"],
      concerns: ["crowds"],
    },
  },
  {
    id: "first-trip-new-diver",
    text: "Just got certified, first dive trip abroad, want to see turtles and reef fish, June. Worried I'm not experienced enough.",
    expect: { month: 5, targets: ["sea-turtles"], cert: "open_water", concerns: ["experience"] },
  },
  {
    id: "wrecks-europe",
    text: "Wreck diving in Europe in September, shore diving ideally, I'm a divemaster.",
    expect: {
      month: 8,
      cert: "advanced_plus_experience",
      format: "shore_access",
      diveType: "wreck",
      where: "continent:Europe",
    },
  },
  {
    id: "mola-bali",
    text: "Mola mola in Bali in August, Advanced. How deep are those dives and do I need nitrox?",
    expect: {
      month: 7,
      targets: ["ocean-sunfish"],
      cert: "advanced",
      concerns: ["depth"],
    },
    note: "Bali is a region, not a country; 'where' is left unset rather than widened to Indonesia.",
  },
  {
    id: "remote-worry-cocos",
    text: "Thinking about Cocos Island for hammerheads. How far is it from help if something goes wrong? Also how do I get there?",
    expect: {
      month: null,
      targets: ["hammerheads"],
      destinations: ["cocos"],
      concerns: ["remote", "getting_there"],
    },
  },
  {
    id: "rainy-season",
    text: "Philippines in August — is it rainy season / typhoons? Want macro.",
    expect: {
      month: 7,
      where: "country:Philippines",
      diveType: "macro",
      concerns: ["weather"],
    },
  },
  {
    id: "permits-socorro",
    text: "Socorro in March for giant mantas — any permits or park fees I should know about? AOW with 80 dives.",
    expect: {
      month: 2,
      targets: ["giant-oceanic-manta-ray"],
      cert: "advanced_plus_experience",
      destinations: ["socorro"],
      concerns: ["rules"],
    },
  },
  {
    id: "vis-cenotes",
    text: "cenotes in october, what's the vis like after the rain",
    expect: {
      month: 9,
      diveType: "cenote",
      destinations: ["yucatan-cenotes"],
      concerns: ["visibility", "weather"],
    },
  },
  {
    id: "moderate-current-ok",
    text: "Happy with moderate current but nothing ripping. Sharks and walls, January, Advanced.",
    expect: { month: 0, cert: "advanced", current: "moderate", diveType: "wall" },
  },
  {
    id: "humpbacks",
    text: "Humpback whales in the water, September or October, snorkelling is fine",
    expect: { month: 8, alsoMonths: [9], targets: ["humpback-whale"] },
  },
  {
    id: "visa-flights",
    text: "Maldives in February for mantas. Do I need a visa, and how much are flights?",
    expect: {
      month: 1,
      targets: ["manta-rays"],
      where: "country:Maldives",
      unsupported: ["visas", "flights"],
    },
  },
  {
    id: "hotel-rec",
    text: "Can you recommend a nice hotel near good diving in Cozumel for December?",
    expect: {
      month: 11,
      destinations: ["cozumel"],
      unsupported: ["accommodation"],
    },
  },
  {
    id: "no-month-goal-only",
    text: "Where can I see a mimic octopus?",
    expect: { month: null, targets: ["mimic-octopus"] },
  },
  {
    id: "sea-lions-playful",
    text: "Playing with sea lions, Mexico, ideally in November. Open water.",
    expect: {
      month: 10,
      targets: ["sea-lions"],
      cert: "open_water",
      where: "country:Mexico",
    },
  },
  // Added 2026-09-21 from a user report: "whale in March" set no animal, because
  // groups were only recognised by their plural label. The others are the same bug.
  {
    id: "reported-whale-singular",
    text: "whale in March",
    expect: { month: 2, targets: ["whales"] },
    note: "User report 2026-09-21.",
  },
  {
    id: "reported-dolphin-singular",
    text: "dolphin in May",
    expect: { month: 4, targets: ["dolphins"] },
    note: "Was bottlenose only, dropping spinner dolphins.",
  },
  {
    id: "reported-thresher-singular",
    text: "thresher shark, advanced",
    expect: { month: null, targets: ["thresher-sharks"], cert: "advanced" },
    note: "Was the genus-level entry only, dropping Malapascua's pelagic threshers.",
  },
  {
    id: "reported-devil-ray-singular",
    text: "devil ray in June",
    expect: { month: 5, targets: ["devil-rays"] },
    note: "Was sicklefin devil ray only.",
  },
  // Hard: colloquial, indirect, or needs world knowledge.
  {
    id: "hard-mantas-slang",
    text: "big ol' devilfish and mantas around new year's, got my advanced ticket last year",
    expect: { month: 0, targets: ["manta-rays", "devil-rays"], cert: "advanced" },
    hard: true,
  },
  {
    id: "hard-queasy",
    text: "Something with short boat rides please — I turn green on anything longer than an hour. Warm water, March.",
    expect: { month: 2, concerns: ["seasickness", "cold"] },
    hard: true,
  },
  {
    id: "hard-other-half",
    text: "My other half is a non-diver and will be bored stiff unless there's something to do in the water too. Late April, reef stuff.",
    expect: { month: 3, diveType: "reef", concerns: ["non_diver"] },
    hard: true,
  },
  {
    id: "hard-newbie-numbers",
    text: "I've got maybe 15 logged dives, all in a quarry. Thinking about somewhere with sharks in May but don't want to be out of my depth.",
    expect: { month: 4, cert: "open_water", concerns: ["experience"] },
    hard: true,
    note: "'out of my depth' is figurative: experience, not depth.",
  },
  {
    id: "hard-no-liveaboard",
    text: "Not a liveaboard person. Want hammerheads in the Red Sea, autumn-ish, Advanced.",
    expect: {
      month: null,
      targets: ["hammerheads"],
      cert: "advanced",
      where: "country:Egypt",
    },
    hard: true,
    note: "'Not a liveaboard' sets no format; 'autumn' is hemisphere-dependent.",
  },
  {
    id: "hard-busy",
    text: "Hate diving in a zoo with 10 other boats on the site. Whale sharks, Feb.",
    expect: { month: 1, targets: ["whale-shark"], concerns: ["crowds"] },
    hard: true,
  },
  {
    id: "hard-camera",
    text: "Bringing my housing and strobes — want critters, early December.",
    expect: { month: 11, diveType: "macro", concerns: ["photography"] },
    hard: true,
  },
  {
    id: "hard-chamber",
    text: "Is there a recompression chamber nearby? I'm a bit paranoid after a DCS scare. Galápagos, advanced, 200 dives.",
    expect: {
      month: null,
      cert: "advanced_plus_experience",
      destinations: ["galapagos"],
      concerns: ["remote"],
    },
    hard: true,
  },
  {
    id: "hard-drift-nerves",
    text: "Drift dives make me nervous — I lost my buddy in current once. Looking at Palau in March, AOW.",
    expect: {
      month: 2,
      cert: "advanced",
      destinations: ["palau"],
      concerns: ["current"],
    },
    hard: true,
    note: "Worry, not a stated limit: the concern, not the current filter.",
  },
  {
    id: "hard-typo",
    text: "whaleshark and mantas in sept, advnaced open water, not too cold pls",
    expect: {
      month: 8,
      targets: ["whale-shark", "manta-rays"],
      cert: "advanced",
      concerns: ["cold"],
    },
    hard: true,
  },
  {
    id: "hard-get-there",
    text: "How painful is it to actually get to Alor? Want pristine reefs, September, 100+ dives.",
    expect: {
      month: 8,
      cert: "advanced_plus_experience",
      destinations: ["alor"],
      concerns: ["getting_there"],
      diveType: "reef",
    },
    hard: true,
    note: "100+ dives with no card named: the experience rung, since the count clears every operator floor in the data.",
  },
  {
    id: "hard-ethics",
    text: "I'd rather not do baited shark dives. Tiger sharks, any month.",
    expect: { month: null, targets: ["tiger-shark"] },
    hard: true,
    note: "Baiting is already a flag on every verdict; no concern needed.",
  },
  {
    id: "hard-rules-touch",
    text: "Are there strict rules about touching or gloves? Cozumel in May, OW.",
    expect: {
      month: 4,
      cert: "open_water",
      destinations: ["cozumel"],
      concerns: ["rules"],
    },
    hard: true,
  },
  {
    id: "hard-deep",
    text: "Want to push deeper wrecks — 40m-ish — in Malta, October. Tec-curious, advanced plus nitrox.",
    expect: {
      month: 9,
      cert: "advanced",
      diveType: "wreck",
      destinations: ["malta"],
      concerns: ["depth"],
    },
    hard: true,
  },
  {
    id: "hard-empty",
    text: "Surprise me.",
    expect: { month: null },
    hard: true,
    note: "Nothing to understand: the answer is an empty brief, not an invented one.",
  },
];
