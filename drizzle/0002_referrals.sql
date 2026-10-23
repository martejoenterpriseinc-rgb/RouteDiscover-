CREATE TABLE "credits" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"referral_id" text,
	"status" text DEFAULT 'available' NOT NULL,
	"checkout_session_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" text NOT NULL,
	"referee_id" text NOT NULL,
	"paid_periods" integer DEFAULT 0 NOT NULL,
	"first_paid_at" timestamp with time zone,
	"qualified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "kind" text DEFAULT 'subscription' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "credits_user_idx" ON "credits" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referee_idx" ON "referrals" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");