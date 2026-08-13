/**
 * Feedback entry points.
 * TODO: replace with the real Google Form URL when provided.
 */
export const FEEDBACK_FORM_URL = "https://forms.gle/PLACEHOLDER-sightline-feedback";

type FeedbackKind = "edit" | "request" | "feature";

/**
 * Builds a feedback URL, passing context through query params so the form can
 * be prefilled once the real Google Form (and its entry IDs) is wired up.
 */
export function feedbackUrl(kind: FeedbackKind = "edit", destinationName?: string) {
  const params = new URLSearchParams({ type: kind });
  if (destinationName) params.set("destination", destinationName);
  return `${FEEDBACK_FORM_URL}?${params.toString()}`;
}
