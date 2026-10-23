import { listAccountRequests } from "@/lib/account-requests";
import { requireOwner } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export async function GET() {
  try {
    await requireOwner();
    return json({ requests: await listAccountRequests() });
  } catch (err) {
    return handle(err);
  }
}
