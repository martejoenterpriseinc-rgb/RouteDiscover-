import type { Metadata } from "next";
import { Badge } from "@/components/ui";
import { listUsersForOwner } from "@/lib/stats";

export const metadata: Metadata = { title: "Users" };

export default async function OwnerUsersPage() {
  const users = await listUsersForOwner();
  const tone = (st: string) => (st === "active" || st === "trialing" ? "free" : st === "none" ? "neutral" : "paid");
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
      <p className="text-sm text-muted">{users.length} accounts, newest first.</p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Subscription</th>
              <th className="px-3 py-2">Trips</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-semibold">{u.name || "—"} {u.role === "owner" && <Badge tone="tesla">Owner</Badge>} {u.referred && <Badge tone="blue">Referred</Badge>}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={tone(u.subscription)}>{u.subscription === "none" ? "None" : u.subscription.replace("_", " ")}</Badge>
                  {u.cancelAtPeriodEnd && <span className="ml-1 text-xs text-muted">cancels at period end</span>}
                </td>
                <td className="px-3 py-2">{u.trips}</td>
                <td className="px-3 py-2 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-muted">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : "never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
