import { useState } from "react";

/** Long research notes collapse after a reasonable length, never truncate. */
export function ReadMore({
  text,
  limit = 240,
  className = "text-sm leading-relaxed text-muted-foreground",
}: {
  text: string;
  limit?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= limit) return <p className={className}>{text}</p>;

  const cut = text.slice(0, limit);
  const short = cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : limit);

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
