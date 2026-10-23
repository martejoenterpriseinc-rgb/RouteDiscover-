import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { normalizeEmail } from "./auth";
import { grantPass } from "./billing";
import { randomToken, sha256 } from "./crypto";
import { sendEmail } from "./email";
import { track } from "./events";
import { getLiveSettings } from "./settings";
import { siteOrigin } from "./site";

const LINK_TTL_MS = 14 * 86400_000;

export type AccountRequest = typeof schema.accountRequests.$inferSelect;

/** A visitor asks for an account. Idempotent per email; never reveals whether an account exists. */
export async function requestAccount(input: { name: string; email: string; note: string }): Promise<{ status: "pending" | "approved" | "declined" | "exists" }> {
  const db = await getDb();
  const email = normalizeEmail(input.email);
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email), columns: { id: true } });
  if (user) return { status: "exists" };
  const existing = await db.query.accountRequests.findFirst({ where: eq(schema.accountRequests.email, email) });
  if (existing) {
    if (existing.status === "declined") {
      await db.update(schema.accountRequests).set({ status: "pending", name: input.name.trim().slice(0, 120), note: input.note.trim().slice(0, 1000), decidedAt: null, decidedBy: null }).where(eq(schema.accountRequests.id, existing.id));
      return { status: "pending" };
    }
    return { status: existing.status };
  }
  const [row] = await db.insert(schema.accountRequests).values({ email, name: input.name.trim().slice(0, 120), note: input.note.trim().slice(0, 1000) }).returning();
  await track("account_requested", { meta: { requestId: row.id } });
  return { status: "pending" };
}

export async function listAccountRequests(limit = 200) {
  const db = await getDb();
  const rows = await db.select().from(schema.accountRequests).orderBy(desc(schema.accountRequests.createdAt)).limit(limit);
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    note: r.note,
    status: r.status,
    freeDays: r.freeDays,
    emailSent: r.emailSent,
    accepted: !!r.acceptedUserId,
    linkExpired: !!r.tokenExpiresAt && r.tokenExpiresAt.getTime() < Date.now(),
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
}

export async function pendingRequestCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ id: schema.accountRequests.id }).from(schema.accountRequests).where(eq(schema.accountRequests.status, "pending"));
  return rows.length;
}

/**
 * Approve a request (or re-issue the link for one already approved). Creates a 14-day invite link,
 * emails it when an email provider is connected, and returns the link so the owner can send it by hand.
 */
export async function approveRequest(id: string, opts: { freeDays: number; ownerId: string }): Promise<{ url: string; emailSent: boolean; emailReason?: string }> {
  const db = await getDb();
  const req = await db.query.accountRequests.findFirst({ where: eq(schema.accountRequests.id, id) });
  if (!req) throw new Error("Request not found.");
  if (req.acceptedUserId) throw new Error("This person already created their account.");
  const token = randomToken(32);
  const freeDays = Math.max(0, Math.min(365, Math.round(opts.freeDays || 0)));
  const url = `${await siteOrigin()}/signup?invite=${token}`;
  const s = await getLiveSettings();
  const free = freeDays > 0 ? ` It includes ${freeDays} complimentary days of ${s.app.name}.` : "";
  const mail = await sendEmail(
    req.email,
    `Your ${s.app.name} account is ready`,
    `<p>Good news — your request for a ${s.app.name} account was approved.${free}</p><p><a href="${url}">Create your account</a> (the link works for 14 days).</p>`,
    `Your request for a ${s.app.name} account was approved.${free}\n\nCreate your account (valid for 14 days): ${url}`,
  );
  await db
    .update(schema.accountRequests)
    .set({ status: "approved", freeDays, tokenHash: sha256(token), tokenExpiresAt: new Date(Date.now() + LINK_TTL_MS), emailSent: mail.sent, decidedAt: new Date(), decidedBy: opts.ownerId })
    .where(eq(schema.accountRequests.id, id));
  await track("account_request_approved", { userId: opts.ownerId, meta: { requestId: id, freeDays, emailSent: mail.sent } });
  return { url, emailSent: mail.sent, emailReason: mail.reason };
}

export async function declineRequest(id: string, ownerId: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.accountRequests).set({ status: "declined", tokenHash: null, tokenExpiresAt: null, decidedAt: new Date(), decidedBy: ownerId }).where(eq(schema.accountRequests.id, id));
  await track("account_request_declined", { userId: ownerId, meta: { requestId: id } });
}

/** Called once the invited person has created their account: close the request and grant any complimentary days. */
export async function consumeRequest(requestId: string, userId: string): Promise<void> {
  const db = await getDb();
  const req = await db.query.accountRequests.findFirst({ where: eq(schema.accountRequests.id, requestId) });
  if (!req || req.acceptedUserId) return;
  await db.update(schema.accountRequests).set({ acceptedUserId: userId, tokenHash: null }).where(eq(schema.accountRequests.id, requestId));
  if (req.freeDays > 0) await grantPass(userId, { kind: "pass", days: req.freeDays, ref: `complimentary:${requestId}`, amountCents: 0 });
}
