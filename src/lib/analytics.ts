import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "search_species"
  | "search_destination"
  | "view_destination"
  | "click_map_pin"
  | "filter_month"
  | "click_source"
  // Trip fit: what was asked, what was shown, and whether the panel helped.
  | "fit_results"
  | "fit_panel_view"
  | "fit_feedback"
  // Provenance: did anyone open the evidence behind a claim?
  | "verification_open"
  // Plain-language planning: what was understood (never the raw text), which
  // concerns people raise, whether questions get answered, and comparisons.
  | "trip_described"
  | "concern_toggle"
  | "concern_evidence_open"
  | "ask_question"
  | "compare_toggle"
  | "compare_open";

const KEY = "sightline_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function logEvent(event_type: EventType, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  void supabase
    .from("events")
    .insert({ session_id: getSessionId(), event_type, payload: payload as never })
    .then(({ error }) => {
      if (error) console.error("event log failed", error.message);
    });
}
