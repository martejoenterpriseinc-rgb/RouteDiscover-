import assert from "node:assert/strict";
import { test } from "node:test";
import { categorize, parseCategories } from "../src/lib/categories";

test("categorize maps OSM tags to app categories", () => {
  assert.equal(categorize({ amenity: "restaurant" }), "food");
  assert.equal(categorize({ amenity: "cafe" }), "coffee");
  assert.equal(categorize({ tourism: "museum" }), "attractions");
  assert.equal(categorize({ tourism: "hotel" }), "lodging");
  assert.equal(categorize({ shop: "antiques" }), "antiques");
  assert.equal(categorize({ amenity: "charging_station" }), "ev");
  assert.equal(categorize({ historic: "memorial", tourism: "attraction" }), "historic");
  assert.equal(categorize({ building: "yes" }), null);
});

test("parseCategories drops unknown ids", () => {
  assert.deepEqual(parseCategories("food, nope ,coffee"), ["food", "coffee"]);
  assert.deepEqual(parseCategories(""), []);
});
