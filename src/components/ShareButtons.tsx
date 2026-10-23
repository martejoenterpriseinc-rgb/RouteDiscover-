"use client";

import { useState } from "react";
import { Button } from "./ui";

/** Copy / native share / social links for any URL. */
export function ShareButtons({ url, title, text, onShared }: { url: string; title: string; text?: string; onShared?: (channel: string) => void }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const msg = text ?? title;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const links = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(msg)}&url=${enc(url)}`, channel: "x" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, channel: "facebook" },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${msg} ${url}`)}`, channel: "whatsapp" },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(`${msg}\n\n${url}`)}`, channel: "email" },
    { label: "Text", href: `sms:?&body=${enc(`${msg} ${url}`)}`, channel: "sms" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input readOnly value={url} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" onFocus={(e) => e.currentTarget.select()} />
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              onShared?.("copy");
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked; the field is selectable */
            }
          }}
        >
          {copied ? "Copied!" : "Copy link"}
        </Button>
        {canShare && (
          <Button
            onClick={async () => {
              try {
                await navigator.share({ title, text: msg, url });
                onShared?.("native");
              } catch {
                /* user dismissed */
              }
            }}
          >
            Share…
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.channel === "email" || l.channel === "sms" ? undefined : "_blank"}
            rel="noreferrer"
            onClick={() => onShared?.(l.channel)}
            className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold hover:border-blue hover:text-blue"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
