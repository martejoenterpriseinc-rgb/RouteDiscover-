import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Wordmark } from "@/components/AppNav";
import { AuthForm } from "@/components/AuthForm";
import { checkSignup } from "@/lib/access";
import { REFERRAL_COOKIE, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (await getCurrentUser()) redirect("/app");
  const { ref } = await searchParams;
  const code = (ref || (await cookies()).get(REFERRAL_COOKIE)?.value || "").toUpperCase().slice(0, 16);
  let invited = false;
  if (code) {
    const db = await getDb();
    invited = !!(await db.query.users.findFirst({ where: eq(schema.users.referralCode, code), columns: { id: true } }));
  }
  const gate = await checkSignup(invited);
  if (gate.open) return <AuthForm mode="signup" />;
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-cream to-background p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <Image src="/brand/mark.png" alt="" width={48} height={58} className="h-14 w-auto" priority />
        <Wordmark className="text-2xl" />
        <h1 className="mt-2 text-lg font-semibold">{gate.title}</h1>
        <p className="text-sm text-muted">{gate.message}</p>
        <p className="mt-2 text-sm text-muted">
          Already have an account? <Link className="text-blue hover:underline" href="/login">Sign in</Link>
        </p>
        <Link href="/" className="text-xs text-muted hover:underline">Back to the home page</Link>
      </div>
    </main>
  );
}
