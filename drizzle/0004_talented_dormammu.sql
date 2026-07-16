ALTER TYPE "public"."withdraw_method" ADD VALUE 'bitcoin_lightning' BEFORE 'bank_card';--> statement-breakpoint
CREATE TABLE "agent_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"title" text NOT NULL,
	"content" text,
	"notice_type" text DEFAULT 'General' NOT NULL,
	"notice_level" text DEFAULT 'Normal' NOT NULL,
	"publisher" text DEFAULT 'Platform' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD COLUMN "balance_before" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD COLUMN "balance_after" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD COLUMN "remark" text;--> statement-breakpoint
ALTER TABLE "agent_notices" ADD CONSTRAINT "agent_notices_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;