import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";

async function mods() {
  const [{ getDb, schema }, { handleStripeEvent }, { getAccess, grantPass, isLive }, { saveDraft, publishDraft }, { createReferral, availableCreditCents, referralSummary }] = await Promise.all([
    import("../src/db/index"),
    import("../src/lib/stripe"),
    import("../src/lib/billing"),
    import("../src/lib/settings"),
    import("../src/lib/referrals"),
  ]);
  return { getDb, schema, handleStripeEvent, getAccess, grantPass, isLive, saveDraft, publishDraft, createReferral, availableCreditCents, referralSummary };
}

async function makeUser(email: string) {
  const { getDb, schema } = await mods();
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email, name: email.split("@")[0], passwordHash: "x", referralCode: email.slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6), stripeCustomerId: `cus_${email.split("@")[0]}` }).returning();
  return u;
}

test("pass model: a paid pass grants access that expires; trial rows expire too", async () => {
  const m = await mods();
  await m.saveDraft({ pricing: { model: "pass", passDays: 30, requireSubscription: true, stripePriceId: "price_pass", trialEnabled: false }, integrations: { stripe: { secretKey: "sk_test_x" } } });
  await m.publishDraft();
  const u = await makeUser("pass@example.com");
  assert.equal((await m.getAccess(u)).allowed, false);
  await m.handleStripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_1", customer: "cus_pass", amount_total: 499, currency: "usd", metadata: { kind: "pass", userId: u.id } } } });
  const a = await m.getAccess(u);
  assert.equal(a.allowed, true);
  assert.equal(a.kind, "pass");
  assert.ok(a.daysLeft && a.daysLeft >= 29 && a.daysLeft <= 30, `daysLeft ${a.daysLeft}`);
  // a second pass extends from the current end, not from today
  await m.handleStripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_2", customer: "cus_pass", amount_total: 499, currency: "usd", metadata: { kind: "pass", userId: u.id } } } });
  assert.ok((await m.getAccess(u)).daysLeft! >= 59);
  // expired rows don't grant access
  const expired = { ...(await m.grantPass(u.id, { kind: "trial", days: 1, ref: "trial:x", amountCents: 0 })), currentPeriodEnd: new Date(Date.now() - 1000) };
  assert.equal(m.isLive(expired), false);
});

test("referral: credit is issued once the friend completes the qualifying paid periods", async () => {
  const m = await mods();
  await m.saveDraft({ referrals: { enabled: true, referrerBonusCents: 100, refereeBonusCents: 50, qualifyingPayments: 2 } });
  await m.publishDraft();
  const sharer = await makeUser("sharer@example.com");
  const friend = await makeUser("friend@example.com");
  assert.ok(await m.createReferral(sharer.id, friend.id));
  await m.handleStripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_f1", customer: "cus_friend", amount_total: 499, currency: "usd", metadata: { kind: "pass", userId: friend.id } } } });
  assert.equal(await m.availableCreditCents(sharer.id), 0, "no credit after the first pass");
  await m.handleStripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_f2", customer: "cus_friend", amount_total: 499, currency: "usd", metadata: { kind: "pass", userId: friend.id } } } });
  assert.equal(await m.availableCreditCents(sharer.id), 100, "referrer credited after the second pass");
  assert.equal(await m.availableCreditCents(friend.id), 50, "new customer bonus");
  // a third pass does not pay out again
  await m.handleStripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_f3", customer: "cus_friend", amount_total: 499, currency: "usd", metadata: { kind: "pass", userId: friend.id } } } });
  assert.equal(await m.availableCreditCents(sharer.id), 100);
  const summary = await m.referralSummary(sharer.id);
  assert.equal(summary.friendsQualified, 1);
  assert.equal(summary.friends[0].paidPeriods, 3);
});

test("referral: monthly invoices count as paid periods; self-referral is ignored", async () => {
  const m = await mods();
  const sharer = await makeUser("sharer2@example.com");
  const friend = await makeUser("friend2@example.com");
  assert.equal(await m.createReferral(sharer.id, sharer.id), null);
  await m.createReferral(sharer.id, friend.id);
  await m.handleStripeEvent({ type: "invoice.paid", data: { object: { customer: "cus_friend2", amount_paid: 499 } } });
  await m.handleStripeEvent({ type: "invoice.paid", data: { object: { customer: "cus_friend2", amount_paid: 499 } } });
  assert.equal(await m.availableCreditCents(sharer.id), 100);
});
