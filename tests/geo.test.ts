import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodePolyline,
  distanceToRoute,
  encodePolyline,
  haversineMiles,
  indexRoute,
  pointAtMile,
  simplifyTo,
} from "../src/lib/geo";

const chicago = { lat: 41.8781, lng: -87.6298 };
const lancaster = { lat: 40.0379, lng: -76.3055 };

test("haversine: Chicago to Lancaster is roughly 600 miles as the crow flies", () => {
  const d = haversineMiles(chicago, lancaster);
  assert.ok(d > 580 && d < 620, `got ${d}`);
});

test("distanceToRoute: detour and mile marker along a straight west-east leg", () => {
  const route = indexRoute([
    { lat: 40, lng: -80 },
    { lat: 40, lng: -79 },
    { lat: 40, lng: -78 },
  ]);
  const { detourMiles, alongMiles } = distanceToRoute({ lat: 40.1, lng: -79 }, route);
  assert.ok(Math.abs(detourMiles - 6.9) < 0.2, `detour ${detourMiles}`);
  assert.ok(Math.abs(alongMiles - route.totalMiles / 2) < 0.5, `along ${alongMiles}`);
});

test("distanceToRoute: a point beyond the end clamps to the last vertex", () => {
  const route = indexRoute([
    { lat: 40, lng: -80 },
    { lat: 40, lng: -79 },
  ]);
  const r = distanceToRoute({ lat: 40, lng: -78 }, route);
  assert.ok(Math.abs(r.alongMiles - route.totalMiles) < 1e-6);
  assert.ok(Math.abs(r.detourMiles - haversineMiles({ lat: 40, lng: -78 }, { lat: 40, lng: -79 })) < 0.2);
});

test("polyline encode/decode round-trips at 5 decimal places", () => {
  const pts = [chicago, { lat: 41.5934, lng: -87.3464 }, lancaster];
  const enc = encodePolyline(pts);
  const dec = decodePolyline(enc);
  assert.equal(dec.length, pts.length);
  for (let i = 0; i < pts.length; i++) {
    assert.ok(Math.abs(dec[i].lat - pts[i].lat) < 1e-5);
    assert.ok(Math.abs(dec[i].lng - pts[i].lng) < 1e-5);
  }
});

test("simplifyTo keeps endpoints and respects the cap", () => {
  const pts = Array.from({ length: 2000 }, (_, i) => ({
    lat: 40 + Math.sin(i / 50) * 0.3,
    lng: -88 + i * 0.006,
  }));
  const out = simplifyTo(pts, 120);
  assert.ok(out.length <= 120, `got ${out.length}`);
  assert.deepEqual(out[0], pts[0]);
  assert.deepEqual(out[out.length - 1], pts[pts.length - 1]);
});

test("pointAtMile interpolates along the route", () => {
  const route = indexRoute([
    { lat: 40, lng: -80 },
    { lat: 40, lng: -78 },
  ]);
  const mid = pointAtMile(route, route.totalMiles / 2);
  assert.ok(Math.abs(mid.lng - -79) < 1e-6);
  assert.deepEqual(pointAtMile(route, -5), route.points[0]);
  assert.deepEqual(pointAtMile(route, 1e9), route.points[1]);
});
