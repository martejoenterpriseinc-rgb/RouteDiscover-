"use client";

import { useEffect } from "react";

/** Slide-in panel with a dimmed backdrop. Closes on the backdrop, the ✕ button or Escape. */
export function Drawer({ open, onClose, side = "right", title, children, dark = false }: { open: boolean; onClose: () => void; side?: "left" | "right"; title?: React.ReactNode; children: React.ReactNode; dark?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const skin = dark ? "bg-navy text-white" : "bg-surface text-foreground";
  return (
    <div className="fixed inset-0 z-[1200]" role="presentation">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Menu"} className={`absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} flex w-[min(86vw,320px)] flex-col shadow-2xl ${skin}`} style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className={`flex items-center justify-between gap-2 border-b px-4 py-3 ${dark ? "border-white/15" : "border-border"}`}>
          <div className="min-w-0 font-semibold">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" className={`rounded-full p-1 text-lg leading-none ${dark ? "hover:bg-white/10" : "hover:bg-cream"}`}>✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
