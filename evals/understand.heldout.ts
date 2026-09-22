/**
 * Held-out "Describe your trip" cases. Written 2026-09-21 AFTER the rules parser
 * had been fitted to evals/understand.gold.ts (which makes that set dev data),
 * deliberately in different words, and frozen before the first run. The rules
 * parser is not to be changed in response to these; they are the honest number.
 * Same labelling conventions as understand.gold.ts.
 */
import type { UnderstandCase } from "./understand.gold";

export const HELDOUT_CASES: UnderstandCase[] = [
  {
    id: "ho-reef-mantas-baa",
    text: "Heading to the Maldives mid-August, desperate to see the manta feeding frenzy. I'm PADI Advanced.",
    expect: { month: 7, targets: ["manta-rays"], cert: "advanced", where: "country:Maldives" },
  },
  {
    id: "ho-oceanic-whitetip",
    text: "Oceanic whitetips are my bucket list shark. Can go October. 70 dives, advanced cert.",
    expect: { month: 9, targets: ["oceanic-whitetip-shark"], cert: "advanced_plus_experience" },
  },
  {
    id: "ho-honeymoon",
    text: "Honeymoon in June, I dive and she doesn't, somewhere tropical where she can snorkel with turtles while I dive.",
    expect: { month: 5, targets: ["sea-turtles"], concerns: ["non_diver"] },
  },
  {
    id: "ho-cheap-and-easy",
    text: "Budget trip, easy conditions, new-ish diver (Open Water, 12 dives). January.",
    expect: {
      month: 0,
      cert: "open_water",
      concerns: ["experience"],
      unsupported: ["cost"],
    },
  },
  {
    id: "ho-great-hammer",
    text: "great hammerheads in the bahamas, december or january",
    expect: {
      month: 11,
      alsoMonths: [0],
      targets: ["great-hammerhead"],
      where: "country:Bahamas",
    },
  },
  {
    id: "ho-sea-state",
    text: "I get motion sickness pretty badly. Want to see sharks and mantas in Indonesia, April.",
    expect: {
      month: 3,
      targets: ["manta-rays"],
      where: "country:Indonesia",
      concerns: ["seasickness"],
    },
  },
  {
    id: "ho-cold-feet",
    text: "I freeze easily — what wetsuit thickness would I need for Galápagos in August?",
    expect: { month: 7, destinations: ["galapagos"], concerns: ["cold"] },
  },
  {
    id: "ho-frogfish-lembeh",
    text: "Lembeh critter hunting in Sept, want hairy frogfish and mimic octopus, I shoot a Sony in a Nauticam housing",
    expect: {
      month: 8,
      targets: ["hairy-frogfish", "mimic-octopus"],
      diveType: "macro",
      destinations: ["lembeh"],
      concerns: ["photography"],
    },
  },
  {
    id: "ho-evac",
    text: "How remote is Tubbataha — what happens if someone gets bent out there?",
    expect: { month: null, destinations: ["tubbataha"], concerns: ["remote"] },
  },
  {
    id: "ho-permit-galapagos",
    text: "Do I need a special permit or pay a park entrance fee for Galapagos diving?",
    expect: { month: null, destinations: ["galapagos"], concerns: ["rules"] },
  },
  {
    id: "ho-vis",
    text: "Is the visibility any good at Cocos in the rainy season?",
    expect: { month: null, destinations: ["cocos"], concerns: ["visibility", "weather"] },
  },
  {
    id: "ho-weather-komodo",
    text: "Komodo in late January — will the weather be a problem?",
    expect: { month: 0, destinations: ["komodo"], concerns: ["weather"] },
  },
  {
    id: "ho-crowds-manta-point",
    text: "Nusa Penida mantas but I hate crowded sites. March. OW.",
    expect: {
      month: 2,
      targets: ["manta-rays"],
      cert: "open_water",
      destinations: ["nusa-penida"],
      concerns: ["crowds"],
    },
  },
  {
    id: "ho-wreck-red-sea",
    text: "Thistlegorm wreck in November, advanced with 35 dives, how deep is it?",
    expect: {
      month: 10,
      cert: "advanced",
      diveType: "wreck",
      destinations: ["red-sea-north"],
      concerns: ["depth"],
    },
  },
  {
    id: "ho-logistics-socorro",
    text: "How long does it take to get out to Socorro and where do the boats leave from?",
    expect: { month: null, destinations: ["socorro"], concerns: ["getting_there"] },
  },
  {
    id: "ho-sealions-lapaz",
    text: "Sea lions at La Paz in July?",
    expect: { month: 6, targets: ["sea-lions"], destinations: ["la-paz"] },
  },
  {
    id: "ho-whale-shark-ningaloo",
    text: "Ningaloo whale sharks, May, we're snorkellers not divers",
    expect: { month: 4, targets: ["whale-shark"], destinations: ["ningaloo"] },
    note: "The travellers themselves snorkel; no separate non-diving companion.",
  },
  {
    id: "ho-cenote-cert",
    text: "Can open water divers do the cenotes or do I need a cavern cert? Going in February.",
    expect: {
      month: 1,
      cert: "open_water",
      diveType: "cenote",
      destinations: ["yucatan-cenotes"],
      concerns: ["experience"],
    },
  },
  {
    id: "ho-drysuit-iceland",
    text: "Silfra in March — I've never dived dry. Is that a problem?",
    expect: { month: 2, destinations: ["silfra"], concerns: ["cold", "experience"] },
  },
  {
    id: "ho-strong-current-ok",
    text: "Love ripping current and big schools of fish. Pelagics, November, 300 dives.",
    expect: { month: 10, cert: "advanced_plus_experience", diveType: "pelagic" },
  },
  {
    id: "ho-no-strong-current",
    text: "Nothing with strong currents please, I'm a nervous diver. Turtles and easy reef in the Philippines, April.",
    expect: {
      month: 3,
      targets: ["sea-turtles"],
      current: "mild",
      diveType: "reef",
      where: "country:Philippines",
      concerns: ["experience"],
    },
  },
  {
    id: "ho-dolphins-rangiroa",
    text: "Rangiroa dolphins — best month?",
    expect: { month: null, targets: ["dolphins"], destinations: ["rangiroa"] },
  },
  {
    id: "ho-humpbacks-tonga-miss",
    text: "Swimming with humpbacks in French Polynesia, September, I'm a divemaster",
    expect: {
      month: 8,
      targets: ["humpback-whale"],
      cert: "advanced_plus_experience",
      where: "country:French Polynesia",
    },
  },
  {
    id: "ho-kid",
    text: "Family trip with a 12 year old who only snorkels, Easter holidays, Egypt",
    expect: { month: null, where: "country:Egypt", concerns: ["non_diver"] },
    note: "Easter moves between March and April: no month.",
  },
  {
    id: "ho-nitrox",
    text: "Do I need nitrox for Cocos? Will be diving 4 times a day.",
    expect: { month: null, destinations: ["cocos"], concerns: ["depth"] },
  },
  {
    id: "ho-short-boats",
    text: "Prefer shore diving or short boat rides, macro, warm, any time.",
    expect: {
      month: null,
      format: "shore_access",
      diveType: "macro",
      concerns: ["seasickness", "cold"],
    },
  },
  {
    id: "ho-operator",
    text: "Who's the best liveaboard operator for Raja Ampat in November and what do they charge?",
    expect: {
      month: 10,
      format: "liveaboard",
      destinations: ["raja-ampat"],
      unsupported: ["operator_quality", "cost"],
    },
  },
  {
    id: "ho-threshers-malapascua",
    text: "malapascua threshers, i have like 40 dives and my AOW, is the dawn dive deep?",
    expect: {
      month: null,
      targets: ["thresher-sharks"],
      cert: "advanced",
      destinations: ["malapascua"],
      concerns: ["depth"],
    },
  },
  {
    id: "ho-mola-alor",
    text: "Mola and hammerheads in Alor, October, how cold does it get?",
    expect: {
      month: 9,
      targets: ["ocean-sunfish", "hammerheads"],
      destinations: ["alor"],
      concerns: ["cold"],
    },
  },
  {
    id: "ho-vague",
    text: "Where should I go diving next year?",
    expect: { month: null },
  },
];
