import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Anchor, ExternalLink, Plus } from "lucide-react";
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

type OperatorRow = {
  id: string;
  name: string;
  website: string | null;
  blurb: string | null;
  source_url: string | null;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SuggestOperatorDialog({
  destinationId,
  destinationName,
  variant = "link",
  onSubmitted,
}: {
  destinationId: string;
  destinationName: string;
  variant?: "link" | "primary";
  onSubmitted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [blurb, setBlurb] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("operators").insert({
      destination_id: destinationId,
      name: name.trim(),
      website: website.trim() || null,
      blurb: blurb.trim() || null,
      email: email.trim() || null,
      session_id: getSessionId(),
      status: "pending",
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send that — please try again.");
      return;
    }
    toast.success("Thanks — we'll review it before it goes live.");
    setName("");
    setWebsite("");
    setBlurb("");
    setEmail("");
    setOpen(false);
    onSubmitted?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          variant === "primary"
            ? "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            : "inline-flex items-center gap-2 text-sm text-muted-foreground underline decoration-dotted underline-offset-4 transition hover:text-foreground"
        }
      >
        <Plus className="h-4 w-4" /> Suggest an operator
      </DialogTrigger>
      <DialogContent className="theme-light sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Suggest an operator</DialogTitle>
          <DialogDescription>
            Who should divers book with in {destinationName}? Submissions are reviewed before they go
            live.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            placeholder="Operator name"
            className="w-full rounded-full bg-secondary px-5 py-3 text-sm outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-primary/50"
          />
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website (optional)"
            className="w-full rounded-full bg-secondary px-5 py-3 text-sm outline-none ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-primary/50"
          />
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="What do they offer? Why recommend them?"
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
            {saving ? "Sending…" : "Submit operator"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Operators({
  destinationId,
  destinationName,
}: {
  destinationId: string;
  destinationName: string;
}) {
  const [rows, setRows] = useState<OperatorRow[] | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("operators")
      .select("id,name,website,blurb,source_url")
      .eq("destination_id", destinationId)
      .eq("status", "published")
      .order("name")
      .then(({ data }) => {
        if (active) setRows(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [destinationId]);

  const empty = rows !== null && rows.length === 0;

  return (
    <div>
      {rows === null && <p className="text-sm text-muted-foreground">Loading operators…</p>}

      {empty && (
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border lg:p-8">
          <p className="text-sm text-muted-foreground">
            No crowd-suggested operators yet for {destinationName}.
          </p>
          <div className="mt-4">
            <SuggestOperatorDialog
              destinationId={destinationId}
              destinationName={destinationName}
              variant="primary"
            />
          </div>
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((o) => (
              <li
                key={o.id}
                className="flex flex-col rounded-3xl bg-card p-6 shadow-sm ring-1 ring-inset ring-border"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Anchor className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-snug text-foreground">{o.name}</p>
                    {o.website && (
                      <a
                        href={o.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline decoration-dotted underline-offset-4"
                      >
                        {hostOf(o.website)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                {o.blurb && (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{o.blurb}</p>
                )}
                {o.source_url && (
                  <a
                    href={o.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {hostOf(o.source_url)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <SuggestOperatorDialog
              destinationId={destinationId}
              destinationName={destinationName}
            />
          </div>
        </>
      )}
    </div>
  );
}