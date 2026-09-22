/**
 * The Supabase migrations and the queries that read their data, checked
 * together in embedded Postgres: every migration applies in order, and every
 * query in docs/metrics.sql runs against the resulting schema.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  // Supabase's API roles, which the migrations grant to.
  await pg.exec("create role anon; create role authenticated; create role service_role;");
});
afterAll(async () => {
  await pg?.close();
});

describe("schema", () => {
  test("every migration applies, in order", async () => {
    for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort())
      await pg.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  });

  test("every query in docs/metrics.sql runs", async () => {
    const queries = readFileSync("docs/metrics.sql", "utf8")
      .split(/;\s*\n/)
      .map((q) => q.trim())
      .filter((q) => /\bselect\b/i.test(q));
    expect(queries.length).toBeGreaterThanOrEqual(16);
    for (const q of queries) {
      let error = "";
      try {
        await pg.query(q);
      } catch (e) {
        error = String(e);
      }
      expect({ query: q.split("\n")[0], error }).toEqual({ query: q.split("\n")[0], error: "" });
    }
  });
});
