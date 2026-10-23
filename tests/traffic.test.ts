import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";

test("owner stats: web traffic and conversion from page_view beacons", async () => {
  const [{ getDb, schema }, { track }, { getOwnerStats }, { createUser }, { grantPass }] = await Promise.all([
    import("../src/db/index"),
    import("../src/lib/events"),
    import("../src/lib/stats"),
    import("../src/lib/auth"),
    import("../src/lib/billing"),
  ]);
  const db = await getDb();
  const owner = await createUser({ email: "owner@example.com", name: "O", password: "roadtrip2026" });
  // four anonymous visitors; two reach /signup; one signs up and pays; the owner browses too
  const views: Array<[string, string, string, string?]> = [
    ["v1", "/", "", "phone"], ["v1", "/signup", "", "phone"], ["v1", "/app/home", "", "phone"],
    ["v2", "/", "news.ycombinator.com", "desktop"], ["v2", "/signup", "news.ycombinator.com", "desktop"],
    ["v3", "/", "", "desktop"], ["v4", "/terms", "google.com", "tablet"],
  ];
  for (const [anon, path, ref, device] of views) await track("page_view", { anonId: anon, meta: { path, ref, device } });
  await track("page_view", { userId: owner.id, anonId: "own", meta: { path: "/owner", ref: "", device: "desktop", owner: true } });
  await track("page_view", { anonId: "v5", meta: { path: "/", ref: "", device: "phone", utm_source: "facebook", utm_medium: "post", utm_campaign: "launch" } });
  await track("landing_view", { anonId: "v1" });
  await track("landing_view", { anonId: "v2" });
  const ann = await createUser({ email: "ann@example.com", name: "Ann", password: "roadtrip2026" });
  await grantPass(ann.id, { kind: "pass", days: 30, ref: "pi_test_1", amountCents: 499 });

  const s = await getOwnerStats(30);
  assert.equal(s.traffic.pageViews, 8, "owner's own view excluded");
  assert.equal(s.traffic.visitors, 5);
  assert.equal(s.traffic.topPages[0].label, "/");
  assert.equal(s.traffic.topPages[0].value, 4);
  assert.ok(s.traffic.referrers.some((r) => r.label === "news.ycombinator.com" && r.value === 2));
  assert.ok(s.traffic.referrers.some((r) => r.label === "Direct / none"));
  assert.deepEqual(s.traffic.campaigns, [{ label: "facebook / post / launch", value: 1 }]);
  assert.equal(s.traffic.devices.find((d) => d.label === "phone")?.value, 4);
  assert.equal(s.series.pageViews.reduce((t, p) => t + p.value, 0), 8);
  assert.equal(s.conversion.signupPageVisitors, 2);
  assert.equal(s.conversion.signups, 2, "owner + ann in range");
  assert.equal(s.conversion.paid, 1);
  assert.equal(s.conversion.visitorToSignupPct, 40, "2 of 5 visitors");
  assert.equal(s.conversion.signupPageToSignupPct, 100);
  assert.equal(s.conversion.signupToPaidPct, 50);
  assert.equal(s.conversion.visitorToPaidPct, 20);
  await db.delete(schema.events);
});
