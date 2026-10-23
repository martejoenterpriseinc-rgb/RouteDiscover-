import { requireOwner } from "@/lib/auth";
import { body, handle, json } from "@/lib/http";
import { getDraftForConsole, saveDraft } from "@/lib/settings";

export async function GET() {
  try {
    await requireOwner();
    return json(await getDraftForConsole());
  } catch (err) {
    return handle(err);
  }
}

/** "Update and save": merge a patch into the draft. Nothing goes live until /publish. */
export async function PUT(req: Request) {
  try {
    await requireOwner();
    const patch = await body(req);
    await saveDraft(patch);
    return json(await getDraftForConsole());
  } catch (err) {
    return handle(err);
  }
}
