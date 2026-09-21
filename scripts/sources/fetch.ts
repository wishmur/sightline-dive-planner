/**
 * Snapshot every source the dataset cites: `bun scripts/sources/fetch.ts`
 *
 * - Honest user agent; robots.txt is respected; blocks are recorded, never evaded.
 * - Page text is copyrighted, so snapshots live in data/.source-cache/ (gitignored).
 * - Only the manifest is committed: status, fetch date, content hash, word count.
 *   Re-running and comparing hashes is how the freshness loop detects that a
 *   source changed and its claims need re-checking.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { DESTINATIONS } from "@/lib/destinations";
import { claimsFor } from "@/lib/claims";

export const CACHE_DIR = "data/.source-cache";
export const MANIFEST = "data/sources/manifest.json";
const UA = "SightlineSourceCheck/0.1 (+https://sightline-dive-planner.lovable.app/about)";

export type SourceRecord = {
  url: string;
  status: "ok" | "http_error" | "robots_disallowed" | "network_error" | "no_text";
  httpStatus?: number;
  fetchedAt: string;
  contentHash?: string;
  words?: number;
  title?: string;
  /** How many claims cite this URL. */
  citedBy: number;
  previousHash?: string;
  changed?: boolean;
};

export const hashOf = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
export const cachePath = (url: string) => `${CACHE_DIR}/${hashOf(url)}.txt`;

export function citedUrls() {
  const counts = new Map<string, number>();
  for (const d of DESTINATIONS) {
    for (const c of claimsFor(d)) {
      if (c.inheritedSources) continue;
      for (const u of c.sources) counts.set(u, (counts.get(u) ?? 0) + 1);
    }
    for (const u of d.sources) if (!counts.has(u)) counts.set(u, 0);
  }
  return counts;
}

const robotsCache = new Map<string, { allow: string[]; disallow: string[] }>();

async function robotsFor(origin: string) {
  const hit = robotsCache.get(origin);
  if (hit) return hit;
  const rules = { allow: [] as string[], disallow: [] as string[] };
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      let applies = false;
      for (const raw of (await res.text()).split(/\r?\n/)) {
        const line = raw.replace(/#.*/, "").trim();
        const [k, ...rest] = line.split(":");
        const key = k?.toLowerCase().trim();
        const value = rest.join(":").trim();
        if (key === "user-agent") applies = value === "*" || /sightline/i.test(value);
        else if (applies && key === "disallow" && value) rules.disallow.push(value);
        else if (applies && key === "allow" && value) rules.allow.push(value);
      }
    }
  } catch {
    // No robots.txt reachable: treat as allowed.
  }
  robotsCache.set(origin, rules);
  return rules;
}

async function allowedByRobots(url: string) {
  const u = new URL(url);
  const rules = await robotsFor(u.origin);
  const path = u.pathname + u.search;
  const longest = (list: string[]) =>
    Math.max(-1, ...list.filter((p) => path.startsWith(p.replace(/\*$/, ""))).map((p) => p.length));
  return longest(rules.allow) >= longest(rules.disallow);
}

const BLOCK_END =
  /<\/(p|div|li|h[1-6]|tr|td|th|dt|dd|section|article|header|figcaption|blockquote)>/gi;

export function extractText(html: string, url: string) {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  const title = article?.title ?? "";
  // Readability's textContent glues block elements together ("HighlightsDiscover…");
  // re-parse its HTML with a newline after every block so sentences stay intact.
  const blocked = (article?.content ?? "").replace(/<br\s*\/?>/gi, "\n").replace(BLOCK_END, "$&\n");
  const text = (parseHTML(`<html><body>${blocked}</body></html>`).document.body.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text, url };
}

async function snapshot(
  url: string,
  citedBy: number,
  previous?: SourceRecord,
): Promise<SourceRecord> {
  const base = {
    url,
    citedBy,
    fetchedAt: new Date().toISOString(),
    previousHash: previous?.contentHash,
  };
  if (!(await allowedByRobots(url))) return { ...base, status: "robots_disallowed" };
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return { ...base, status: "http_error", httpStatus: res.status };
    const html = await res.text();
    const { title, text } = extractText(html, url);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 80) return { ...base, status: "no_text", httpStatus: res.status, words };
    await writeFile(cachePath(url), text);
    const contentHash = hashOf(text);
    return {
      ...base,
      status: "ok",
      httpStatus: res.status,
      contentHash,
      words,
      title,
      changed: previous?.contentHash ? previous.contentHash !== contentHash : undefined,
    };
  } catch (e) {
    return { ...base, status: "network_error" };
  }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir("data/sources", { recursive: true });
  const previous: SourceRecord[] = existsSync(MANIFEST)
    ? JSON.parse(await readFile(MANIFEST, "utf8"))
    : [];
  const prevByUrl = new Map(previous.map((r) => [r.url, r]));
  const urls = [...citedUrls().entries()];

  const out: SourceRecord[] = [];
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        out.push(await snapshot(next[0], next[1], prevByUrl.get(next[0])));
      }
    }),
  );
  out.sort((a, b) => a.url.localeCompare(b.url));
  await writeFile(MANIFEST, JSON.stringify(out, null, 2) + "\n");

  const by = (s: SourceRecord["status"]) => out.filter((r) => r.status === s);
  console.log(
    `${out.length} sources · ok ${by("ok").length} · http_error ${by("http_error").length} · robots ${by("robots_disallowed").length} · network ${by("network_error").length} · no_text ${by("no_text").length}`,
  );
  const changed = out.filter((r) => r.changed);
  if (changed.length)
    console.log(`changed since last snapshot: ${changed.map((r) => r.url).join(", ")}`);
  for (const r of out.filter((r) => r.status !== "ok")) {
    console.log(
      `  ${r.status}${r.httpStatus ? ` ${r.httpStatus}` : ""}  cited by ${r.citedBy}  ${r.url}`,
    );
  }
}

if (import.meta.main) await main();
