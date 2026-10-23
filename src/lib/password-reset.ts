import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hashPassword } from "./auth";
import { randomToken, sha256 } from "./crypto";
import { sendEmail } from "./email";
import { getLiveSettings } from "./settings";
import { siteOrigin } from "./site";

const TTL_MS = 60 * 60_000;

/** Create a reset link for a user. Returns the URL (the owner can hand it out when email isn't configured). */
export async function createResetLink(userId: string): Promise<string> {
  const db = await getDb();
  const token = randomToken(32);
  await db.insert(schema.passwordResets).values({ id: sha256(token), userId, expiresAt: new Date(Date.now() + TTL_MS) });
  return `${await siteOrigin()}/reset?token=${token}`;
}

/** Email a reset link if the account exists. Always resolves (no account enumeration). */
export async function requestReset(email: string): Promise<{ sent: boolean; reason?: string }> {
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) return { sent: false, reason: "no account" };
  const url = await createResetLink(user.id);
  const s = await getLiveSettings();
  const r = await sendEmail(
    user.email,
    `Reset your ${s.app.name} password`,
    `<p>Someone asked to reset the password for this ${s.app.name} account. The link works for one hour.</p><p><a href="${url}">Reset password</a></p><p>If that wasn't you, ignore this email.</p>`,
    `Reset your ${s.app.name} password (valid for one hour): ${url}\n\nIf that wasn't you, ignore this email.`,
  );
  return r;
}

export async function completeReset(token: string, password: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.query.passwordResets.findFirst({ where: and(eq(schema.passwordResets.id, sha256(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())) });
  if (!row) return false;
  await db.update(schema.users).set({ passwordHash: hashPassword(password) }).where(eq(schema.users.id, row.userId));
  await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(eq(schema.passwordResets.id, row.id));
  // Sign out everywhere.
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId));
  return true;
}
