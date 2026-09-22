/**
 * Known, reasoned exceptions to the integrity rules. Integrity tests compare the
 * data against these lists exactly, so any NEW anomaly (or a fixed one) fails
 * loudly and has to be triaged. Each entry says what it is and what to do.
 */

/**
 * Listings that are never peak or shoulder. Most are deliberate negative
 * evidence ("recorded but unpredictable", "not actually here"), which is why
 * the fit engine treats them as not a reason to go rather than hiding them.
 */
export const NEVER_PRESENT: Record<string, string> = {
  "tulamben/species/bumphead-parrotfish":
    "Sources disagree; school reportedly gone since COVID. Encoded unreliable.",
  "tulamben/species/blacktip-reef-shark": "Occasional; 'not a reason to come'.",
  "raja-ampat/species/whale-shark":
    "Explicit disambiguation: the aggregation is in Cenderawasih Bay, not Raja Ampat.",
  "tubbataha/species/whale-shark": "Recorded but not predictable; no season assigned.",
  "moalboal/species/pelagic-thresher-shark": "Occasional.",
  "yucatan-cenotes/species/blind-cave-fish":
    "SEMANTICS: 'resident' but 'off' all year — month states are undefined for residents.",
  "silfra/species/dwarf-arctic-char": "SEMANTICS: 'resident' but 'off' all year — same issue.",
  "red-sea-north/species/whitetip-reef-shark": "Occasional.",
  "red-sea-brothers/species/thresher-shark": "Occasional, genus-level.",
  "coral-sea/species/scalloped-hammerhead": "Occasional.",
};

/**
 * Internal research-log text leaking into user-facing notes ("See OQ-30.",
 * "RESOLVED BY TIER 1."). Eight were removed on 2026-09-21 by
 * scripts/verify/apply-corrections.ts; none should come back.
 */
export const RESEARCH_LOG_MARKERS: string[] = [];

/** Species listings with no note at all. Tracked as a count; lower is better. */
export const EMPTY_SPECIES_NOTES = 30;

/**
 * Structural provenance gaps (not per-record):
 * - trip_formats carry no sources or confidence, yet hold many of the biggest
 *   catches ("format mismatch"). Claims inherit destination-level sources.
 * - required_certs carry no sources; they inherit conditions sources.
 * - best_months_overall has no sources or confidence at all.
 * - last_verified is identical (2026-08-13) for every record: it is the dataset
 *   build date, not a per-record review date.
 * - Socorro: species note says reachable "Nov-May", operating note says Nov–Jun
 *   (CONANP). The operating calendar follows CONANP.
 */
export const STRUCTURAL_GAPS = [
  "trip_formats_unsourced",
  "required_certs_unsourced",
  "best_months_overall_unsourced",
  "last_verified_is_build_date",
  "socorro_species_vs_operating_window",
];
