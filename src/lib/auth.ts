import "server-only";
import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getDb, schema } from "@/db";
import type { User } from "@/db/schema";
import { randomToken, sha256, shortCode } from "./crypto";
import { track } from "./events";

export const SESSION_COOKIE = "rd_session";
export const REFERRAL_COOKIE = "rd_ref";
const SESSION_DAYS = 30;

/* ---------------- passwords ---------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 200) return "Password is too long.";
  return null;
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/* ---------------- users ---------------- */

export async function createUser(input: { email: string; name: string; password: string; referredBy?: string | null }) {
  const db = await getDb();
  const email = normalizeEmail(input.email);
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) throw new AuthError("An account with that email already exists.", 409);
  // The very first account becomes the owner.
  const anyOwner = await db.query.users.findFirst({ where: eq(schema.users.role, "owner") });
  const role = anyOwner ? "user" : "owner";
  let referralCode = shortCode(8);
  for (let i = 0; i < 5; i++) {
    const clash = await db.query.users.findFirst({ where: eq(schema.users.referralCode, referralCode) });
    if (!clash) break;
    referralCode = shortCode(8);
  }
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name: input.name.trim().slice(0, 120),
      passwordHash: hashPassword(input.password),
      role,
      referralCode,
      referredBy: input.referredBy ?? null,
    })
    .returning();
  await db.insert(schema.preferences).values({ userId: user.id, data: schema.DEFAULT_PREFERENCES });
  await track("signup", { userId: user.id, meta: { role, referred: !!input.referredBy } });
  return user;
}

export async function authenticate(email: string, password: string): Promise<User> {
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, normalizeEmail(email)) });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AuthError("Email or password is incorrect.", 401);
  }
  return user;
}

/* ---------------- sessions ---------------- */

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const db = await getDb();
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  let userAgent: string | null = null;
  try {
    userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    /* not in a request scope */
  }
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt: expires, userAgent });
  await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, userId));
  return { token, expires };
}

export async function setSessionCookie(token: string, expires: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Current user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const row = await db.query.sessions.findFirst({
    where: and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date())),
  });
  if (!row) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
  if (!user) return null;
  // Touch activity at most every 10 minutes to keep "active users" accurate without write storms.
  if (Date.now() - row.lastSeenAt.getTime() > 10 * 60_000) {
    const now = new Date();
    await db.update(schema.sessions).set({ lastSeenAt: now }).where(eq(schema.sessions.id, row.id));
    await db.update(schema.users).set({ lastSeenAt: now }).where(eq(schema.users.id, user.id));
  }
  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in required.", 401);
  return user;
}

export async function requireOwner(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "owner") throw new AuthError("Owner access only.", 403);
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
