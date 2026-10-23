CREATE TABLE "happenings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"price" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'community' NOT NULL,
	"source_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "happenings_time_idx" ON "happenings" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "happenings_source_idx" ON "happenings" USING btree ("source","source_id");