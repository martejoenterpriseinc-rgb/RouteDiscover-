import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreSubmission, type SubmitterContext } from "../src/lib/moderation";

const trusted: SubmitterContext = { accountAgeHours: 500, submissionsLast24h: 0, submissionsOnThisBusinessLast24h: 0, rejectedLast30d: 0, banned: false };

test("a normal review from an established account scores 0", () => {
  const r = scoreSubmission("review", { rating: 4, text: "Great pie, friendly staff, easy parking." }, trusted);
  assert.equal(r.score, 0);
  assert.deepEqual(r.flags, []);
});

test("brand-new account posting links and abuse is flagged", () => {
  const r = scoreSubmission("review", { rating: 1, text: "SCAM!!! see http://evil.example" }, { ...trusted, accountAgeHours: 1, submissionsLast24h: 12 });
  assert.ok(r.score >= 8, `score ${r.score}`);
  assert.ok(r.flags.includes("contains a link"));
  assert.ok(r.flags.includes("abusive or accusatory language"));
  assert.ok(r.flags.includes("account younger than 24h"));
});

test("marking a business closed is treated as high risk", () => {
  const r = scoreSubmission("hours", { value: "permanently closed" }, trusted);
  assert.ok(r.flags.includes("marks the business closed"));
  assert.ok(r.score >= 3);
});

test("changing contact details scores higher than describing the place", () => {
  const phone = scoreSubmission("info", { field: "phone", value: "555-0100" }, trusted);
  const about = scoreSubmission("info", { field: "description", value: "Family-run diner since 1962." }, trusted);
  assert.ok(phone.score > about.score);
  const website = scoreSubmission("info", { field: "website", value: "https://pie.example" }, trusted);
  assert.ok(!website.flags.includes("contains a link"), "website field may contain a URL");
});

test("banned submitters always exceed the default threshold", () => {
  const r = scoreSubmission("special", { text: "Half-price Tuesdays" }, { ...trusted, banned: true });
  assert.ok(r.score >= 5);
});

test("repeat offenders accumulate risk", () => {
  const r = scoreSubmission("menu", { text: "Burger $9" }, { ...trusted, rejectedLast30d: 4, submissionsOnThisBusinessLast24h: 5 });
  assert.ok(r.flags.includes("repeated submissions on this business"));
  assert.ok(r.score >= 4);
});
