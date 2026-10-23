import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Business, Submission, User } from "@/db/schema";
import { approvedSubmissions, canManage, planSummary, present, ratingFor, type PresentedBusiness, type PlanSummary } from "./business";
import { getLiveSettings } from "./settings";

export type ListingView = {
  business: PresentedBusiness;
  rating: { rating: number; count: number } | null;
  reviews: Array<{ id: string; rating: number; text: string; author: string; createdAt: string }>;
  menus: Array<{ id: string; text: string; createdAt: string }>;
  specials: Array<{ id: string; text: string; createdAt: string }>;
  photos: Array<{ id: string; caption?: string; width: number; height: number }>;
  plan: PlanSummary;
  canManage: boolean;
  isClaimant: boolean;
  pricing: { basicPriceCents: number; sponsorPriceCents: number; sponsorDays: number; currency: string; paymentRequired: boolean };
};

export async function buildListingView(b: Business, user: User | null): Promise<ListingView> {
  const db = await getDb();
  const s = await getLiveSettings();
  const subs: Submission[] = await approvedSubmissions(b.id);
  const authors = new Map<string, string>();
  for (const sub of subs) {
    if (!authors.has(sub.userId)) {
      const u = await db.query.users.findFirst({ where: eq(schema.users.id, sub.userId) });
      authors.set(sub.userId, u?.name?.split(" ")[0] || "Traveler");
    }
  }
  const photoRows = await db.query.photos.findMany({ where: and(eq(schema.photos.businessId, b.id), eq(schema.photos.approved, true)), orderBy: [desc(schema.photos.createdAt)], limit: 24 });
  const captions = new Map(subs.filter((x) => x.type === "photo" && x.payload.photoId).map((x) => [x.payload.photoId!, x.payload.caption]));
  const rating = (await ratingFor([b.id])).get(b.id) ?? null;
  const stripeReady = !!s.integrations.stripe.secretKey && !!s.business.stripeBasicPriceId;
  return {
    business: present(b),
    rating,
    reviews: subs.filter((x) => x.type === "review").map((x) => ({ id: x.id, rating: x.payload.rating ?? 0, text: x.payload.text ?? "", author: authors.get(x.userId) ?? "Traveler", createdAt: x.createdAt.toISOString() })),
    menus: subs.filter((x) => x.type === "menu").map((x) => ({ id: x.id, text: x.payload.text ?? "", createdAt: x.createdAt.toISOString() })),
    specials: subs.filter((x) => x.type === "special").map((x) => ({ id: x.id, text: x.payload.text ?? "", createdAt: x.createdAt.toISOString() })),
    photos: photoRows.map((p) => ({ id: p.id, caption: captions.get(p.id), width: p.width, height: p.height })),
    plan: await planSummary(b),
    canManage: !!user && canManage(user, b),
    isClaimant: !!user && b.claimedBy === user.id && b.claimStatus === "claimed",
    pricing: { basicPriceCents: s.business.basicPriceCents, sponsorPriceCents: s.business.sponsorPriceCents, sponsorDays: s.business.sponsorDays, currency: s.pricing.currency, paymentRequired: s.business.requirePayment && stripeReady },
  };
}
