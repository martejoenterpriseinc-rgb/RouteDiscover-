import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";

// server-only modules need the react-server condition; the test script sets it.
async function mods() {
  const [{ getDb, schema }, { applySubscription, handleStripeEvent }, { getAccess }, { saveDraft, publishDraft }, { eq }] = await Promise.all([
    import("../src/db/index"),
    import("../src/lib/stripe"),
    import("../src/lib/billing"),
    import("../src/lib/settings"),
    import("drizzle-orm"),
  ]);
  return { getDb, schema, applySubscription, handleStripeEvent, getAccess, saveDraft, publishDraft, eq };
}

async function makeUser(email: string, role: "user" | "owner" = "user") {
  const { getDb, schema } = await mods();
  const db = await getDb();
  const [u] = await db
    .insert(schema.users)
    .values({ email, name: "T", passwordHash: "x", role, referralCode: email.slice(0, 6).toUpperCase(), stripeCustomerId: `cus_${email.split("@")[0]}` })
    .returning();
  return u;
}

test("subscription webhook flow: active → canceled gates access", async () => {
  const { getDb, schema, applySubscription, handleStripeEvent, getAccess, saveDraft, publishDraft, eq } = await mods();
  const db = await getDb();
  const user = await makeUser("sub@example.com");
  // Billing configured and required
  await saveDraft({ pricing: { requireSubscription: true, stripePriceId: "price_123" }, integrations: { stripe: { secretKey: "sk_test_x" } } });
  await publishDraft();

  let access = await getAccess(user);
  assert.equal(access.allowed, false);
  assert.equal(access.reason, "no_subscription");

  await handleStripeEvent({
    type: "customer.subscription.created",
    data: { object: { id: "sub_1", customer: "cus_sub", status: "trialing", items: { data: [{ price: { id: "price_123" }, current_period_end: 1_900_000_000 }] }, metadata: { userId: user.id } } },
  });
  access = await getAccess(user);
  assert.equal(access.allowed, true);
  assert.equal(access.status, "trialing");

  await applySubscription({ id: "sub_1", customer: "cus_sub", status: "active", cancel_at_period_end: true });
  access = await getAccess(user);
  assert.equal(access.allowed, true);
  assert.equal(access.cancelAtPeriodEnd, true);

  await handleStripeEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_sub", status: "canceled", canceled_at: 1_800_000_000 } } });
  access = await getAccess(user);
  assert.equal(access.allowed, false);
  assert.equal(access.reason, "subscription_inactive");

  const events = await db.select().from(schema.events).where(eq(schema.events.userId, user.id));
  assert.deepEqual(
    events.map((e) => e.type),
    ["subscription_started", "subscription_canceled"],
  );
});

test("owners and unconfigured billing always have access", async () => {
  const { getAccess, saveDraft, publishDraft } = await mods();
  const owner = await makeUser("owner@example.com", "owner");
  assert.equal((await getAccess(owner)).allowed, true);
  await saveDraft({ pricing: { requireSubscription: false } });
  await publishDraft();
  const user = await makeUser("free@example.com");
  assert.equal((await getAccess(user)).allowed, true);
});

test("unknown customer is ignored safely", async () => {
  const { handleStripeEvent } = await mods();
  const r = await handleStripeEvent({ type: "customer.subscription.updated", data: { object: { id: "sub_x", customer: "cus_nobody", status: "active" } } });
  assert.match(r, /ignored/);
});
