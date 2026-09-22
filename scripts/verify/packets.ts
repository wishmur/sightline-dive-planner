/**
 * Build review packets for claim verification: `bun scripts/verify/packets.ts [k]`
 *
 * For each priority claim and each of its cited sources, retrieve the top-k
 * passages (claim-scoped BM25). A reviewer — or the LLM verifier, when a key is
 * configured — judges support from these packets.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { DESTINATIONS, getDestination } from "@/lib/destinations";
import { claimsFor, type Claim } from "@/lib/claims";
import { CATCHES } from "../../evals/catches.gold";
import { bm25, loadPassages, tokenize } from "../lib/retrieval";

/** The claims the product leans on most: every access note plus every critical catch. */
export function priorityClaims(): Claim[] {
  const ids = new Set<string>();
  for (const d of DESTINATIONS) ids.add(`${d.id}/operating`);
  for (const c of CATCHES) for (const r of c.required) for (const id of [r].flat()) ids.add(id);
  return [...ids]
    .map((id) => claimsFor(getDestination(id.split("/")[0]!)!).find((c) => c.id === id)!)
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function claimQuery(c: Claim) {
  return tokenize(`${c.label} ${c.text}`);
}

if (import.meta.main) {
  const k = Number(process.argv[2] ?? 3);
  const passages = loadPassages();
  const claims = priorityClaims();
  const lines: string[] = [];
  let pairs = 0;
  let unfetched = 0;
  for (const c of claims) {
    lines.push(
      `\n######## ${c.id}  [${c.confidence ?? "no confidence"}]${c.inheritedSources ? "  (inherits destination sources)" : ""}`,
    );
    lines.push(`CLAIM: ${c.text}`);
    if (c.inheritedSources) {
      // Format/cert notes have no sources of their own: rank across all of the
      // destination's sources jointly rather than page by page.
      pairs++;
      const pool = c.sources.flatMap((u) => passages.get(u) ?? []);
      for (const r of bm25(claimQuery(c), pool).slice(0, k + 1)) {
        lines.push(
          `  -- ${r.passage.url} [${r.passage.index} · ${r.score.toFixed(1)}] ${r.passage.text.replace(/\n/g, " / ")}`,
        );
      }
      continue;
    }
    for (const url of c.sources) {
      pairs++;
      const ps = passages.get(url);
      if (!ps) {
        unfetched++;
        lines.push(`  -- ${url}: NOT FETCHED`);
        continue;
      }
      const top = bm25(claimQuery(c), ps).slice(0, k);
      lines.push(`  -- ${url} (${ps.length} passages)`);
      for (const r of top)
        lines.push(
          `     [${r.passage.index} · ${r.score.toFixed(1)}] ${r.passage.text.replace(/\n/g, " / ")}`,
        );
    }
  }
  mkdirSync("data/.source-cache", { recursive: true });
  writeFileSync("data/.source-cache/packets.txt", lines.join("\n"));
  console.log(
    `${claims.length} priority claims · ${pairs} claim–source pairs · ${unfetched} unfetched`,
  );
}
