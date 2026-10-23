"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function beacon(type: string, meta: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({ type, meta });
    const queued = navigator.sendBeacon?.("/api/events", new Blob([payload], { type: "application/json" }));
    if (!queued) {
      void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
    }
  } catch {
    /* analytics must never break the page */
  }
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
      <path d="M16.37 12.73c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.14-2.52.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.74-4.13zM13.78 5.1c.71-.87 1.2-2.07 1.07-3.27-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.46z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path fill="#00d7fe" d="M3.6 2.2 13.4 12 3.6 21.8c-.4-.2-.6-.6-.6-1.1V3.3c0-.5.2-.9.6-1.1z" />
      <path fill="#00f076" d="M16.7 8.7 13.4 12 3.6 2.2c.3-.2.7-.2 1.1 0l12 6.5z" />
      <path fill="#ff3a44" d="M16.7 15.3 4.7 21.8c-.4.2-.8.2-1.1 0l9.8-9.8 3.3 3.3z" />
      <path fill="#ffd400" d="M20.4 10.7c.8.4.8 1.7 0 2.1l-3.7 2-3.3-2.8 3.3-3.3 3.7 2z" />
    </svg>
  );
}

export function DownloadButtons({ appStoreUrl, playStoreUrl, compact = false }: { appStoreUrl: string; playStoreUrl: string; compact?: boolean }) {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      beacon("pwa_installed", {});
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const badge = "inline-flex items-center gap-2 rounded-xl bg-[#111] px-4 py-2 text-left text-white shadow transition hover:bg-black";
  const disabled = "inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-left text-muted";
  const sub = "block text-[10px] uppercase tracking-wide opacity-80";
  const main = "block text-sm font-semibold leading-tight";

  return (
    <div className={`flex flex-wrap ${compact ? "gap-2" : "gap-3"}`}>
      {appStoreUrl ? (
        <a href={appStoreUrl} target="_blank" rel="noreferrer" className={badge} onClick={() => beacon("download_click", { platform: "ios" })}>
          <AppleIcon />
          <span>
            <span className={sub}>Download on the</span>
            <span className={main}>App Store</span>
          </span>
        </a>
      ) : (
        <span className={disabled} title="iOS app coming soon">
          <AppleIcon />
          <span>
            <span className={sub}>Coming soon to the</span>
            <span className={main}>App Store</span>
          </span>
        </span>
      )}
      {playStoreUrl ? (
        <a href={playStoreUrl} target="_blank" rel="noreferrer" className={badge} onClick={() => beacon("download_click", { platform: "android" })}>
          <PlayIcon />
          <span>
            <span className={sub}>Get it on</span>
            <span className={main}>Google Play</span>
          </span>
        </a>
      ) : (
        <span className={disabled} title="Android app coming soon">
          <PlayIcon />
          <span>
            <span className={sub}>Coming soon to</span>
            <span className={main}>Google Play</span>
          </span>
        </span>
      )}
      {installEvt && !installed && (
        <button
          type="button"
          className={badge}
          onClick={async () => {
            beacon("download_click", { platform: "pwa" });
            await installEvt.prompt();
            setInstallEvt(null);
          }}
        >
          <span aria-hidden className="text-lg">📲</span>
          <span>
            <span className={sub}>Install the</span>
            <span className={main}>Web App</span>
          </span>
        </button>
      )}
    </div>
  );
}
