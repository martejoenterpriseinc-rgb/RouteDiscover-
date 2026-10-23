import assert from "node:assert/strict";
import { test } from "node:test";
import { connectorTypes, detectNetwork, extraFees, normalizeConnector, parsePricing, pricingSummary, speedTier } from "../src/lib/ev-networks";
import { applyChargerFilters } from "../src/lib/providers/chargers";
import type { Charger } from "../src/lib/types";

test("detectNetwork recognises the major networks from operator or site name", () => {
  assert.equal(detectNetwork("Tesla (Tesla-only charging)").id, "tesla");
  assert.equal(detectNetwork("Electrify America").id, "electrify_america");
  assert.equal(detectNetwork("EVgo Network").id, "evgo");
  assert.equal(detectNetwork("ChargePoint").id, "chargepoint");
  assert.equal(detectNetwork("Blink Charging").id, "blink");
  assert.equal(detectNetwork("Rivian Adventure Network").id, "rivian");
  assert.equal(detectNetwork("Shell Recharge Solutions").id, "shell_recharge");
  assert.equal(detectNetwork("Greenlots").id, "shell_recharge");
  assert.equal(detectNetwork("bp pulse").id, "bp_pulse");
  assert.equal(detectNetwork("Mercedes-Benz High-Power Charging").id, "mercedes");
  assert.equal(detectNetwork("IONNA").id, "ionna");
  assert.equal(detectNetwork("Francis Energy").id, "francis");
  assert.equal(detectNetwork("Pilot Flying J").id, "pilot_flyingj");
  assert.equal(detectNetwork("7-Eleven 7Charge").id, "seven_charge");
  assert.equal(detectNetwork(undefined, "Springfield Supercharger").id, "tesla", "falls back to the site name");
  const other = detectNetwork("Joe's Garage EV");
  assert.equal(other.id, "other");
  assert.equal(other.label, "Joe's Garage EV", "unknown operators keep their own name");
  assert.equal(detectNetwork(null, null).id, "unknown");
});

test("connectors normalise to a small set", () => {
  assert.equal(normalizeConnector("CCS (Type 1)"), "ccs");
  assert.equal(normalizeConnector("SAE J1772 Combo"), "ccs");
  assert.equal(normalizeConnector("CHAdeMO"), "chademo");
  assert.equal(normalizeConnector("Type 1 (J1772)"), "j1772");
  assert.equal(normalizeConnector("Tesla Supercharger"), "nacs");
  assert.equal(normalizeConnector("NACS / Tesla Supercharger"), "nacs");
  assert.deepEqual(connectorTypes(["CCS (Type 1)", "CHAdeMO", "CCS (Type 1)"]), ["ccs", "chademo"]);
});

test("speed tiers follow kW, with the OCM level as a fallback", () => {
  assert.equal(speedTier(350), "ultra");
  assert.equal(speedTier(150), "ultra");
  assert.equal(speedTier(62.5), "fast");
  assert.equal(speedTier(7.2), "level2");
  assert.equal(speedTier(1.4), "level1");
  assert.equal(speedTier(undefined, 3), "fast");
  assert.equal(speedTier(undefined, 2), "level2");
});

test("pricing parser reads per-kWh, per-minute, session, idle and parking fees", () => {
  const p = parsePricing("$0.48/kWh; $1.00 session fee; idle fee $0.40/min after 10 min; Pass+ members $0.36/kWh")!;
  assert.equal(p.perKwh, 0.48);
  assert.equal(p.sessionFee, 1);
  assert.equal(p.idleFeePerMinute, 0.4);
  assert.equal(p.perMinute, undefined, "the idle figure is not the charging rate");
  assert.equal(p.membership, true);
  assert.equal(pricingSummary(p, "paid"), "$0.48/kWh");
  assert.deepEqual(extraFees(p), ["$1.00 session fee", "Idle fee $0.40/min", "Membership or app needed"]);

  const cents = parsePricing("35 cents per kWh, parking $2")!;
  assert.equal(cents.perKwh, 0.35);
  assert.equal(cents.parkingFee, 2);

  const idleAfter = parsePricing("$0.44/kWh; $0.30/min idle")!;
  assert.equal(idleAfter.perKwh, 0.44);
  assert.equal(idleAfter.idleFeePerMinute, 0.3);
  assert.equal(idleAfter.perMinute, undefined);

  const perMin = parsePricing("$0.30/min")!;
  assert.equal(perMin.perMinute, 0.3);
  assert.equal(pricingSummary(perMin, "paid"), "$0.30/min");

  const free = parsePricing("Free for hotel guests")!;
  assert.equal(free.free, true);
  assert.equal(pricingSummary(free, "free"), "Free");

  assert.equal(pricingSummary(undefined, "unknown"), "Rate not published");
  assert.equal(parsePricing("", true)?.raw, "Pay at location");
});

test("charger filters: network, plug, speed and price", () => {
  const mk = (o: Partial<Charger>): Charger => ({
    id: "x", name: "x", lat: 0, lng: 0, network: "other", networkLabel: "Other", supercharger: false, speedTier: "fast", costTier: "unknown", connectors: [], connectorTypes: [], ...o,
  });
  const list = [
    mk({ id: "t", network: "tesla", supercharger: true, maxKw: 250, speedTier: "ultra", connectorTypes: ["nacs"], costTier: "paid" }),
    mk({ id: "ea", network: "electrify_america", maxKw: 350, speedTier: "ultra", connectorTypes: ["ccs", "chademo"], costTier: "paid" }),
    mk({ id: "cp", network: "chargepoint", maxKw: 6.6, speedTier: "level2", connectorTypes: ["j1772"], costTier: "free" }),
    mk({ id: "nokw", network: "evgo", maxKw: undefined, speedTier: "fast", connectorTypes: ["ccs"] }),
  ];
  assert.deepEqual(applyChargerFilters(list, {}).map((c) => c.id), ["t", "ea", "cp", "nokw"]);
  assert.deepEqual(applyChargerFilters(list, { networks: ["tesla", "evgo"] }).map((c) => c.id), ["t", "nokw"]);
  assert.deepEqual(applyChargerFilters(list, { connectors: ["ccs"] }).map((c) => c.id), ["ea", "nokw"]);
  assert.deepEqual(applyChargerFilters(list, { minKw: 150 }).map((c) => c.id), ["t", "ea"], "unknown kW is kept only when the tier says fast and the bar is 50");
  assert.deepEqual(applyChargerFilters(list, { minKw: 50 }).map((c) => c.id), ["t", "ea", "nokw"]);
  assert.deepEqual(applyChargerFilters(list, { cost: "free" }).map((c) => c.id), ["cp"]);
});
