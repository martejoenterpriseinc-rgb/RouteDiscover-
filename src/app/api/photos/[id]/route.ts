import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { canManage, getBusiness } from "@/lib/business";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const db = await getDb();
  const photo = await db.query.photos.findFirst({ where: eq(schema.photos.id, (await params).id) });
  if (!photo) return new Response("Not found", { status: 404 });
  if (!photo.approved) {
    const user = await getCurrentUser();
    const business = await getBusiness(photo.businessId);
    const allowed = user && business && (user.id === photo.userId || canManage(user, business));
    if (!allowed) return new Response("Not found", { status: 404 });
  }
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: { "Content-Type": photo.mime, "Cache-Control": photo.approved ? "public, max-age=86400" : "private, no-store" },
  });
}
