import { useState } from "react";
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

export function FeedbackDialog({
  destinationId,
  destinationName,
}: {
  destinationId: string;
  destinationName: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("feedback").insert({
      session_id: getSessionId(),
      destination_id: destinationId,
      message: message.trim(),
      email: email.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send that — please try again.");
      return;
    }
    toast.success("Thanks — your correction was sent.");
    setMessage("");
    setEmail("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 text-sm text-muted-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground">
        <AlertCircle className="h-4 w-4" /> Something wrong here?
      </DialogTrigger>
      <DialogContent className="glass border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Report a correction</DialogTitle>
          <DialogDescription>
            Tell us what looks wrong about {destinationName}. Local knowledge beats our sources.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="What's inaccurate, missing, or out of date?"
            className="w-full rounded-2xl bg-white/[0.04] p-4 text-sm outline-none ring-1 ring-inset ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full rounded-full bg-white/[0.04] px-5 py-3 text-sm outline-none ring-1 ring-inset ring-white/10 placeholder:text-muted-foreground focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Sending…" : "Send correction"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}