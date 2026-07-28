ALTER TABLE "agent_platform_mappings" ADD COLUMN "available_from_time" text;
ALTER TABLE "agent_platforms" ADD COLUMN "available_from_time" text;
ALTER TABLE "agent_platform_mappings" ADD COLUMN "available_to_time" text;
ALTER TABLE "agent_platforms" ADD COLUMN "available_to_time" text;