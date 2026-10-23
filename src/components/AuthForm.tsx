"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Wordmark } from "./AppNav";
import { Button, ErrorNote } from "./ui";

function Form({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const ref = params.get("ref") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, email, password, referral: ref } : { email, password }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      router.push(next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none ring-blue/40 focus:ring-2";
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <Image src="/brand/mark.png" alt="" width={48} height={58} className="h-14 w-auto" priority />
        <Wordmark className="text-2xl" />
        <h1 className="mt-2 text-lg font-semibold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        {mode === "signup" && ref && <p className="text-xs text-muted">Invited with code {ref}</p>}
      </div>
      {mode === "signup" && (
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
      )}
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
        <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Password</span>
        <input
          className={field}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {mode === "signup" ? <span className="text-xs text-muted">At least 8 characters.</span> : <Link href="/forgot" className="text-xs text-blue hover:underline">Forgot your password?</Link>}
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" disabled={busy}>
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      {mode === "signup" && (
        <p className="text-center text-xs text-muted">
          By creating an account you agree to the <Link className="text-blue hover:underline" href="/terms">Terms</Link> and <Link className="text-blue hover:underline" href="/privacy">Privacy Policy</Link>.
        </p>
      )}
      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have an account? <Link className="text-blue hover:underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link className="text-blue hover:underline" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-cream to-background p-4">
      <Suspense>
        <Form mode={mode} />
      </Suspense>
    </div>
  );
}
