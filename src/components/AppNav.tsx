"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Route", icon: "🛣️" },
  { href: "/destination", label: "Destination", icon: "📍" },
  { href: "/charging", label: "Charging", icon: "⚡" },
  { href: "/hotels", label: "Hotels", icon: "🏨" },
] as const;

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="route">Route</span>
      <span className="discover">Discover</span>
    </span>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-[1100] border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2" aria-label="RouteDiscover home">
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
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-[1100] grid grid-cols-4 border-t border-border bg-surface/95 backdrop-blur md:hidden"
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
