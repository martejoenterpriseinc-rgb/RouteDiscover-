import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";
process.env.NEXT_PUBLIC_SITE_URL = "https://routediscover.test";

test("signup gate: first account always allowed, then the mode, approval links and invite bypass decide", async () => {
  const { signupGate } = await import("../src/lib/access");
  const closed = { mode: "closed" as const, allowInvited: false, closedTitle: "Soon", closedMessage: "Not yet.", requestTitle: "Ask", requestMessage: "Tell us.", defaultFreeDays: 30 };

  assert.equal(signupGate(closed, { hasUsers: false, invited: false }).reason, "first_account");
  const blocked = signupGate(closed, { hasUsers: true, invited: false });
  assert.equal(blocked.open, false);
  assert.equal(blocked.message, "Not yet.");
  assert.equal(signupGate(closed, { hasUsers: true, invited: true }).open, false, "invites do not bypass unless allowed");
  assert.equal(signupGate({ ...closed, allowInvited: true }, { hasUsers: true, invited: true }).reason, "invited");
  assert.equal(signupGate({ ...closed, allowInvited: true }, { hasUsers: true, invited: false }).open, false);
  assert.equal(signupGate({ ...closed, mode: "open" }, { hasUsers: true, invited: false }).reason, "open");
  const ask = signupGate({ ...closed, mode: "approval" }, { hasUsers: true, invited: false });
  assert.equal(ask.open, false);
  assert.equal(ask.reason, "request");
  assert.equal(ask.title, "Ask");
  assert.equal(signupGate({ ...closed, mode: "approval" }, { hasUsers: true, invited: false, approved: true }).reason, "approved");
  assert.equal(signupGate(closed, { hasUsers: true, invited: false, approved: true }).reason, "approved", "an approval link also works while closed");
});

test("approval flow: request → approve with free days → link creates the account and grants the pass", async () => {
  const [{ checkSignup }, { requestAccount, approveRequest, declineRequest, consumeRequest, listAccountRequests, pendingRequestCount }, { getDb, schema }, { saveDraft, publishDraft }, { createUser }, { getAccess }] = await Promise.all([
    import("../src/lib/access"),
    import("../src/lib/account-requests"),
    import("../src/db/index"),
    import("../src/lib/settings"),
    import("../src/lib/auth"),
    import("../src/lib/billing"),
  ]);
  const db = await getDb();
  assert.equal((await checkSignup(false)).reason, "first_account", "empty database: the owner can always sign up");
  const owner = await createUser({ email: "owner@example.com", name: "O", password: "roadtrip2026" });
  assert.equal(owner.role, "owner");
  assert.equal((await checkSignup(false)).open, false, "closed by default once the owner exists");

  await saveDraft({ access: { mode: "approval" } });
  await publishDraft();
  assert.equal((await checkSignup(false)).reason, "request");

  assert.deepEqual(await requestAccount({ name: "Ann", email: "Ann@Example.com", note: "EV trips" }), { status: "pending" });
  assert.deepEqual(await requestAccount({ name: "Ann", email: "ann@example.com", note: "again" }), { status: "pending" }, "idempotent per email");
  assert.deepEqual(await requestAccount({ name: "Owner", email: "owner@example.com", note: "" }), { status: "exists" });
  assert.equal(await pendingRequestCount(), 1);

  const [req] = await listAccountRequests();
  const { url, emailSent } = await approveRequest(req.id, { freeDays: 14, ownerId: owner.id });
  assert.equal(emailSent, false, "no email provider in tests");
  const token = new URL(url).searchParams.get("invite")!;
  assert.ok(token.length > 20);
  assert.equal(await pendingRequestCount(), 0);

  const bad = await checkSignup(false, "nope");
  assert.equal(bad.open, false);
  const good = await checkSignup(false, token);
  assert.equal(good.reason, "approved");
  assert.equal(good.request?.email, "ann@example.com");
  assert.equal(good.request?.freeDays, 14);

  const ann = await createUser({ email: "ann@example.com", name: "Ann", password: "roadtrip2026" });
  await consumeRequest(good.request!.id, ann.id);
  const access = await getAccess(ann);
  assert.equal(access.allowed, true, "complimentary pass is live");
  assert.equal((await checkSignup(false, token)).open, false, "link is single-use");
  const after = (await listAccountRequests()).find((r) => r.id === req.id)!;
  assert.equal(after.accepted, true);

  await requestAccount({ name: "Bob", email: "bob@example.com", note: "" });
  const bob = (await listAccountRequests()).find((r) => r.email === "bob@example.com")!;
  await declineRequest(bob.id, owner.id);
  assert.equal((await listAccountRequests()).find((r) => r.id === bob.id)!.status, "declined");
  assert.deepEqual(await requestAccount({ name: "Bob", email: "bob@example.com", note: "please" }), { status: "pending" }, "a declined person may ask again");
  await db.delete(schema.accountRequests);
});
