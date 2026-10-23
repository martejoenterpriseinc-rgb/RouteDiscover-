"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./AppNav";
import { usePanelOpen } from "./Disclosure";
import { Drawer } from "./Drawer";
import { ThemeToggle } from "./ThemeToggle";

export const OWNER_TABS = [
  { href: "/owner", label: "Dashboard", icon: "📊" },
  { href: "/owner/users", label: "Users", icon: "👥" },
  { href: "/owner/businesses", label: "Businesses", icon: "🏪" },
  { href: "/owner/moderation", label: "Moderation", icon: "🛡️" },
  { href: "/owner/referrals", label: "Referrals", icon: "🎁" },
  { href: "/owner/settings", label: "Pricing & app", icon: "💳" },
  { href: "/owner/integrations", label: "Integrations", icon: "🔌" },
] as const;

/**
 * Owner console frame: a left sidebar that collapses to icons on desktop and becomes a
 * drawer behind a menu button on phones. The collapsed state is remembered on the device.
 */
export function OwnerShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = usePanelOpen("owner-sidebar", true);
  const [drawer, setDrawer] = useState(false);
  const active = (h: string) => (h === "/owner" ? pathname === "/owner" : pathname.startsWith(h));

  const links = (labels: boolean, onClick?: () => void) =>
    OWNER_TABS.map((t) => (
      <Link
        key={t.href}
        href={t.href}
        onClick={onClick}
        title={t.label}
        aria-current={active(t.href) ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${labels ? "" : "justify-center px-0"} ${active(t.href) ? "bg-white text-navy" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
      >
        <span className="text-lg leading-none" aria-hidden>{t.icon}</span>
        {labels && <span className="truncate">{t.label}</span>}
      </Link>
    ));

  return (
    <div className="flex min-h-screen">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-navy text-white transition-[width] md:flex ${expanded ? "w-60" : "w-16"}`}
        aria-label="Owner console"
      >
        <Link href="/owner" className={`flex items-center gap-2 px-3 py-3 ${expanded ? "" : "justify-center"}`} title="Owner dashboard">
          <Image src="/brand/mark.png" alt="" width={32} height={38} className="brand-mark h-9 w-auto" />
          {expanded && (
            <span className="min-w-0">
              <Wordmark className="text-base wordmark-light" />
              <span className="ml-1 rounded-full bg-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Owner</span>
            </span>
          )}
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Owner sections">{links(expanded)}</nav>
        <div className={`flex flex-col gap-2 border-t border-white/10 p-2 ${expanded ? "" : "items-center"}`}>
          {expanded ? <ThemeToggle compact onDark /> : null}
          <Link href="/app" title="Open the app" className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white ${expanded ? "" : "justify-center px-0"}`}>
            <span aria-hidden>🧭</span>
            {expanded && "Open app"}
          </Link>
          {expanded && <p className="truncate px-3 text-[11px] text-white/60" title={email}>{email}</p>}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse menu" : "Expand menu"}
            aria-expanded={expanded}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white ${expanded ? "" : "justify-center px-0"}`}
          >
            <span aria-hidden>{expanded ? "⟨" : "⟩"}</span>
            {expanded && "Collapse"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1100] flex items-center gap-3 border-b border-border bg-navy px-3 py-2 text-white md:hidden">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open owner menu" aria-haspopup="dialog" aria-expanded={drawer} className="rounded-lg p-2 text-xl leading-none hover:bg-white/10">☰</button>
          <Link href="/owner" className="flex items-center gap-2">
            <Image src="/brand/mark.png" alt="" width={28} height={34} className="brand-mark h-8 w-auto" />
            <Wordmark className="text-base wordmark-light" />
            <span className="rounded-full bg-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Owner</span>
          </Link>
          <span className="ml-auto truncate text-xs text-white/80">{OWNER_TABS.find((t) => active(t.href))?.label ?? ""}</span>
        </header>
        {children}
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} side="left" dark title={<span className="flex items-center gap-2"><Wordmark className="text-base wordmark-light" /><span className="rounded-full bg-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Owner</span></span>}>
        <nav className="flex flex-col gap-1 p-3" aria-label="Owner sections">{links(true, () => setDrawer(false))}</nav>
        <div className="flex flex-col gap-2 border-t border-white/10 p-3">
          <ThemeToggle compact onDark />
          <Link href="/app" onClick={() => setDrawer(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10">
            <span aria-hidden>🧭</span> Open app
          </Link>
          <p className="truncate px-3 text-[11px] text-white/60">{email}</p>
        </div>
      </Drawer>
    </div>
  );
}
