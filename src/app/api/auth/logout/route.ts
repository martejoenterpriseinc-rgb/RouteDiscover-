import { clearSession } from "@/lib/auth";
import { handle, json } from "@/lib/http";

export async function POST() {
  try {
    await clearSession();
    return json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
