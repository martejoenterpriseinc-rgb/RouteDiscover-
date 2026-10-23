import { getCurrentUser } from "@/lib/auth";
import { getBusiness } from "@/lib/business";
import { track } from "@/lib/events";
import { fail, handle, json } from "@/lib/http";
import { buildListingView } from "@/lib/listing-view";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    const b = await getBusiness((await params).id);
    if (!b) return fail("Listing not found.", 404);
    const view = await buildListingView(b, user);
    await track("business_view", { userId: user?.id ?? null, meta: { businessId: b.id, placeId: b.placeId } });
    return json(view);
  } catch (err) {
    return handle(err);
  }
}
