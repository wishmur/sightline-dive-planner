/**
 * Blind labelling page for the second labeller:
 *
 *   bun evals/label/server.ts            → http://localhost:4321
 *   bun evals/label/server.ts --freeze   write evals/labels/sample.json (once)
 *
 * One destination at a time: every sentence of its record, and a column per
 * sampled concern. Tick the sentences a diver with that worry should read
 * before booking; tick nothing if the record doesn't address it. Progress is
 * saved to evals/labels/second-labeller.json after every destination, so it
 * can be done in several sittings. The gold is never loaded here.
 * Then: `bun evals/agreement.ts`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  LABELS_FILE,
  SAMPLE_FILE,
  buildSample,
  loadSample,
  samplePayload,
  validateLabels,
  type SecondLabels,
} from "./sample";

if (process.argv.includes("--freeze")) {
  if (existsSync(SAMPLE_FILE) && !process.argv.includes("--force")) {
    console.log(`${SAMPLE_FILE} already exists; the sample is frozen.`);
  } else {
    mkdirSync("evals/labels", { recursive: true });
    writeFileSync(SAMPLE_FILE, JSON.stringify(buildSample(), null, 2) + "\n");
    console.log(`wrote ${SAMPLE_FILE}`);
  }
  process.exit(0);
}

const sample = loadSample();
const payload = samplePayload(sample);

const PAGE = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Second labeller</title>
<style>
  :root { --bg:#f7f5f0; --card:#fff; --ink:#1d2a33; --muted:#64717a; --line:#e2ddd3; --accent:#0e6e74; }
  * { box-sizing:border-box } body { margin:0; font:15px/1.5 system-ui,sans-serif; background:var(--bg); color:var(--ink) }
  main { max-width:1100px; margin:0 auto; padding:24px 16px 80px }
  h1 { font-size:22px; margin:0 0 4px } .muted { color:var(--muted) } .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; margin-top:16px }
  dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 14px; margin:0 } dt { font-weight:600 } dd { margin:0 }
  table { width:100%; border-collapse:collapse } th, td { border-bottom:1px solid var(--line); padding:8px 6px; vertical-align:top; text-align:left }
  th.c, td.c { text-align:center; width:88px } thead th { position:sticky; top:0; background:var(--card); font-size:12px; z-index:1 }
  td.n { color:var(--muted); width:34px; font-variant-numeric:tabular-nums } .label { display:block; font-size:11px; color:var(--muted) }
  input[type=checkbox] { width:18px; height:18px; accent-color:var(--accent) }
  .bar { position:sticky; bottom:0; display:flex; gap:10px; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--card); border-top:1px solid var(--line) }
  button { font:inherit; padding:8px 16px; border-radius:999px; border:1px solid var(--line); background:var(--card); cursor:pointer } button.primary { background:var(--accent); color:#fff; border-color:var(--accent) }
  #status { font-size:13px }
</style></head><body><main>
<h1>Second labeller: concern evidence</h1>
<p class="muted">For each worry, tick the sentences a diver with that worry should read before booking this destination. Tick nothing if the record doesn't address it. Judge the sentence, not the destination. You won't see the existing labels.</p>
<div class="card"><label>Your name <input id="who" placeholder="e.g. Shailvi"></label></div>
<div class="card"><strong>The worries (same definitions the first labeller used)</strong><dl id="defs"></dl></div>
<div class="card"><h2 id="dest" style="margin:0 0 8px;font-size:18px"></h2><table><thead id="head"></thead><tbody id="rows"></tbody></table></div>
</main>
<div class="bar"><span id="status" class="muted"></span><span><button id="prev">Previous</button> <button id="next" class="primary">Save and next</button></span></div>
<script>
const data = ${JSON.stringify(payload).replace(/</g, "\\u003c")};
let state = { labeller: "", version: data.version, labels: {} };
let at = 0;
const key = (d, c) => d + "|" + c;
const byId = Object.fromEntries(data.concerns.map((c) => [c.id, c]));
document.getElementById("defs").innerHTML = data.concerns.map((c) => "<dt>" + c.label + "</dt><dd>" + c.definition + "</dd>").join("");
function render() {
  const d = data.destinations[at];
  document.getElementById("dest").textContent = (at + 1) + " of " + data.destinations.length + " · " + d.name;
  document.getElementById("head").innerHTML = "<tr><th></th><th>Sentence</th>" + d.concerns.map((c) => '<th class="c">' + byId[c].label + "</th>").join("") + "</tr>";
  document.getElementById("rows").innerHTML = d.sentences.map((s, i) =>
    "<tr><td class='n'>" + (i + 1) + "</td><td>" + escapeHtml(s.text) + "<span class='label'>" + escapeHtml(s.label) + "</span></td>" +
    d.concerns.map((c) => {
      const on = (state.labels[key(d.id, c)]?.relevant || []).includes(s.id);
      return "<td class='c'><input type='checkbox' aria-label='Sentence " + (i + 1) + ": " + escapeHtml(byId[c].label) + "' data-c='" + c + "' data-s='" + s.id + "'" + (on ? " checked" : "") + "></td>";
    }).join("") + "</tr>").join("");
  const done = data.destinations.filter((x) => x.concerns.every((c) => state.labels[key(x.id, c)]?.done)).length;
  document.getElementById("status").textContent = done + " of " + data.destinations.length + " destinations done · saved to evals/labels/second-labeller.json";
  document.getElementById("prev").disabled = at === 0;
  document.getElementById("next").textContent = at === data.destinations.length - 1 ? "Save" : "Save and next";
  window.scrollTo(0, 0);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]); }
function collect() {
  const d = data.destinations[at];
  for (const c of d.concerns) {
    const relevant = [...document.querySelectorAll("input[data-c='" + c + "']:checked")].map((x) => x.dataset.s);
    state.labels[key(d.id, c)] = { relevant, done: true, at: new Date().toISOString() };
  }
}
async function save() {
  state.labeller = document.getElementById("who").value.trim() || "unnamed";
  const r = await fetch("/api/labels", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
  if (!r.ok) { alert(await r.text()); return false; }
  return true;
}
document.getElementById("next").onclick = async () => { collect(); if (await save() && at < data.destinations.length - 1) at++; render(); };
document.getElementById("prev").onclick = () => { if (at > 0) at--; render(); };
fetch("/api/labels").then((r) => r.json()).then((saved) => {
  if (saved && saved.version === data.version) { state = saved; document.getElementById("who").value = saved.labeller || ""; }
  const first = data.destinations.findIndex((x) => !x.concerns.every((c) => state.labels[key(x.id, c)]?.done));
  at = first === -1 ? 0 : first;
  render();
});
</script></body></html>`;

const port = Number(process.env.PORT ?? 4321);
Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/")
      return new Response(PAGE, { headers: { "content-type": "text/html" } });
    if (url.pathname === "/api/labels" && req.method === "GET")
      return Response.json(
        existsSync(LABELS_FILE) ? JSON.parse(readFileSync(LABELS_FILE, "utf8")) : null,
      );
    if (url.pathname === "/api/labels" && req.method === "POST") {
      const labels = (await req.json()) as SecondLabels;
      const errors = validateLabels(sample, labels);
      if (errors.length) return new Response(errors.join("\n"), { status: 400 });
      const now = new Date().toISOString();
      const prev = existsSync(LABELS_FILE) ? JSON.parse(readFileSync(LABELS_FILE, "utf8")) : null;
      writeFileSync(
        LABELS_FILE,
        JSON.stringify({ ...labels, startedAt: prev?.startedAt ?? now, updatedAt: now }, null, 2) +
          "\n",
      );
      return new Response("saved");
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(
  `Second labeller: http://localhost:${port}  (sample ${sample.version}, ${sample.pairs.length} pairs)`,
);
