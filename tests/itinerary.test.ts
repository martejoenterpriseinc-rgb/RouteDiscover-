import assert from "node:assert/strict";
import { test } from "node:test";
import { planDay, stopsFor } from "../src/lib/itinerary";
import { tripDays } from "../src/lib/dates";
import type { TripRecord } from "../src/lib/trips-client";
import type { TripStop } from "../src/db/schema";

const stop = (id: string, lat: number, lng: number, extra: Partial<TripStop> = {}): TripStop => ({ id, name: id, category: "attractions", lat, lng, addedAt: `2026-01-01T00:00:0${id.length}Z`, ...extra });

test("tripDays lists every date of the trip, capped", () => {
  assert.deepEqual(tripDays("2026-11-06", "2026-11-08"), ["2026-11-06", "2026-11-07", "2026-11-08"]);
  assert.equal(tripDays("2026-01-01", "2026-12-31").length, 21);
});

test("stopsFor splits the drive from each day and orders a day by time", () => {
  const trip = { startDate: "2026-11-06", endDate: "2026-11-07", stops: [
    stop("a", 40, -76, { alongMiles: 10 }),
    stop("b", 40.1, -76.1, { day: "2026-11-06", time: "14:00" }),
    stop("c", 40.2, -76.2, { day: "2026-11-06", time: "09:30" }),
    stop("d", 40.3, -76.3, { day: "2026-11-06" }),
  ] } as unknown as TripRecord;
  assert.deepEqual(stopsFor(trip, "route").map((s) => s.id), ["a"]);
  assert.deepEqual(stopsFor(trip, "2026-11-06").map((s) => s.id), ["c", "b", "d"], "timed stops first, untimed last");
  assert.deepEqual(stopsFor(trip, "2026-11-07"), []);
});

test("planDay visits the nearest stop next and spaces the times out", () => {
  const home = { lat: 40.04, lng: -76.3 };
  const far = stop("far", 40.5, -76.0);
  const near = stop("near", 40.05, -76.31);
  const mid = stop("mid", 40.2, -76.2);
  const planned = planDay([far, near, mid], home);
  assert.deepEqual(planned.map((s) => s.id), ["near", "mid", "far"]);
  assert.equal(planned[0].time, "09:00");
  assert.ok(planned[1].time! > planned[0].time!, "times increase");
  assert.ok(planned[2].time! > planned[1].time!);
});
