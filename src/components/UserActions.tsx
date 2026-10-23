"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

export function UserActions({ id, role, banned }: { id: string; role: string; banned: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function act(action: string) {
    setBusy(true);
    const res = await fetch(`/api/owner/users/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const j = (await res.json()) as { url?: string };
    setBusy(false);
    if (action === "reset_link" && j.url) setLink(j.url);
    else router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <div className="flex gap-1">
        <Button variant="ghost" className="px-2 py-0.5 text-xs" disabled={busy} onClick={() => act("reset_link")}>Reset link</Button>
        {role !== "owner" && (
          <Button variant="ghost" className={`px-2 py-0.5 text-xs ${banned ? "" : "text-coral"}`} disabled={busy} onClick={() => { if (banned || confirm("Ban this user? They are signed out and can no longer sign in or submit updates.")) void act(banned ? "unban" : "ban"); }}>
            {banned ? "Unban" : "Ban"}
          </Button>
        )}
      </div>
      {link && <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-64 rounded border border-border bg-background px-2 py-1 text-[11px]" title="Send this to the user; it works for one hour" />}
    </div>
  );
}
