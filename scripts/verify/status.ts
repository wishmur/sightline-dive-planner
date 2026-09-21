/**
 * Verification status: `bun scripts/verify/status.ts`
 *
 * The curator's weekly check. Run `bun scripts/sources/fetch.ts` first to refresh
 * source hashes; then this reports what needs attention:
 *  - reviews whose quoted source changed since review (stale → recheck)
 *  - reviews past their recheck date (access/regulatory claims: 12 months,
 *    everything else: 36 months)
 *  - cited sources that could not be fetched (claims resting on them are unverifiable)
 *  - review coverage by claim type
 */
import { readFileSync } from "node:fs";
import { DESTINATIONS } from "@/lib/destinations";
import { claimsFor } from "@/lib/claims";
import { MANIFEST, type SourceRecord } from "../sources/fetch";
import { REVIEWS, type ReviewFile } from "./merge-reviews";

const RECHECK_MONTHS = { operating: 12, cert: 12, default: 36 };
const today = new Date(process.argv[2] ?? Date.now());

const manifest: SourceRecord[] = JSON.parse(readFileSync(MANIFEST, "utf8"));
const hashOf = new Map(manifest.map((r) => [r.url, r.contentHash]));
const file: ReviewFile = JSON.parse(readFileSync(REVIEWS, "utf8"));
const claims = DESTINATIONS.flatMap((d) => claimsFor(d));

const stale = Object.entries(file.reviews).filter(([, r]) =>
  Object.entries(r.sourceHashes).some(
    ([url, h]) => h !== "unknown" && hashOf.get(url) && hashOf.get(url) !== h,
  ),
);

const monthsSince = (iso: string) =>
  (today.getTime() - new Date(iso).getTime()) / (30.44 * 86400000);
const due = Object.entries(file.reviews).filter(([id, r]) => {
  const type = id.split("/")[1] as keyof typeof RECHECK_MONTHS;
  const limit = RECHECK_MONTHS[type] ?? RECHECK_MONTHS.default;
  return monthsSince(r.correction?.correctedAt ?? file.reviewedAt) > limit;
});

const unfetched = manifest.filter((r) => r.status !== "ok");
const claimsOnUnfetched = claims.filter(
  (c) =>
    !c.inheritedSources &&
    c.sources.length &&
    c.sources.every((u) => unfetched.some((r) => r.url === u)),
);

console.log(`\nVerification status · ${today.toISOString().slice(0, 10)}`);
console.log(
  `reviewed ${Object.keys(file.reviews).length} of ${claims.length} claims on ${file.reviewedAt}\n`,
);
console.log("coverage by claim type:");
for (const type of ["operating", "experience", "species", "highlight", "format", "cert"]) {
  const all = claims.filter((c) => c.type === type);
  const reviewed = all.filter((c) => file.reviews[c.id]);
  console.log(`  ${type.padEnd(11)} ${String(reviewed.length).padStart(3)} / ${all.length}`);
}
console.log(`\nstale (source changed since review): ${stale.length}`);
for (const [id] of stale) console.log(`  ${id}`);
console.log(`past recheck date: ${due.length}`);
for (const [id] of due) console.log(`  ${id}`);
console.log(`unfetchable sources: ${unfetched.length}`);
for (const r of unfetched)
  console.log(`  ${r.status.padEnd(18)} cited by ${String(r.citedBy).padStart(2)}  ${r.url}`);
console.log(`claims whose only sources are unfetchable: ${claimsOnUnfetched.length}`);
for (const c of claimsOnUnfetched) console.log(`  ${c.id}`);
