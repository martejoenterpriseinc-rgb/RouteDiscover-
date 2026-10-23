import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";

test("signup gate: first account always allowed, then owner switch and invite bypass decide", async () => {
  const { signupGate } = await import("../src/lib/access");
  const closed = { signupsOpen: false, allowInvited: false, closedTitle: "Soon", closedMessage: "Not yet." };

  assert.equal(signupGate(closed, { hasUsers: false, invited: false }).reason, "first_account");
  const blocked = signupGate(closed, { hasUsers: true, invited: false });
  assert.equal(blocked.open, false);
  assert.equal(blocked.message, "Not yet.");
  assert.equal(signupGate(closed, { hasUsers: true, invited: true }).open, false, "invites do not bypass unless allowed");
  assert.equal(signupGate({ ...closed, allowInvited: true }, { hasUsers: true, invited: true }).reason, "invited");
  assert.equal(signupGate({ ...closed, allowInvited: true }, { hasUsers: true, invited: false }).open, false);
  assert.equal(signupGate({ ...closed, signupsOpen: true }, { hasUsers: true, invited: false }).reason, "open");
});

test("checkSignup reads live settings and the user table", async () => {
  const [{ checkSignup }, { getDb, schema }, { saveDraft, publishDraft }] = await Promise.all([
    import("../src/lib/access"),
    import("../src/db/index"),
    import("../src/lib/settings"),
  ]);
  const db = await getDb();
  assert.equal((await checkSignup(false)).reason, "first_account", "empty database: the owner can always sign up");

  await db.insert(schema.users).values({ email: "owner@example.com", name: "O", passwordHash: "x", role: "owner", referralCode: "OWNER1" });
  assert.equal((await checkSignup(false)).open, false, "closed by default once the owner exists");

  await saveDraft({ access: { signupsOpen: true } });
  await publishDraft();
  assert.equal((await checkSignup(false)).open, true);
});
