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
  assert.equal(categorize({ amenity: "fuel", brand: "Buc-ee's" }), "travel");
  assert.equal(categorize({ amenity: "fuel", name: "Love's Travel Stop" }), "travel");
  assert.equal(categorize({ amenity: "fuel", shop: "convenience" }), "travel");
  assert.equal(categorize({ amenity: "fuel" }), "fuel");
  assert.equal(categorize({ highway: "services" }), "travel");
  assert.equal(categorize({ amenity: "restaurant", cuisine: "buffet" }), "buffets");
  assert.equal(categorize({ amenity: "restaurant", name: "Shady Maple Smorgasbord" }), "buffets");
  assert.equal(categorize({ amenity: "restaurant", name: "Joe's Diner" }), "food");
  assert.equal(categorize({ shop: "gift" }), "souvenirs");
  assert.equal(categorize({ shop: "convenience", name: "Gettysburg Souvenirs" }), "souvenirs", "name wins over a generic shop tag");
  assert.equal(categorize({ shop: "chocolate" }), "specialty");
  assert.equal(categorize({ shop: "mall" }), "shopping");
});

test("parseCategories drops unknown ids", () => {
  assert.deepEqual(parseCategories("food, nope ,coffee"), ["food", "coffee"]);
  assert.deepEqual(parseCategories(""), []);
});
