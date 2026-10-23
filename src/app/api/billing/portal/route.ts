import { requireUser } from "@/lib/auth";
import { fail, handle, json } from "@/lib/http";
import { siteOrigin } from "@/lib/site";
import { createPortalSession } from "@/lib/stripe";

export async function POST() {
  try {
    const user = await requireUser();
    const url = await createPortalSession(user, await siteOrigin());
    return json({ url });
  } catch (err) {
    if (err instanceof Error && /not set up|not configured/i.test(err.message)) return fail(err.message, 409);
    return handle(err);
  }
}
