import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Card, InvitePanel, PreferencesForm, ProfileForm, SignOutButton } from "@/components/AccountPanels";
import { Badge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { formatPrice, getLiveSettings } from "@/lib/settings";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const db = await getDb();
  const prefs = await db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) });
  const access = await getAccess(user);
  const s = await getLiveSettings();
  const origin = await siteOrigin();
  const statusTone = access.status === "active" || access.status === "trialing" ? "free" : access.status === "none" ? "neutral" : "paid";
  const statusLabel =
    access.status === "none"
      ? access.billingConfigured
        ? access.model === "pass" ? "No pass yet" : "No subscription"
        : "Free access (billing not enabled yet)"
      : access.kind === "trial"
        ? `Free trial${access.daysLeft != null ? `, ${access.daysLeft} days left` : ""}`
        : access.kind === "pass"
          ? access.allowed ? `Pass active, ${access.daysLeft} days left` : "Pass ended"
          : access.status.replace("_", " ");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Account</h1>
        <SignOutButton />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <ProfileForm name={user.name} email={user.email} memberSince={user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
          <Card title="Subscription">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone}>{statusLabel}</Badge>
              {user.role === "owner" && <Badge tone="tesla">Owner</Badge>}
              {access.cancelAtPeriodEnd && <Badge tone="paid">Cancels at period end</Badge>}
            </div>
            <p className="text-sm text-muted">
              {formatPrice(s.pricing.monthlyPriceCents, s.pricing.currency)}{s.pricing.model === "pass" ? ` per ${s.pricing.passDays}-day pass` : "/month"}
              {access.currentPeriodEnd ? ` · ${access.kind === "subscription" ? "renews" : "ends"} ${new Date(access.currentPeriodEnd).toLocaleDateString()}` : ""}
            </p>
            {access.creditCents > 0 && <p className="text-sm font-semibold text-green">🎁 {formatPrice(access.creditCents, s.pricing.currency)} referral credit ready for your next checkout</p>}
            {access.billingConfigured ? (
              <Link href="/app/subscribe" className="text-sm font-semibold text-blue hover:underline">
                {s.pricing.model === "pass" ? (access.allowed && access.status !== "none" ? "Extend your pass →" : "Get your pass →") : access.status === "none" ? "Start your subscription →" : "Manage billing →"}
              </Link>
            ) : (
              <p className="text-xs text-muted">Billing will appear here once Stripe is connected in the owner console.</p>
            )}
          </Card>
          <Card title="Refer friends, earn credit" subtitle={s.referrals.promoText}>
            <Link href="/app/referrals" className="text-sm font-semibold text-blue hover:underline">Open your referral dashboard →</Link>
          </Card>
          <InvitePanel referralCode={user.referralCode} origin={origin} />
          <Card title="Your businesses" subtitle="Claimed a listing? Edit it, sync it, see traffic and review customer updates.">
            <Link href="/app/business" className="text-sm font-semibold text-blue hover:underline">Open my businesses →</Link>
          </Card>
        </div>
        <PreferencesForm initial={prefs?.data ?? schema.DEFAULT_PREFERENCES} />
      </div>
    </div>
  );
}
