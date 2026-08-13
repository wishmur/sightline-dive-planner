import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { COLLECTIONS, COLLECTION_COUNTS, type Collection } from "@/lib/collections";

/** Rotates through a category's existing scene images with a gentle crossfade. */
function CardImagery({
  collection,
  paused,
  delayMs,
}: {
  collection: Collection;
  paused: boolean;
  delayMs: number;
}) {
  const images = collection.images.length > 0 ? collection.images : [collection.image];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (paused || images.length < 2) return;
    const start = window.setTimeout(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 7000 + delayMs);
    return () => window.clearTimeout(start);
  }, [paused, index, images.length, delayMs]);

  return (
    <span aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          width={1024}
          height={768}
          className={`discovery-drift absolute inset-0 h-full w-full object-cover transition-[opacity,filter] duration-[1200ms] ease-in-out group-hover:brightness-110 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </span>
  );
}

export function DiscoveryCards({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="-mx-6 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
      {COLLECTIONS.map((c, i) => (
        <motion.button
          key={c.id}
          onClick={() => onSelect(c.id)}
          onMouseEnter={() => setHovered(c.id)}
          onMouseLeave={() => setHovered((h) => (h === c.id ? null : h))}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
          aria-pressed={activeId === c.id}
          className={`group relative isolate flex h-64 w-[78%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-3xl p-5 text-left ring-1 ring-inset transition-[box-shadow] hover:ring-primary/50 sm:w-auto ${
            activeId === c.id ? "ring-2 ring-primary" : "ring-border"
          }`}
        >
          <CardImagery collection={c} paused={hovered === c.id} delayMs={i * 1600} />
          <span
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,16,32,0.15)_0%,rgba(6,16,32,0.88)_78%)]"
          />
          <span className="font-display text-xl text-foreground transition-colors group-hover:text-primary">
            {c.title}
          </span>
          <span className="mt-1.5 text-xs text-muted-foreground">{c.items.join(" · ")}</span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition group-hover:decoration-primary">
            Explore {COLLECTION_COUNTS[c.id]} destinations
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </motion.button>
      ))}
    </div>
  );
}
