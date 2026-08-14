import { useState } from "react";

/** Long research notes collapse after a reasonable length, never truncate. */
export function ReadMore({
  text,
  limit = 240,
  className = "text-sm leading-relaxed text-muted-foreground",
  block = false,
}: {
  text: string;
  limit?: number;
  className?: string;
  /** Render the toggle as its own link on a line below the paragraph. */
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= limit) return <p className={className}>{text}</p>;

  const cut = text.slice(0, limit);
  const short = cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : limit);

  if (block) {
    return (
      <div>
        <p className={className}>{open ? text : `${short}…`}</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex text-xs font-semibold text-primary underline decoration-dotted underline-offset-4 transition hover:no-underline"
        >
          {open ? "Read less" : "Read more"}
        </button>
      </div>
    );
  }

  return (
    <p className={className}>
      {open ? text : `${short}… `}
      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-1 font-medium text-primary underline decoration-dotted underline-offset-4 hover:no-underline"
      >
        {open ? "Read less" : "Read more"}
      </button>
    </p>
  );
}
