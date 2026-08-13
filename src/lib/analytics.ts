import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "search_species"
  | "search_destination"
  | "view_destination"
  | "click_map_pin"
  | "filter_month"
  | "click_source";

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
    .insert({ session_id: getSessionId(), event_type, payload })
    .then(({ error }) => {
      if (error) console.error("event log failed", error.message);
    });
}