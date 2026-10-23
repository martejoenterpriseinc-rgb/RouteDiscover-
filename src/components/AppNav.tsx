"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/app", label: "Route", icon: "🛣️" },
  { href: "/app/destination", label: "Destination", icon: "📍" },
  { href: "/app/charging", label: "Charging", icon: "⚡" },
  { href: "/app/hotels", label: "Hotels", icon: "🏨" },
  { href: "/app/trips", label: "Trips", icon: "🗓️" },
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
  const active = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-[1100] border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <Link href="/app" className="flex items-center gap-2" aria-label="RouteDiscover home">
            <Image src="/brand/mark.png" alt="" width={36} height={43} priority className="h-10 w-auto" />
            <Wordmark className="text-xl" />
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active(t.href) ? "bg-navy text-white" : "text-muted hover:bg-cream hover:text-foreground"
                }`}
              >
                <span className="mr-1" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            {user.role === "owner" && (
              <Link href="/owner" className="rounded-full border border-orange/60 bg-cream px-3 py-1 text-xs font-semibold text-orange hover:bg-orange hover:text-white">
                Owner
              </Link>
            )}
            <Link
              href="/app/account"
              aria-label="Account and preferences"
              title={user.email}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                pathname.startsWith("/app/account") ? "bg-orange" : "bg-blue"
              }`}
            >
              {initials}
            </Link>
            <button type="button" onClick={logout} className="hidden text-xs font-semibold text-muted hover:text-foreground md:block">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-[1100] grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active(t.href) ? "text-blue" : "text-muted"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
