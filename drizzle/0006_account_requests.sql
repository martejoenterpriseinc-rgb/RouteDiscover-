CREATE TABLE "account_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"free_days" integer DEFAULT 0 NOT NULL,
	"token_hash" text,
	"token_expires_at" timestamp with time zone,
	"email_sent" boolean DEFAULT false NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"accepted_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_requests_email_idx" ON "account_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "account_requests_status_idx" ON "account_requests" USING btree ("status");