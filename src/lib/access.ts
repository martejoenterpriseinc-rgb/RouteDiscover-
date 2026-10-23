import { and, count, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sha256 } from "./crypto";
import { getLiveSettings, type AppSettings } from "./settings";

export type SignupGate = {
  open: boolean;
  mode: AppSettings["access"]["mode"];
  reason: "open" | "first_account" | "invited" | "approved" | "request" | "closed";
  title: string;
  message: string;
  /** Present when an approval link was used: the request it belongs to. */
  request?: { id: string; email: string; name: string; freeDays: number };
};

/** Pure decision: may someone sign up right now? */
export function signupGate(access: AppSettings["access"], ctx: { hasUsers: boolean; invited: boolean; approved?: boolean }): SignupGate {
  const base = { mode: access.mode };
  if (!ctx.hasUsers) return { ...base, open: true, reason: "first_account", title: "", message: "" };
  if (access.mode === "open") return { ...base, open: true, reason: "open", title: "", message: "" };
  if (ctx.approved) return { ...base, open: true, reason: "approved", title: "", message: "" };
  if (access.allowInvited && ctx.invited) return { ...base, open: true, reason: "invited", title: "", message: "" };
  if (access.mode === "approval") return { ...base, open: false, reason: "request", title: access.requestTitle, message: access.requestMessage };
  return { ...base, open: false, reason: "closed", title: access.closedTitle, message: access.closedMessage };
}

/** Find the approved request an invite token belongs to (unused, unexpired). */
export async function findApprovedRequest(token: string | undefined | null) {
  if (!token) return null;
  const db = await getDb();
  return (
    (await db.query.accountRequests.findFirst({
      where: and(
        eq(schema.accountRequests.tokenHash, sha256(token)),
        eq(schema.accountRequests.status, "approved"),
        isNull(schema.accountRequests.acceptedUserId),
        gt(schema.accountRequests.tokenExpiresAt, new Date()),
      ),
    })) ?? null
  );
}

/**
 * Looks up live settings and whether any account exists yet.
 * `invited` = arrived with a valid referral/invite code; `inviteToken` = from an approval link.
 */
export async function checkSignup(invited: boolean, inviteToken?: string | null): Promise<SignupGate> {
  const [s, db, req] = await Promise.all([getLiveSettings(), getDb(), findApprovedRequest(inviteToken)]);
  const [{ c }] = await db.select({ c: count() }).from(schema.users);
  const gate = signupGate(s.access, { hasUsers: Number(c) > 0, invited, approved: !!req });
  if (req && gate.reason === "approved") gate.request = { id: req.id, email: req.email, name: req.name, freeDays: req.freeDays };
  return gate;
}
