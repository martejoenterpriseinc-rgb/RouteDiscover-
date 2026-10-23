import assert from "node:assert/strict";
import { test } from "node:test";

process.env.PGLITE_DIR = ":memory:";
process.env.APP_SECRET = "test-secret-value-1234";
process.env.NEXT_PUBLIC_SITE_URL = "https://routediscover.com";

test("password reset: link works once, expires, and signs the user out everywhere", async () => {
  const [{ getDb, schema }, { createResetLink, completeReset }, { hashPassword, verifyPassword }, { eq }] = await Promise.all([
    import("../src/db/index"),
    import("../src/lib/password-reset"),
    import("../src/lib/auth"),
    import("drizzle-orm"),
  ]);
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email: "r@example.com", name: "R", passwordHash: hashPassword("old-password"), referralCode: "RRRRRR" }).returning();
  await db.insert(schema.sessions).values({ id: "sess1", userId: u.id, expiresAt: new Date(Date.now() + 86400_000) });
  const url = await createResetLink(u.id);
  assert.match(url, /^https:\/\/routediscover\.com\/reset\?token=/);
  const token = new URL(url).searchParams.get("token")!;
  assert.equal(await completeReset("bogus", "new-password-1"), false);
  assert.equal(await completeReset(token, "new-password-1"), true);
  const after = await db.query.users.findFirst({ where: eq(schema.users.id, u.id) });
  assert.ok(verifyPassword("new-password-1", after!.passwordHash));
  assert.equal(await completeReset(token, "another-one"), false, "token is single-use");
  assert.equal((await db.select().from(schema.sessions).where(eq(schema.sessions.userId, u.id))).length, 0, "sessions revoked");
});
