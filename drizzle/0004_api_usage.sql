CREATE TABLE "api_usage" (
	"month" text NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_usage_idx" ON "api_usage" USING btree ("month","provider","kind");