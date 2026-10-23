"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "./AppNav";
import { Button, ErrorNote } from "./ui";

export function RequestAccountForm({ title, message, notice }: { title: string; message: string; notice?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const field = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none ring-blue/40 focus:ring-2";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, note }) });
      const j = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      setDone(j.status === "approved" ? "Your request was already approved — check your email for the link to create your account." : "Thanks! We'll email you as soon as your account is approved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-cream to-background p-4">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <Image src="/brand/mark.png" alt="" width={48} height={58} className="brand-mark h-14 w-auto" priority />
          <Wordmark className="text-2xl" />
          <h1 className="mt-2 text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted">{message}</p>
          {notice && <p className="mt-1 text-xs font-semibold text-coral">{notice}</p>}
        </div>
        {done ? (
          <p className="rounded-xl border border-green/40 bg-green/10 p-3 text-center text-sm font-semibold text-green">{done}</p>
        ) : (
          <>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Name</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Email</span>
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">What are you planning? (optional)</span>
              <textarea className={field} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Road trips, EV charging stops, business travel…" />
            </label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Request an account"}</Button>
          </>
        )}
        <p className="text-center text-sm text-muted">
          Already have an account? <Link className="text-blue hover:underline" href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
