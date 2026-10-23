"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./AppNav";
import { ThemeToggle } from "./ThemeToggle";

const TABS = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/users", label: "Users" },
  { href: "/owner/businesses", label: "Businesses" },
  { href: "/owner/moderation", label: "Moderation" },
  { href: "/owner/referrals", label: "Referrals" },
  { href: "/owner/settings", label: "Pricing & app" },
  { href: "/owner/integrations", label: "Integrations" },
];

export function OwnerNav({ email }: { email: string }) {
  const pathname = usePathname();
  const active = (h: string) => (h === "/owner" ? pathname === "/owner" : pathname.startsWith(h));
  return (
    <header className="sticky top-0 z-[1100] border-b border-border bg-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2">
        <Link href="/owner" className="flex items-center gap-2">
          <Image src="/brand/mark.png" alt="" width={32} height={38} className="brand-mark h-9 w-auto" />
          <Wordmark className="text-lg wordmark-light" />
          <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Owner</span>
        </Link>
        <nav className="hide-scrollbar flex gap-1 overflow-x-auto md:ml-6">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${active(t.href) ? "bg-white text-navy" : "text-white/80 hover:bg-white/10"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-white/80">
          <ThemeToggle compact onDark />
          <span className="hidden sm:inline">{email}</span>
          <Link href="/app" className="rounded-full border border-white/40 px-3 py-1 font-semibold hover:bg-white/10">
            Open app →
          </Link>
        </div>
      </div>
    </header>
  );
}
