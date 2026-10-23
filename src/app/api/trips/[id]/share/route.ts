import { requireUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { track } from "@/lib/events";
import { body, fail, handle, json, str } from "@/lib/http";
import { siteOrigin } from "@/lib/site";
import { getTrip, updateTrip } from "@/lib/trips";

type Ctx = { params: Promise<{ id: string }> };

/** POST { action: "enable" | "disable" | "rotate" } → public share link state. */
export async function POST(req: Request, { params }: Ctx) {
  const b = await body(req);
  try {
    const user = await requireUser();
    const { id } = await params;
    const trip = await getTrip(user.id, id);
    if (!trip) return fail("Trip not found.", 404);
    const action = str(b.action, 10) || "enable";
    const patch = action === "disable" ? { isPublic: false } : action === "rotate" ? { isPublic: true, shareToken: randomToken(12) } : { isPublic: true };
    const updated = (await updateTrip(user.id, id, patch))!;
    if (action !== "disable") await track("trip_shared", { userId: user.id, meta: { tripId: id, channel: str(b.channel, 20) || "link" } });
    const origin = await siteOrigin();
    return json({ isPublic: updated.isPublic, url: `${origin}/t/${updated.shareToken}` });
  } catch (err) {
    return handle(err);
  }
}
