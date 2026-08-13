import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { logEvent } from "@/lib/analytics";
import { search } from "@/lib/destinations";

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const results = search(q);

  function go(r: (typeof results)[number]) {
    if (r.kind === "species") {
      logEvent("search_species", { query: q, species: r.slug });
      navigate({ to: "/species/$slug", params: { slug: r.slug } });
    } else {
      logEvent("search_destination", { query: q, destination: r.slug });
      navigate({ to: "/destinations/$slug", params: { slug: r.slug } });
    }
  }

  return (
    <div className="relative w-full max-w-2xl">
      <div className="glass flex items-center gap-3 rounded-full px-6 py-4">
        <Search className="h-5 w-5 shrink-0 text-primary" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0]);
          }}
          placeholder="Search a species or a destination — manta ray, Komodo, Red Sea…"
          aria-label="Search species or destinations"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
      </div>

      {results.length > 0 && (
        <ul className="glass absolute z-30 mt-2 w-full overflow-hidden rounded-2xl py-2">
          {results.map((r) => (
            <li key={`${r.kind}-${r.slug}`}>
              <button
                onClick={() => go(r)}
                className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-white/[0.05]"
              >
                <span className="text-sm font-medium">{r.label}</span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {r.sub}
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    {r.kind}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}