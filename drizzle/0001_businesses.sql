CREATE TABLE "business_plans" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"plan" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_ref" text,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" text NOT NULL,
	"source" jsonb NOT NULL,
	"source_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"address" text,
	"phone" text,
	"website" text,
	"hours" text,
	"description" text,
	"menu" text,
	"specials" text,
	"claimed_by" text,
	"claimed_at" timestamp with time zone,
	"claim_status" text DEFAULT 'unclaimed' NOT NULL,
	"sponsor_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"mime" text NOT NULL,
	"data" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"reviewed_by" text,
	"reviewed_role" text,
	"reviewed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_plans_business_idx" ON "business_plans" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_plans_user_idx" ON "business_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_plans_ref_idx" ON "business_plans" USING btree ("stripe_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_place_idx" ON "businesses" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "businesses_claimed_idx" ON "businesses" USING btree ("claimed_by");--> statement-breakpoint
CREATE INDEX "businesses_sponsor_idx" ON "businesses" USING btree ("sponsor_until");--> statement-breakpoint
CREATE INDEX "photos_business_idx" ON "photos" USING btree ("business_id","approved");--> statement-breakpoint
CREATE INDEX "submissions_business_idx" ON "submissions" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status","flagged");--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id","created_at");