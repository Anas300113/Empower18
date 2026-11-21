import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { activePublishedConditions } from "./db/opportunities";

describe("published opportunity timestamp predicates", () => {
  it("serializes Date bind values through their timestamp column encoders", () => {
    const now = new Date("2026-11-21T13:00:00.000Z");
    const conditions = activePublishedConditions(now);
    expect(conditions).toBeDefined();
    if (!conditions) throw new Error("Expected publication conditions");

    const query = new PgDialect().sqlToQuery(conditions);
    expect(query.params.slice(-3)).toEqual([
      "2026-11-21T13:00:00.000Z",
      "2026-11-21T13:00:00.000Z",
      "2026-11-21T13:00:00.000Z",
    ]);
    expect(query.params.every(value => typeof value !== "object")).toBe(true);
  });
});
