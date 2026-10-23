import assert from "node:assert/strict";
import { test } from "node:test";
import { GOOGLE_TYPES, categoryForTypes, samplePoints, toPlace } from "../src/lib/providers/google";

test("every category maps to at least one Google place type", () => {
  for (const [cat, types] of Object.entries(GOOGLE_TYPES)) assert.ok(types.length > 0, cat);
  assert.equal(categoryForTypes(["restaurant", "food", "point_of_interest"]), "food");
  assert.equal(categoryForTypes(["campground"]), "campgrounds");
  assert.equal(categoryForTypes(["point_of_interest"]), null);
});

test("toPlace carries the Google baseline into a Place", () => {
  const p = toPlace({
    id: "abc",
    displayName: { text: "Lancaster Central Market" },
    formattedAddress: "23 N Market St, Lancaster, PA 17603",
    location: { latitude: 40.0383, longitude: -76.3066 },
    primaryType: "market",
    types: ["market", "point_of_interest"],
    rating: 4.7,
    userRatingCount: 5123,
    websiteUri: "https://centralmarketlancaster.com",
    regularOpeningHours: { weekdayDescriptions: ["Tuesday: 6:00 AM – 4:00 PM", "Friday: 6:00 AM – 4:00 PM"] },
    photos: [{ name: "places/abc/photos/p1" }],
    reviews: [{ rating: 5, text: { text: "Go early." }, relativePublishTimeDescription: "a week ago", authorAttribution: { displayName: "Pat" } }],
  });
  assert.ok(p);
  assert.equal(p.id, "google-abc");
  assert.equal(p.category, "shopping");
  assert.equal(p.provider, "google");
  assert.match(p.openingHours ?? "", /Tuesday/);
  assert.equal(p.google?.rating, 4.7);
  assert.equal(p.google?.reviews?.[0].author, "Pat");
  assert.deepEqual(p.google?.photoNames, ["places/abc/photos/p1"]);
});

test("corridor sampling respects the request budget and widens the radius to keep coverage", () => {
  const route = [
    { lat: 41.8781, lng: -87.6298 },
    { lat: 41.5, lng: -84 },
    { lat: 40.4, lng: -80 },
    { lat: 40.0379, lng: -76.3055 },
  ];
  const tight = samplePoints(route, 10, 60);
  assert.ok(tight.points.length > 12, `got ${tight.points.length}`);
  const budget = samplePoints(route, 10, 12);
  assert.equal(budget.points.length, 12);
  assert.ok(budget.radiusMiles > 10 && budget.radiusMiles <= 31.07, `radius ${budget.radiusMiles}`);
});
