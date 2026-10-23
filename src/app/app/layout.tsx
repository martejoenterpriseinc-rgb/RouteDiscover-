import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { AppNav } from "@/components/AppNav";
import { ApplyPreferences } from "@/components/ApplyPreferences";
import { getCurrentUser } from "@/lib/auth";
import { getAccess } from "@/lib/billing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const access = await getAccess(user);
  if (!access.allowed) redirect("/app/subscribe");
  const db = await getDb();
  const prefs = await db.query.preferences.findFirst({ where: eq(schema.preferences.userId, user.id) });
  return (
    <>
      <AppNav user={{ name: user.name, email: user.email, role: user.role }} />
      <ApplyPreferences prefs={prefs?.data ?? schema.DEFAULT_PREFERENCES} />
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );
}
