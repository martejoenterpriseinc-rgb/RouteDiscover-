import { approveRequest, declineRequest } from "@/lib/account-requests";
import { requireOwner } from "@/lib/auth";
import { body, fail, handle, json, str } from "@/lib/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner();
    const { id } = await params;
    const b = await body(req);
    const action = str(b.action, 20);
    if (action === "approve") {
      const freeDays = Number(b.freeDays ?? 0);
      const r = await approveRequest(id, { freeDays: Number.isFinite(freeDays) ? freeDays : 0, ownerId: owner.id });
      return json({ ok: true, ...r });
    }
    if (action === "decline") {
      await declineRequest(id, owner.id);
      return json({ ok: true });
    }
    return fail("Unknown action.");
  } catch (err) {
    return handle(err);
  }
}
