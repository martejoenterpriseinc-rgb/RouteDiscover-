import sharp from "sharp";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { canManage, getBusiness, submitterContext } from "@/lib/business";
import { track } from "@/lib/events";
import { fail, handle, json } from "@/lib/http";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, scoreSubmission } from "@/lib/moderation";
import { getLiveSettings } from "@/lib/settings";

type Ctx = { params: Promise<{ id: string }> };

/** POST multipart { file, caption? } → pending photo submission (auto-approved for the business owner). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    if (user.banned) return fail("This account can't submit updates.", 403);
    const business = await getBusiness((await params).id);
    if (!business) return fail("Listing not found.", 404);
    const form = await req.formData();
    const file = form.get("file");
    const caption = String(form.get("caption") ?? "").slice(0, 300);
    if (!(file instanceof File)) return fail("Attach an image.");
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail("Use a JPEG, PNG, WebP or HEIC image.");
    if (file.size > MAX_IMAGE_BYTES) return fail("Images must be under 8 MB.");
    const input = Buffer.from(await file.arrayBuffer());
    let out: { data: Buffer; info: { width: number; height: number } };
    try {
      out = await sharp(input).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer({ resolveWithObject: true });
    } catch {
      return fail("That image couldn't be read. Try a different photo.");
    }
    const db = await getDb();
    const manager = canManage(user, business);
    const [photo] = await db.insert(schema.photos).values({ businessId: business.id, userId: user.id, mime: "image/jpeg", data: out.data.toString("base64"), width: out.info.width, height: out.info.height, approved: manager }).returning();
    const payload = { photoId: photo.id, caption };
    const ctx = await submitterContext(user, business.id);
    const risk = manager ? { score: 0, flags: [] as string[] } : scoreSubmission("photo", payload, ctx);
    const s = await getLiveSettings();
    const flagged = !manager && risk.score >= s.business.flagThreshold;
    const [sub] = await db
      .insert(schema.submissions)
      .values({ businessId: business.id, userId: user.id, type: "photo", payload, riskScore: risk.score, riskFlags: risk.flags, flagged, status: manager ? "approved" : "pending", reviewedBy: manager ? user.id : null, reviewedRole: manager ? "business" : null, reviewedAt: manager ? new Date() : null })
      .returning();
    await track("submission_created", { userId: user.id, meta: { businessId: business.id, type: "photo", riskScore: risk.score, flagged } });
    return json({ ok: true, photoId: photo.id, status: sub.status }, { status: 201 });
  } catch (err) {
    return handle(err);
  }
}
