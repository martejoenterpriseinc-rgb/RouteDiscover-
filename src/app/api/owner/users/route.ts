import { requireOwner } from "@/lib/auth";
import { handle, json } from "@/lib/http";
import { listUsersForOwner } from "@/lib/stats";

export async function GET() {
  try {
    await requireOwner();
    return json({ users: await listUsersForOwner() });
  } catch (err) {
    return handle(err);
  }
}
