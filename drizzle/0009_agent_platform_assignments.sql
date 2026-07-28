CREATE TABLE "agent_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_platform_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "agent_platforms_agent_platform_uq" ON "agent_platforms" USING btree ("agent_id","platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_platform_mappings_agent_platform_uq" ON "agent_platform_mappings" USING btree ("agent_id","platform_id");--> statement-breakpoint
ALTER TABLE "agent_platforms" ADD CONSTRAINT "agent_platforms_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_platforms" ADD CONSTRAINT "agent_platforms_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_platform_mappings" ADD CONSTRAINT "agent_platform_mappings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_platform_mappings" ADD CONSTRAINT "agent_platform_mappings_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
