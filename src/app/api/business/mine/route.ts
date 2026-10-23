import { requireUser } from "@/lib/auth";
import { myBusinesses, planSummary, present } from "@/lib/business";
import { handle, json } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await myBusinesses(user.id);
    const out = [];
    for (const b of rows) out.push({ ...present(b), plan: await planSummary(b) });
    return json({ businesses: out });
  } catch (err) {
    return handle(err);
  }
}
