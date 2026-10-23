import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";

test("monthly cap: calls are counted and the cap throws so the provider chain falls back", async () => {
  const { consume, usageReport, CapReached, resetUsageCache, currentMonth } = await import("../src/lib/usage");
  resetUsageCache();
  assert.equal(await consume("google", "places", 3), 1);
  assert.equal(await consume("google", "places", 3), 2);
  assert.equal(await consume("google", "places", 3), 3);
  await assert.rejects(() => consume("google", "places", 3), (e: unknown) => e instanceof CapReached && e.kind === "places");
  // unlimited
  assert.equal(await consume("google", "routes", 0, 5), 5);
  const r = await usageReport();
  assert.equal(r.month, currentMonth());
  assert.equal(r.providers.google.places, 3);
  assert.equal(r.providers.google.routes, 5);
  // counters survive the in-process cache being dropped
  resetUsageCache();
  await assert.rejects(() => consume("google", "places", 3));
});
