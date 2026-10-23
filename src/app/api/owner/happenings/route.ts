import { requireOwner } from "@/lib/auth";
import { track } from "@/lib/events";
import { listHappeningsForOwner, moderateHappening } from "@/lib/happenings";
import { body, fail, handle, json, str } from "@/lib/http";

export async function GET(req: Request) {
  try {
    await requireOwner();
    const status = new URL(req.url).searchParams.get("status") ?? "pending";
    const s = (["pending", "approved", "rejected", "all"] as const).find((x) => x === status) ?? "pending";
    return json({ events: await listHappeningsForOwner(s) });
  } catch (err) {
    return handle(err);
  }
}

export async function POST(req: Request) {
  const b = await body(req);
  try {
    const owner = await requireOwner();
    const id = str(b.id, 80);
    const decision = b.decision === "approved" || b.decision === "rejected" ? b.decision : null;
    if (!id || !decision) return fail("id and decision are required.");
    await moderateHappening(id, decision);
    await track("event_moderated", { userId: owner.id, meta: { id, decision } });
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
