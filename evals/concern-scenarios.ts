/**
 * Goldens for concerns in the fit engine. Written 2026-09-21 BEFORE the concern
 * verdicts existed in src/lib/fit.ts, then frozen.
 *
 * Only three concerns change ranking, and only through facts that are exact in
 * the data. Each one is a caveat (it can demote a fit, never exclude or promote):
 * - seasickness → "Liveaboard only" when every trip format sleeps on a boat;
 * - non_diver  → "No snorkel option" when no format or highlight offers one;
 * - cold       → "Cold water" when the record puts a temperature at or below
 *   22°C in the trip month (month words, or winter/summer by hemisphere), or the
 *   warmest water of the year is 22°C or less. With no month: coldest ≤ 20°C.
 * Every other concern is evidence only (lib/retrieve.ts).
 *
 * Added 2026-09-21, after UI testing showed Komodo in September as a clean fit
 * for a seasick diver while its own quoted note says the crossing is rough then
 * (written before the rule existed):
 * - seasickness → "Rough water" when a sea-state sentence (rough, swell, high
 *   waves, wind) names the trip month, by month words or by hemisphere season.
 */
import type { Filters } from "@/lib/filters";

export type ConcernScenario = {
  id: string;
  why: string;
  brief: Partial<Filters>;
  flagged?: Record<string, string[]>;
  notFlagged?: Record<string, string[]>;
  /** Destinations that must rank above others in the results. */
  before?: [string, string][];
};

export const CONCERN_SCENARIOS: ConcernScenario[] = [
  {
    id: "whale-sharks-seasick",
    why: "Socorro and Cocos are reachable only by a 20–36 hour crossing; Ningaloo and La Paz are day boats or shore.",
    brief: { species: ["whale-shark"], concerns: ["seasickness"] },
    flagged: { socorro: ["liveaboard_only"], cocos: ["liveaboard_only"] },
    notFlagged: {
      ningaloo: ["liveaboard_only"],
      "la-paz": ["liveaboard_only"],
      "ari-atoll": ["liveaboard_only"],
      galapagos: ["liveaboard_only"],
    },
    before: [["la-paz", "socorro"]],
  },
  {
    id: "whale-sharks-non-diver",
    why: "A snorkelling partner can join Ningaloo, La Paz and Ari; Cocos states there is no snorkel product.",
    brief: { species: ["whale-shark"], concerns: ["non_diver"] },
    flagged: { cocos: ["no_snorkel"], socorro: ["no_snorkel"] },
    notFlagged: {
      ningaloo: ["no_snorkel"],
      "la-paz": ["no_snorkel"],
      "ari-atoll": ["no_snorkel"],
    },
  },
  {
    id: "mantas-august-cold",
    why: "Nusa Penida's Jul–Oct upwelling drops to 16–19°C; Komodo's cold south gives no month; Baa is warm.",
    brief: { species: ["manta-rays"], month: "7", concerns: ["cold"] },
    flagged: { "nusa-penida": ["cold_water"] },
    notFlagged: { "baa-atoll": ["cold_water"], kona: ["cold_water"] },
  },
  {
    id: "galapagos-march-vs-august-cold",
    why: "Galápagos cool season is Jun–Nov (16–18°C). March is the warm season: no flag.",
    brief: { query: "galapagos", month: "2", concerns: ["cold"] },
    notFlagged: { galapagos: ["cold_water"] },
  },
  {
    id: "galapagos-august-cold",
    why: "August is inside the Jun–Nov cool season.",
    brief: { query: "galapagos", month: "7", concerns: ["cold"] },
    flagged: { galapagos: ["cold_water"] },
  },
  {
    id: "red-sea-january-cold",
    why: "'Winter water drops to 21-23C': northern-hemisphere winter includes January.",
    brief: { query: "red sea", month: "0", concerns: ["cold"] },
    flagged: { "red-sea-north": ["cold_water"] },
  },
  {
    id: "aliwal-july-cold",
    why: "'Winter water drops to around 19C' in the southern hemisphere means June–August.",
    brief: { query: "aliwal", month: "6", concerns: ["cold"] },
    flagged: { "aliwal-shoal": ["cold_water"] },
  },
  {
    id: "silfra-cold-any-month",
    why: "2–4°C in every month.",
    brief: { query: "silfra", month: "5", concerns: ["cold"] },
    flagged: { silfra: ["cold_water"] },
  },
  {
    id: "komodo-september-seasick",
    why: "Mid-May to early September south-east winds make the southern sites and the crossing rough.",
    brief: { query: "komodo", month: "8", concerns: ["seasickness"] },
    flagged: { komodo: ["rough_water"] },
  },
  {
    id: "komodo-january-seasick",
    why: "Nothing in the record puts rough water in January.",
    brief: { query: "komodo", month: "0", concerns: ["seasickness"] },
    notFlagged: { komodo: ["rough_water"] },
  },
  {
    id: "nusa-penida-january-seasick",
    why: "Dec-Mar brings rough surface conditions and same-day cancellations.",
    brief: { query: "nusa penida", month: "0", concerns: ["seasickness"] },
    flagged: { "nusa-penida": ["rough_water"] },
  },
  {
    id: "nusa-penida-august-seasick",
    why: "August is outside the Dec-Mar swell.",
    brief: { query: "nusa penida", month: "7", concerns: ["seasickness"] },
    notFlagged: { "nusa-penida": ["rough_water"] },
  },
  {
    id: "raja-ampat-july-seasick",
    why: "May-Sep southern monsoon: strong winds and high waves; July and August worst.",
    brief: { query: "raja ampat", month: "6", concerns: ["seasickness"] },
    flagged: { "raja-ampat": ["rough_water"] },
  },
  {
    id: "rough-water-needs-the-concern",
    why: "Sea state is a caveat only for a diver who raised seasickness.",
    brief: { query: "komodo", month: "8" },
    notFlagged: { komodo: ["rough_water"] },
  },
  {
    id: "no-concern-no-flags",
    why: "Concern verdicts appear only when the diver raises the concern.",
    brief: { species: ["whale-shark"] },
    notFlagged: {
      socorro: ["liveaboard_only", "no_snorkel", "cold_water"],
      cocos: ["liveaboard_only", "no_snorkel"],
    },
  },
];
