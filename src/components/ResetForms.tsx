"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Wordmark } from "./AppNav";
import { Button, ErrorNote } from "./ui";

const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none ring-blue/40 focus:ring-2";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-cream to-background p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <Image src="/brand/mark.png" alt="" width={48} height={58} className="h-14 w-auto" />
          <Wordmark className="text-2xl" />
          <h1 className="mt-2 text-lg font-semibold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<{ emailConfigured: boolean; support?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Shell title="Reset your password">
      {done ? (
        done.emailConfigured ? (
          <p className="text-sm">If an account exists for <strong>{email}</strong>, a reset link is on its way. It works for one hour.</p>
        ) : (
          <p className="text-sm">
            Email isn&apos;t set up yet, so a link can&apos;t be sent automatically. Contact support{done.support ? ` at ${done.support}` : ""} and they can send you a reset link.
          </p>
        )
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
            const j = (await res.json()) as { error?: string; emailConfigured?: boolean; support?: string };
            setBusy(false);
            if (!res.ok) return setError(j.error ?? "Something went wrong.");
            setDone({ emailConfigured: !!j.emailConfigured, support: j.support });
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
            <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
      <p className="text-center text-sm text-muted">
        <Link className="text-blue hover:underline" href="/login">Back to sign in</Link>
      </p>
    </Shell>
  );
}

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <Shell title="Choose a new password">
      {done ? (
        <p className="text-sm">Your password has been changed. <Link className="text-blue hover:underline" href="/login">Sign in</Link></p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
            const j = (await res.json()) as { error?: string };
            setBusy(false);
            if (!res.ok) return setError(j.error ?? "Something went wrong.");
            setDone(true);
            setTimeout(() => router.push("/login"), 1500);
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">New password</span>
            <input className={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          {!token && <ErrorNote>This link is missing its token. Request a new reset link.</ErrorNote>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" disabled={busy || !token}>{busy ? "Saving…" : "Set new password"}</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetForm() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
