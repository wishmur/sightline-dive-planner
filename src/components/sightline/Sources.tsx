import { ExternalLink } from "lucide-react";
import { logEvent } from "@/lib/analytics";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Sources({
  urls,
  context,
  destinationId,
}: {
  urls: string[];
  context: string;
  destinationId?: string;
}) {
  if (!urls?.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logEvent("click_source", { url, context, destination: destinationId })}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-muted-foreground ring-1 ring-inset ring-white/10 transition hover:text-foreground"
          >
            {hostOf(url)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}