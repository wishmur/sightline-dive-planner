import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/analytics";

export type FeedbackKind = "edit" | "request" | "feature";

const COPY: Record<
  FeedbackKind,
  { title: string; description: (name?: string) => string; placeholder: string; cta: string }
> = {
  edit: {
    title: "Report a correction",
    description: (name) =>
      name
        ? `Tell us what looks wrong about ${name}. Local knowledge beats our sources.`
        : "Tell us what looks wrong. Local knowledge beats our sources.",
    placeholder: "What's inaccurate, missing, or out of date?",
    cta: "Send correction",
  },
  request: {
    title: "Request a destination",
    description: () =>
      "Which destination should Sightline cover? Name it in the message and add anything worth knowing.",
    placeholder: "Destination name, and why it's worth comparing…",
    cta: "Send request",
  },
  feature: {
    title: "Suggest a feature",
    description: () => "What would make planning a dive trip easier?",
    placeholder: "Describe the idea…",
    cta: "Send suggestion",
  },
};

export function FeedbackDialog({
  destinationId,
  destinationName,
  kind = "edit",
  trigger,
  triggerClassName,
  onOpenTrigger,
}: {
  destinationId?: string;
  destinationName?: string;
  kind?: FeedbackKind;
  trigger?: ReactNode;
  triggerClassName?: string;
  onOpenTrigger?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const copy = COPY[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("feedback").insert({
      session_id: getSessionId(),
      destination_id: destinationId ?? null,
      kind,
      message: message.trim(),
      email: email.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send that — please try again.");
      return;
    }
    toast.success("Thanks — your message was sent.");
    setMessage("");
    setEmail("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        onClick={onOpenTrigger}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 text-sm text-muted-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground"
        }
      >
        {trigger ?? (
          <>
            <AlertCircle className="h-4 w-4" /> Something wrong here?
          </>
        )}
      </DialogTrigger>
      <DialogContent className="theme-light sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description(destinationName)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={copy.placeholder}
            className="w-full rounded-2xl bg-secondary p-4 text-sm outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-primary/50"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-full bg-secondary px-5 py-3 text-sm outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Sending…" : copy.cta}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
