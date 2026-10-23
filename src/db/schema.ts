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
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripePriceId: text("stripe_price_id"),
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
