import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SubscribePanel } from "@/components/SubscribePanel";
import { Wordmark } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { formatPrice, getLiveSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Subscribe" };

export default async function SubscribePage() {
  const user = await requireUser();
  const access = await getAccess(user);
  const s = await getLiveSettings();
  if (!access.billingConfigured) redirect("/app");
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-cream to-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Image src="/brand/mark.png" alt="" width={56} height={67} className="h-16 w-auto" />
          <Wordmark className="text-2xl" />
          <h1 className="mt-4 text-xl font-bold">
            {access.status === "none" ? "Start your subscription" : "Your subscription"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {formatPrice(s.pricing.monthlyPriceCents, s.pricing.currency)}/month
            {s.pricing.trialDays > 0 && access.status === "none" ? `, after a ${s.pricing.trialDays}-day free trial` : ""}. Cancel anytime.
          </p>
        </div>
        <ul className="mt-6 space-y-2 text-sm">
          {s.pricing.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-green" aria-hidden>✔</span>
              {f}
            </li>
          ))}
        </ul>
        <SubscribePanel access={access} />
      </div>
    </div>
  );
}
