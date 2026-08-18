import { useEffect, useState } from "react";

export type SectionLink = { id: string; label: string };

/** Sticky, horizontally scrollable section nav with scroll-spy highlighting. */
export function SectionNav({ sections }: { sections: SectionLink[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: [0, 0.1, 0.5] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Sections on this page"
      className="theme-light sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <ul className="-mx-1 flex gap-1 overflow-x-auto py-2 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-28px),transparent)] [scrollbar-width:none] sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActive(s.id);
                }}
                aria-current={active === s.id ? "true" : undefined}
                className={`block whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition ${
                  active === s.id
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
