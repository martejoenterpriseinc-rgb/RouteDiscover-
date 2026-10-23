import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { CategoryId, GeoResult, LatLng, Place } from "@/lib/types";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<"user" | "owner">().notNull().default("user"),
    referralCode: text("referral_code").notNull(),
    referredBy: text("referred_by"),
    stripeCustomerId: text("stripe_customer_id"),
    banned: boolean("banned").notNull().default(false),
    bannedReason: text("banned_reason"),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_referral_idx").on(t.referralCode)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** sha256 of the cookie token */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type Preferences = {
  radiusMiles: number;
  categories: CategoryId[];
  units: "mi" | "km";
  vehicle: "tesla" | "other-ev" | "gas";
  connector: "nacs" | "ccs" | "j1772" | "none";
  home?: GeoResult;
  walkRadius: number;
  marketingOptIn: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  radiusMiles: 10,
  categories: ["attractions", "food", "outdoors", "historic"],
  units: "mi",
  vehicle: "tesla",
  connector: "nacs",
  walkRadius: 0.5,
  marketingOptIn: true,
};

export const preferences = pgTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Preferences>().notNull(),
  updatedAt: updatedAt(),
});

export type TripStop = Place & { addedAt: string; note?: string; day?: string };

export const trips = pgTable(
  "trips",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    origin: jsonb("origin").$type<GeoResult>().notNull(),
    destination: jsonb("destination").$type<GeoResult>().notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    radiusMiles: integer("radius_miles").notNull().default(10),
    routeGeometry: jsonb("route_geometry").$type<LatLng[]>(),
    distanceMiles: real("distance_miles"),
    durationMinutes: real("duration_minutes"),
    stops: jsonb("stops").$type<TripStop[]>().notNull().default(sql`'[]'::jsonb`),
    notes: text("notes").notNull().default(""),
    status: text("status").$type<"planned" | "completed" | "canceled">().notNull().default("planned"),
    shareToken: text("share_token").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("trips_user_idx").on(t.userId), uniqueIndex("trips_share_idx").on(t.shareToken)],
);

export const invites = pgTable(
  "invites",
  {
    id: id(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    channel: text("channel").$type<"email" | "link" | "social">().notNull().default("link"),
    tripId: text("trip_id"),
    acceptedBy: text("accepted_by"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("invites_inviter_idx").on(t.inviterId)],
);

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Stripe subscription id, or the checkout session id for a one-time pass, or "trial:<userId>". */
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripePriceId: text("stripe_price_id"),
    /** "subscription" renews on its own; "pass" and "trial" expire at currentPeriodEnd. */
    kind: text("kind").$type<"subscription" | "pass" | "trial">().notNull().default("subscription"),
    amountCents: integer("amount_cents").notNull().default(0),
    status: text("status").$type<SubscriptionStatus>().notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("subs_stripe_idx").on(t.stripeSubscriptionId), index("subs_user_idx").on(t.userId)],
);

/** Owner-managed configuration. `draft` is edited in the console; `live` is what the app runs on. */
export const settings = pgTable("settings", {
  scope: text("scope").$type<"draft" | "live">().primaryKey(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    userId: text("user_id"),
    anonId: text("anon_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index("events_type_idx").on(t.type, t.createdAt), index("events_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type AppEvent = typeof events.$inferSelect;

/* ------------------------------------------------------------------ */
/* Businesses, plans, community submissions                            */
/* ------------------------------------------------------------------ */

/** Snapshot of what online sources (OpenStreetMap, Open Charge Map, demo data) say about a place. */
export type BusinessSource = {
  name: string;
  category: CategoryId;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  cuisine?: string;
  tags?: Record<string, string>;
  provider: "osm" | "ocm" | "demo" | "unknown";
};

export const businesses = pgTable(
  "businesses",
  {
    id: id(),
    /** Provider id of the place this listing represents (e.g. osm-node-123). */
    placeId: text("place_id").notNull(),
    source: jsonb("source").$type<BusinessSource>().notNull(),
    sourceSyncedAt: timestamp("source_synced_at", { withTimezone: true }).notNull().defaultNow(),
    /* Owner-entered overrides; null means "use the synced value". */
    name: text("name"),
    address: text("address"),
    phone: text("phone"),
    website: text("website"),
    hours: text("hours"),
    description: text("description"),
    menu: text("menu"),
    specials: text("specials"),
    claimedBy: text("claimed_by"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimStatus: text("claim_status").$type<"unclaimed" | "claimed" | "revoked">().notNull().default("unclaimed"),
    sponsorUntil: timestamp("sponsor_until", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("businesses_place_idx").on(t.placeId), index("businesses_claimed_idx").on(t.claimedBy), index("businesses_sponsor_idx").on(t.sponsorUntil)],
);

export type BusinessPlanKind = "basic" | "sponsor";

export const businessPlans = pgTable(
  "business_plans",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    plan: text("plan").$type<BusinessPlanKind>().notNull(),
    status: text("status").$type<"pending" | "active" | "canceled" | "expired">().notNull().default("pending"),
    /** Stripe subscription id (basic), checkout session / payment intent id (sponsor), or "manual". */
    stripeRef: text("stripe_ref"),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("business_plans_business_idx").on(t.businessId), index("business_plans_user_idx").on(t.userId), index("business_plans_ref_idx").on(t.stripeRef)],
);

export type SubmissionType = "review" | "photo" | "menu" | "special" | "hours" | "info";
export type SubmissionPayload = {
  text?: string;
  rating?: number;
  photoId?: string;
  caption?: string;
  /** For "info": which override field and the proposed value. */
  field?: "name" | "address" | "phone" | "website" | "hours" | "description";
  value?: string;
};

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    type: text("type").$type<SubmissionType>().notNull(),
    payload: jsonb("payload").$type<SubmissionPayload>().notNull(),
    status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
    riskScore: integer("risk_score").notNull().default(0),
    riskFlags: jsonb("risk_flags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Flagged submissions need the RouteDiscover owner, not just the business. */
    flagged: boolean("flagged").notNull().default(false),
    reviewedBy: text("reviewed_by"),
    reviewedRole: text("reviewed_role").$type<"business" | "owner">(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("submissions_business_idx").on(t.businessId, t.status), index("submissions_status_idx").on(t.status, t.flagged), index("submissions_user_idx").on(t.userId, t.createdAt)],
);

export const photos = pgTable(
  "photos",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    mime: text("mime").notNull(),
    /** base64 JPEG/WebP, resized on upload. */
    data: text("data").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    approved: boolean("approved").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("photos_business_idx").on(t.businessId, t.approved)],
);

export type Business = typeof businesses.$inferSelect;
export type BusinessPlan = typeof businessPlans.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Photo = typeof photos.$inferSelect;

/* ------------------------------------------------------------------ */
/* Referral program                                                    */
/* ------------------------------------------------------------------ */

export const referrals = pgTable(
  "referrals",
  {
    id: id(),
    referrerId: text("referrer_id").notNull(),
    refereeId: text("referee_id").notNull(),
    /** Paid periods (passes or paid invoices) the referee has completed. */
    paidPeriods: integer("paid_periods").notNull().default(0),
    firstPaidAt: timestamp("first_paid_at", { withTimezone: true }),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("referrals_referee_idx").on(t.refereeId), index("referrals_referrer_idx").on(t.referrerId)],
);

export const credits = pgTable(
  "credits",
  {
    id: id(),
    userId: text("user_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").$type<"referral_bonus" | "referee_bonus" | "manual">().notNull(),
    referralId: text("referral_id"),
    status: text("status").$type<"available" | "pending" | "applied">().notNull().default("available"),
    /** Checkout session the credit was attached to. */
    checkoutSessionId: text("checkout_session_id"),
    note: text("note"),
    createdAt: createdAt(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (t) => [index("credits_user_idx").on(t.userId, t.status)],
);

export type Referral = typeof referrals.$inferSelect;
export type Credit = typeof credits.$inferSelect;
