import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, CATEGORIES_AZ } from "../src/lib/categories";
import { demoRoute } from "../src/lib/providers/routing";

test("categories list for checklists is alphabetical and complete", () => {
  const labels = CATEGORIES_AZ.map((c) => c.label);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
  assert.equal(CATEGORIES_AZ.length, CATEGORIES.length);
  assert.ok(labels.includes("Landmarks & Monuments"));
  assert.ok(labels.includes("Historic Buildings"));
});

test("demo routing drives through ticked stops in order", () => {
  const chicago = { label: "Chicago, IL", lat: 41.8781, lng: -87.6298 };
  const lancaster = { label: "Lancaster, PA", lat: 40.0379, lng: -76.3055 };
  const direct = demoRoute(chicago, lancaster);
  const viaPittsburgh = demoRoute(chicago, lancaster, [{ label: "Pittsburgh, PA", lat: 40.4406, lng: -79.9959 }]);
  assert.equal(viaPittsburgh.via?.length, 1);
  assert.ok(viaPittsburgh.geometry.length > direct.geometry.length / 2);
  // The route passes within a few miles of the stop.
  const near = viaPittsburgh.geometry.some((p) => Math.abs(p.lat - 40.4406) < 0.1 && Math.abs(p.lng + 79.9959) < 0.1);
  assert.ok(near, "route should pass through Pittsburgh");
  assert.ok(viaPittsburgh.distanceMiles > 0);
  assert.deepEqual(viaPittsburgh.geometry[0], direct.geometry[0]);
  assert.deepEqual(viaPittsburgh.geometry.at(-1), direct.geometry.at(-1));
});
