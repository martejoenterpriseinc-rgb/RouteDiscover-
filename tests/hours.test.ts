import assert from "node:assert/strict";
import { test } from "node:test";
import { hoursStatus, instantFor, timezoneFor, tzOffsetMinutes } from "../src/lib/hours";

const lancaster = { lat: 40.04, lng: -76.3 };
const denver = { lat: 39.74, lng: -104.99 };

test("time zone comes from the coordinates", () => {
  assert.equal(timezoneFor(lancaster.lat, lancaster.lng), "America/New_York");
  assert.equal(timezoneFor(denver.lat, denver.lng), "America/Denver");
  assert.equal(tzOffsetMinutes("America/New_York", new Date("2026-07-01T12:00:00Z")), -240);
  assert.equal(tzOffsetMinutes("America/New_York", new Date("2026-01-15T12:00:00Z")), -300);
  assert.equal(instantFor("America/Denver", "2026-10-23T09:00").toISOString(), "2026-10-23T15:00:00.000Z");
});

test("OpenStreetMap hours are evaluated in the place's zone", () => {
  // Friday 2026-10-23 10:00 in New York = 14:00Z
  const open = hoursStatus({ ...lancaster, openingHours: "Mo-Fr 09:00-17:00" }, new Date("2026-10-23T14:00:00Z"));
  assert.equal(open.openNow, true);
  assert.equal(open.label, "Open · closes 5 PM");
  // same instant is 08:00 in Denver → closed, opens 9 AM today
  const closed = hoursStatus({ ...denver, openingHours: "Mo-Fr 09:00-17:00" }, new Date("2026-10-23T14:00:00Z"));
  assert.equal(closed.openNow, false);
  assert.equal(closed.label, "Closed · opens 9 AM");
  // Saturday night → opens Monday
  const weekend = hoursStatus({ ...lancaster, openingHours: "Mo-Fr 09:00-17:00" }, new Date("2026-10-24T23:00:00Z"));
  assert.equal(weekend.openNow, false);
  assert.match(weekend.label, /opens Mon 9 AM/);
  assert.equal(hoursStatus({ ...lancaster, openingHours: "24/7" }, new Date()).label, "Open 24 hours");
});

test("Google weekday text and structured periods work too", () => {
  const text = "Monday: Closed; Tuesday: 6:00 AM – 4:00 PM; Friday: 6:00 AM – 4:00 PM";
  // Friday 2026-10-23 10:00 New York
  const fri = hoursStatus({ ...lancaster, openingHours: text }, new Date("2026-10-23T14:00:00Z"));
  assert.equal(fri.openNow, true);
  assert.equal(fri.label, "Open · closes 4 PM");
  // Monday 2026-10-26 10:00 New York → closed until Tuesday 6 AM
  const mon = hoursStatus({ ...lancaster, openingHours: text }, new Date("2026-10-26T14:00:00Z"));
  assert.equal(mon.openNow, false);
  assert.equal(mon.label, "Closed · opens Tue 6 AM");
  const periods = [{ open: { day: 5, hour: 8, minute: 0 }, close: { day: 5, hour: 22, minute: 30 } }];
  const g = hoursStatus({ ...lancaster, google: { periods, utcOffsetMinutes: -240 } }, new Date("2026-10-23T14:00:00Z"));
  assert.equal(g.openNow, true);
  assert.equal(g.label, "Open · closes 10:30 PM");
  assert.equal(hoursStatus({ ...lancaster }).openNow, null);
  assert.equal(hoursStatus({ ...lancaster, openingHours: "garbage ???" }).openNow, null);
});
