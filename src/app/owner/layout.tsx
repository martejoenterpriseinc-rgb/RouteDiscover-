import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OwnerNav } from "@/components/OwnerNav";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/owner");
  if (user.role !== "owner") redirect("/app");
  return (
    <>
      <OwnerNav email={user.email} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 pb-28">{children}</main>
      <footer className="px-4 py-3 text-center text-xs text-muted">
        Owner console · <Link href="/app" className="hover:underline">Back to the app</Link>
      </footer>
    </>
  );
}
