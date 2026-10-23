import { getCurrentUser } from "@/lib/auth";
import { track } from "@/lib/events";
import { body, json, str } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** POST { kind: website | maps | call } */
export async function POST(req: Request, { params }: Ctx) {
  const b = await body(req);
  const kind = str(b.kind, 20) || "other";
  const user = await getCurrentUser().catch(() => null);
  await track("business_click", { userId: user?.id ?? null, meta: { businessId: (await params).id, kind } });
  return json({ ok: true });
}
