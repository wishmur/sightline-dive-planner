/**
 * Evidence-selection gold ("critical catches"). For a brief and a destination,
 * the claim units a diver MUST see in the "For your trip" panel to avoid a
 * costly mistake. Labelled from the notes BEFORE the selector was written.
 *
 * `required` entries are either a claim ID or an any-of group: when the same
 * catch is stated in more than one unit, surfacing any one of them counts.
 * This scores recall of catches, not of units, so redundancy isn't rewarded.
 *
 * Claim IDs: <dest>/species/<name-slug> · <dest>/highlight/<rank> ·
 * <dest>/format/<index> · <dest>/operating · <dest>/experience · <dest>/cert/<cert>
 */
import type { Filters } from "@/lib/filters";

export type CatchCase = {
  id: string;
  destination: string;
  brief: Partial<Filters>;
  required: (string | string[])[];
  why: string;
  /**
   * Set on cases written after a selector rule was designed in response to a
   * miss. Reported separately: they are not an unbiased test of that rule.
   */
  addedAfter?: "month-linking";
};

export const CATCHES: CatchCase[] = [
  {
    id: "komodo-mantas-jan",
    destination: "komodo",
    brief: { species: ["manta-rays"], month: "0" },
    required: ["komodo/species/reef-manta-ray", ["komodo/format/1", "komodo/format/0"]],
    why: "Manta Alley (south) is the January manta site; land-based day boats focus on the north/central park. (Originally also required the 'worst access' operating note, which source verification showed was wrong.)",
  },
  {
    id: "komodo-jul-advanced",
    destination: "komodo",
    brief: { month: "6", cert: "advanced" },
    required: ["komodo/operating", "komodo/experience"],
    why: "Southern sites rough and hard to reach Jun–Aug (corrected from Dec–Feb); downcurrents, reef hooks, cold south.",
  },
  {
    id: "komodo-mild-current",
    destination: "komodo",
    brief: { current: "mild" },
    required: ["komodo/experience"],
    why: "Strong current with downcurrents at the pinnacles.",
  },
  {
    id: "nusa-penida-mantas-jan",
    destination: "nusa-penida",
    brief: { species: ["manta-rays"], month: "0" },
    required: [["nusa-penida/species/reef-manta-ray", "nusa-penida/operating"]],
    why: "Dec–Mar swell cancels Manta Point trips; book buffer days.",
  },
  {
    id: "nusa-penida-mola-aug",
    destination: "nusa-penida",
    brief: { species: ["ocean-sunfish"], month: "7", cert: "advanced" },
    required: ["nusa-penida/species/ocean-sunfish", "nusa-penida/experience"],
    why: "~1 in 3 dives, budget days; 16–19°C thermocline, 3mm not enough; unpredictable downcurrents at Crystal Bay.",
  },
  {
    id: "socorro-mantas-sep",
    destination: "socorro",
    brief: { species: ["manta-rays"], month: "8" },
    required: ["socorro/operating"],
    why: "Park closed Jul–Oct by regulation even though mantas are resident.",
  },
  {
    id: "socorro-whale-shark",
    destination: "socorro",
    brief: { species: ["whale-shark"] },
    required: ["socorro/species/whale-shark"],
    why: "Sources contradict; 'do not book around this'.",
  },
  {
    id: "socorro-advanced",
    destination: "socorro",
    brief: { cert: "advanced" },
    required: ["socorro/experience"],
    why: "Advanced plus 50–100 dives expected; not a first liveaboard; two days from a chamber.",
  },
  {
    id: "tubbataha-whitetips-jul",
    destination: "tubbataha",
    brief: { species: ["whitetip-reef-shark"], month: "6" },
    required: ["tubbataha/operating"],
    why: "Unreachable outside mid-March to mid-June; boats sell out 9–12 months ahead.",
  },
  {
    id: "cabo-pulmo-bull-sharks-mar",
    destination: "cabo-pulmo",
    brief: { species: ["bull-shark"], month: "2" },
    required: [
      ["cabo-pulmo/species/bull-shark", "cabo-pulmo/highlight/3"],
      "cabo-pulmo/experience",
    ],
    why: "Sources contradict on the window; March is 18°C; El Vencedor access is by lottery.",
  },
  {
    id: "cabo-pulmo-whale-shark-jan",
    destination: "cabo-pulmo",
    brief: { species: ["whale-shark"], month: "0" },
    required: ["cabo-pulmo/species/whale-shark"],
    why: "Occasional here; the reliable product is La Paz and it's a snorkel activity.",
  },
  {
    id: "malapascua-threshers",
    destination: "malapascua",
    brief: { species: ["thresher-sharks"] },
    required: [["malapascua/highlight/1", "malapascua/species/pelagic-thresher-shark"]],
    why: "Time of day, not month, is the constraint: dawn departures around 04:00.",
  },
  {
    id: "malapascua-threshers-open-water",
    destination: "malapascua",
    brief: { species: ["thresher-sharks"], cert: "open_water" },
    required: ["malapascua/experience"],
    why: "Depth of the thresher dive is contested; encoded Advanced because under-gating is the dangerous error.",
  },
  {
    id: "tulamben-bumpheads",
    destination: "tulamben",
    brief: { species: ["bumphead-parrotfish"] },
    required: ["tulamben/species/bumphead-parrotfish"],
    why: "The resident school disappeared post-COVID; sources disagree.",
  },
  {
    id: "tulamben-day-trip",
    destination: "tulamben",
    brief: { format: "day_trip_from_hub" },
    required: ["tulamben/format/2"],
    why: "3–3.5h drive each way lands you at peak crowding; materially worse than staying.",
  },
  {
    id: "malta-open-water",
    destination: "malta",
    brief: { cert: "open_water" },
    required: ["malta/cert/trimix", "malta/experience"],
    why: "OW can dive Malta, but the deep wartime wrecks are trimix dives; deep-wreck fatalities.",
  },
  {
    id: "silfra-open-water",
    destination: "silfra",
    brief: { cert: "open_water" },
    required: [["silfra/cert/drysuit", "silfra/experience"]],
    why: "Drysuit certification (or 10 logged drysuit dives) is a hard gate.",
  },
  {
    id: "cocos-hammerheads-feb",
    destination: "cocos",
    brief: { species: ["hammerheads"], month: "1" },
    required: [["cocos/species/scalloped-hammerhead", "cocos/operating"]],
    why: "Schooling peaks Jun–Oct when visibility is worst: the central booking trade-off.",
  },
  {
    id: "cocos-advanced",
    destination: "cocos",
    brief: { cert: "advanced" },
    required: ["cocos/experience"],
    why: "Strong current, surge, independent SMB deployment, two days from a chamber.",
  },
  {
    id: "baa-mantas-sep",
    destination: "baa-atoll",
    brief: { species: ["manta-rays"], month: "8" },
    required: [["baa-atoll/highlight/1", "baa-atoll/format/0"], "baa-atoll/species/reef-manta-ray"],
    why: "Hanifaru is snorkel-only (scuba banned); the moon matters more than the month.",
  },
  {
    id: "baa-whale-sharks-aug",
    destination: "baa-atoll",
    brief: { species: ["whale-shark"], month: "7" },
    required: [["baa-atoll/highlight/2", "baa-atoll/highlight/1", "baa-atoll/format/0"]],
    why: "Same snorkel-only rule and tokens as the mantas.",
  },
  {
    id: "raja-ampat-whale-sharks",
    destination: "raja-ampat",
    brief: { species: ["whale-shark"] },
    required: ["raja-ampat/species/whale-shark"],
    why: "Not in Raja Ampat: Cenderawasih Bay is ~3 days east and the sharks are hand-fed.",
  },
  {
    id: "raja-ampat-mantas-jul",
    destination: "raja-ampat",
    brief: { species: ["manta-rays"], month: "6" },
    required: ["raja-ampat/operating"],
    why: "Southern monsoon; July and August are the worst; much of the liveaboard fleet repositions.",
  },
  {
    id: "raja-ampat-moderate-current",
    destination: "raja-ampat",
    brief: { cert: "advanced", current: "moderate" },
    required: ["raja-ampat/experience"],
    why: "Current is the whole story; reef hooks and negative entries; not a first tropical trip.",
  },
  {
    id: "alor-hammerheads",
    destination: "alor",
    brief: { species: ["hammerheads"] },
    required: ["alor/species/scalloped-hammerhead"],
    why: "Commercial-consensus claim, windows disagree: 'Do not book Alor solely for this.'",
  },
  {
    id: "galapagos-hammerheads",
    destination: "galapagos",
    brief: { species: ["hammerheads"] },
    required: [
      ["galapagos/format/1", "galapagos/highlight/1"],
      "galapagos/species/scalloped-hammerhead",
    ],
    why: "Darwin & Wolf need a liveaboard; schooling is strongest in the warm season, against common assumption.",
  },
  {
    id: "galapagos-whale-sharks-sep",
    destination: "galapagos",
    brief: { species: ["whale-shark"], month: "8" },
    required: ["galapagos/species/whale-shark", ["galapagos/format/1", "galapagos/highlight/1"]],
    why: "Almost exclusively at Darwin, which no land-based day boat reaches.",
  },
  {
    id: "galapagos-land-based-hammerheads",
    destination: "galapagos",
    brief: { species: ["hammerheads"], format: "land_based_daily" },
    required: ["galapagos/format/1"],
    why: "The expensive format mismatch: day boats never reach Darwin and Wolf.",
  },
  {
    id: "ningaloo-whale-sharks-may",
    destination: "ningaloo",
    brief: { species: ["whale-shark"], month: "4" },
    required: [["ningaloo/highlight/1", "ningaloo/format/0"]],
    why: "Snorkel only; a dive certification buys you nothing for whale sharks here.",
  },
  {
    id: "tiger-beach-tigers",
    destination: "tiger-beach",
    brief: { species: ["tiger-shark"] },
    required: [["tiger-beach/highlight/1", "tiger-beach/species/tiger-shark"]],
    why: "Baited encounter; 'usually buried in the small print'.",
  },
  {
    id: "azores-blue-sharks-aug",
    destination: "azores",
    brief: { species: ["blue-shark"], month: "7" },
    required: [["azores/highlight/1", "azores/species/blue-shark"]],
    why: "Chummed open-water encounter.",
  },
  // Added after the month-linking rule was designed (see addedAfter).
  {
    id: "galapagos-august-cold",
    destination: "galapagos",
    brief: { month: "7" },
    required: ["galapagos/experience"],
    why: "Cool season (Jun–Nov) drops to 16–18°C with sharp thermoclines.",
    addedAfter: "month-linking",
  },
  {
    id: "socorro-humpbacks-march-cold",
    destination: "socorro",
    brief: { species: ["humpback-whale"], month: "2" },
    required: ["socorro/experience"],
    why: "Water drops to 21–23°C in the Feb–Apr whale window.",
    addedAfter: "month-linking",
  },
  {
    id: "cocos-august-visibility",
    destination: "cocos",
    brief: { month: "7" },
    required: ["cocos/operating"],
    why: "Jun–Oct: best hammerhead schooling, worst visibility (9–20m). Open, so no access verdict pulls it in.",
    addedAfter: "month-linking",
  },
];
