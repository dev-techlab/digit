ALTER TABLE "game_platforms" ADD COLUMN "external_id" integer;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "provider_code" text;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "provider_type" text;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "launch_url" text;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "synced_at" timestamp with time zone;