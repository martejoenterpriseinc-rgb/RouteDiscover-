import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyCost } from "../src/lib/providers/chargers";

test("classifyCost recognises free charging", () => {
  assert.equal(classifyCost("Free"), "free");
  assert.equal(classifyCost("Free for hotel guests"), "free");
  assert.equal(classifyCost("Complimentary"), "free");
  assert.equal(classifyCost("$0.00"), "free");
});

test("classifyCost recognises paid charging", () => {
  assert.equal(classifyCost("$0.35/kWh"), "paid");
  assert.equal(classifyCost("25 cents per minute"), "paid");
  assert.equal(classifyCost("Parking fee applies"), "paid");
  assert.equal(classifyCost("", true), "paid");
});

test("classifyCost returns unknown when nothing is stated", () => {
  assert.equal(classifyCost(""), "unknown");
  assert.equal(classifyCost(null), "unknown");
  assert.equal(classifyCost(undefined, false), "unknown");
});

test("classifyCost treats 'free parking, $ per kWh' as paid", () => {
  assert.equal(classifyCost("Free parking; $0.30/kWh"), "paid");
});
