import { count } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getLiveSettings, type AppSettings } from "./settings";

export type SignupGate = { open: boolean; reason: "open" | "first_account" | "invited" | "closed"; title: string; message: string };

/** Pure decision: may someone sign up right now? */
export function signupGate(access: AppSettings["access"], ctx: { hasUsers: boolean; invited: boolean }): SignupGate {
  const closed = { title: access.closedTitle, message: access.closedMessage };
  if (!ctx.hasUsers) return { open: true, reason: "first_account", ...closed };
  if (access.signupsOpen) return { open: true, reason: "open", ...closed };
  if (access.allowInvited && ctx.invited) return { open: true, reason: "invited", ...closed };
  return { open: false, reason: "closed", ...closed };
}

/** Looks up live settings and whether any account exists yet. `invited` = arrived with a referral/invite code. */
export async function checkSignup(invited: boolean): Promise<SignupGate> {
  const [s, db] = await Promise.all([getLiveSettings(), getDb()]);
  const [{ c }] = await db.select({ c: count() }).from(schema.users);
  return signupGate(s.access, { hasUsers: Number(c) > 0, invited });
}
