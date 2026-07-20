ALTER TABLE "game_providers" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bonuses" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "deleted_at" timestamp with time zone;