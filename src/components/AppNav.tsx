"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Drawer } from "./Drawer";
import { ThemeToggle } from "./ThemeToggle";

const TABS = [
  { href: "/app/home", label: "Home", icon: "🏠" },
  { href: "/app", label: "Route", icon: "🛣️" },
  { href: "/app/destination", label: "Destination", icon: "📍" },
  { href: "/app/charging", label: "Charging", icon: "⚡" },
  { href: "/app/hotels", label: "Stays", icon: "🏨" },
  { href: "/app/trips", label: "Trips", icon: "🗓️" },
] as const;

const MORE = [
  { href: "/app/account", label: "Account & preferences", icon: "👤" },
  { href: "/app/referrals", label: "Refer & earn", icon: "🎁" },
  { href: "/app/business", label: "My businesses", icon: "🏪" },
] as const;

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="route">Route</span>
      <span className="discover">Discover</span>
    </span>
  );
}

export type NavUser = { name: string; email: string; role: "user" | "owner" };

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const item = (t: { href: string; label: string; icon: string }, onClick?: () => void) => (
    <Link
      key={t.href}
      href={t.href}
      onClick={onClick}
      aria-current={active(t.href) ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active(t.href) ? "bg-navy text-white" : "hover:bg-cream"}`}
    >
      <span className="text-lg leading-none" aria-hidden>{t.icon}</span>
      {t.label}
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-[1100] border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <Link href="/app/home" className="flex items-center gap-2" aria-label="RouteDiscover home">
            <Image src="/brand/mark.png" alt="" width={36} height={43} priority className="brand-mark h-10 w-auto" />
            <Wordmark className="text-lg sm:text-xl" />
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active(t.href) ? "page" : undefined}
                title={t.label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active(t.href) ? "bg-navy text-white" : "text-muted hover:bg-cream hover:text-foreground"
                }`}
              >
                <span aria-hidden>{t.icon}</span>
                <span className="hidden lg:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <ThemeToggle compact className="hidden sm:inline-flex" />
            {user.role === "owner" && (
              <Link href="/owner" className="hidden rounded-full border border-orange/60 bg-cream px-3 py-1 text-xs font-semibold text-orange hover:bg-orange hover:text-white sm:block">
                Owner
              </Link>
            )}
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open profile menu"
              aria-haspopup="dialog"
              aria-expanded={drawer}
              title={user.email}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${pathname.startsWith("/app/account") ? "bg-orange" : "bg-blue"}`}
            >
              {initials}
            </button>
          </div>
        </div>
        {/* Phones and small tablets: icons across the top. */}
        <nav className="hide-scrollbar flex gap-1 overflow-x-auto border-t border-border px-2 py-1 md:hidden" aria-label="Primary">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active(t.href) ? "page" : undefined}
              className={`flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium ${active(t.href) ? "bg-navy text-white" : "text-muted"}`}
            >
              <span className="text-lg leading-none" aria-hidden>{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={<span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue text-sm font-bold text-white">{initials}</span><span className="min-w-0"><span className="block truncate text-sm">{user.name || "Traveler"}</span><span className="block truncate text-xs font-normal text-muted">{user.email}</span></span></span>}>
        <div className="flex flex-col gap-1 p-3">
          {MORE.map((t) => item(t, () => setDrawer(false)))}
          {user.role === "owner" && item({ href: "/owner", label: "Owner console", icon: "🛠️" }, () => setDrawer(false))}
          <div className="my-2 border-t border-border" />
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">Go to</p>
          {TABS.map((t) => item(t, () => setDrawer(false)))}
          <div className="my-2 border-t border-border" />
          <div className="px-3 py-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Appearance</p>
            <ThemeToggle />
          </div>
          <button type="button" onClick={logout} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-coral hover:bg-cream">
            <span className="text-lg leading-none" aria-hidden>🚪</span>
            Sign out
          </button>
        </div>
      </Drawer>
    </>
  );
}
