CREATE TYPE "public"."ai_call_kind" AS ENUM('story', 'verifier', 'notes', 'speech', 'tts');--> statement-breakpoint
CREATE TYPE "public"."ai_call_outcome" AS ENUM('ok', 'error', 'timeout', 'invalid', 'limited');--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "ai_call_kind" NOT NULL,
	"model" text NOT NULL,
	"outcome" "ai_call_outcome" NOT NULL,
	"latency_ms" integer NOT NULL,
	"cost_usd" double precision,
	"learner_user_id" uuid,
	"story_id" uuid,
	"run_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_counters" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_counters_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_at_idx" ON "ai_calls" USING btree ("at");--> statement-breakpoint
CREATE INDEX "ai_calls_learner_at_idx" ON "ai_calls" USING btree ("learner_user_id","at");--> statement-breakpoint
CREATE INDEX "ai_calls_story_idx" ON "ai_calls" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "ai_calls_run_idx" ON "ai_calls" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "rate_counters_expires_idx" ON "rate_counters" USING btree ("expires_at");