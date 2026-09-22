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
    for (const f of readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await pg.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  });

  test("browsers can log events, but not forge the server's llm_call events", async () => {
    const insert = async (type: string) => {
      await pg.exec("set role anon");
      try {
        await pg.query(
          "insert into public.events (session_id, event_type, payload) values ('s', $1, '{}')",
          [type],
        );
        return "ok";
      } catch (e) {
        return String(e);
      } finally {
        await pg.exec("reset role");
      }
    };
    expect(await insert("view_destination")).toBe("ok");
    expect(await insert("llm_call")).toMatch(/row-level security/i);
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
