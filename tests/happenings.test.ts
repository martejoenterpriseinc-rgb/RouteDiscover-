import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";

test("seasonal sample events are generated around today and found along a route", async () => {
  const { demoHappenings, searchHappenings, submitHappening, moderateHappening, listHappeningsForOwner, pendingHappeningCount } = await import("../src/lib/happenings");
  const { eventPhase, fmtEventWhen } = await import("../src/lib/event-kinds");
  const now = new Date("2026-10-23T12:00:00Z");
  const demo = demoHappenings(now);
  const haunted = demo.filter((h) => h.kind === "haunted" && eventPhase(h, now) !== "past");
  assert.ok(haunted.length >= 2, "haunted houses are on in late October");
  const lights = demo.find((h) => h.kind === "holiday_lights" && h.title.startsWith("Hershey Sweet Lights") && new Date(h.startsAt).getUTCFullYear() === 2026)!;
  assert.equal(eventPhase(lights, now), "upcoming");
  const sale = demo.find((h) => h.kind === "yard_sale" && /127/.test(h.title) && eventPhase(h, now) === "upcoming")!;
  assert.equal(new Date(sale.startsAt).getUTCFullYear(), 2027, "next year's 127 sale is the upcoming one");
  assert.match(fmtEventWhen(haunted[0]), /PM/);
  assert.equal(haunted[0].timezone, "America/New_York");

  // around Hershey during AACA week
  const r = await searchHappenings({ kind: "point", center: { lat: 40.28, lng: -76.65 }, radiusMiles: 25, from: new Date("2026-10-07T00:00:00Z"), to: new Date("2026-10-11T00:00:00Z") });
  assert.ok(r.data.some((h) => h.kind === "car_show" && /AACA/.test(h.title)), "AACA meet found");
  assert.ok(r.data.every((h) => (h.distanceMiles ?? 0) <= 25));
  const onlyHaunted = await searchHappenings({ kind: "point", center: { lat: 40.04, lng: -76.3 }, radiusMiles: 40, from: now, to: new Date("2026-10-31T00:00:00Z"), kinds: ["haunted"] });
  assert.ok(onlyHaunted.data.length >= 1 && onlyHaunted.data.every((h) => h.kind === "haunted"));

  // community submission → pending → approved → appears in search
  const { createUser } = await import("../src/lib/auth");
  const u = await createUser({ email: "owner@example.com", name: "O", password: "roadtrip2026" });
  const row = await submitHappening({ title: "Strasburg Cruise-In", kind: "car_show", description: "", venue: "Main St", address: "Strasburg, PA", lat: 39.983, lng: -76.184, startsAt: new Date("2026-10-24T22:00:00Z"), endsAt: new Date("2026-10-25T01:00:00Z"), allDay: false, url: "", price: "Free" }, u.id, false);
  assert.equal(row.status, "pending");
  assert.equal(await pendingHappeningCount(), 1);
  const before = await searchHappenings({ kind: "point", center: { lat: 39.98, lng: -76.18 }, radiusMiles: 5, from: now, to: new Date("2026-10-26T00:00:00Z") });
  assert.ok(!before.data.some((h) => h.title === "Strasburg Cruise-In"), "pending events stay hidden");
  await moderateHappening(row.id, "approved");
  const after = await searchHappenings({ kind: "point", center: { lat: 39.98, lng: -76.18 }, radiusMiles: 5, from: now, to: new Date("2026-10-26T00:00:00Z") });
  assert.ok(after.data.some((h) => h.title === "Strasburg Cruise-In" && h.source === "community"));
  assert.equal((await listHappeningsForOwner("approved")).length, 1);
});
