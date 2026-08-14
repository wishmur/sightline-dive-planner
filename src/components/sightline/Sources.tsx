import { useState } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { logEvent } from "@/lib/analytics";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceLinks({
  urls,
  context,
  destinationId,
}: {
  urls: string[];
  context: string;
  destinationId?: string;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent("click_source", { url, context, destination: destinationId })}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11.5px] font-medium text-foreground/75 transition hover:bg-primary/10 hover:text-primary"
          >
            {hostOf(url)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Compact provenance. Collapsed to "3 sources ↗" inline; the full list is
 * always one click away and nothing is removed.
 */
export function Sources({
  urls,
  context,
  destinationId,
  variant = "compact",
}: {
  urls: string[];
  context: string;
  destinationId?: string;
  variant?: "compact" | "list";
}) {
  const [open, setOpen] = useState(false);
  if (!urls?.length) return null;

  if (variant === "list") {
    return <SourceLinks urls={urls} context={context} destinationId={destinationId} />;
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline decoration-dotted underline-offset-4 transition hover:text-primary"
      >
        {urls.length} source{urls.length === 1 ? "" : "s"}
        <ArrowUpRight className="h-3 w-3" />
      </button>
      {open && (
        <div className="mt-2">
          <SourceLinks urls={urls} context={context} destinationId={destinationId} />
        </div>
      )}
    </div>
  );
}
