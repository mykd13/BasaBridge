CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."decision_kind" AS ENUM('story', 'level', 'plan', 'analysis', 'tries');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'parent');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('reading', 'answering', 'done');--> statement-breakpoint
CREATE TYPE "public"."skill" AS ENUM('vocabulary', 'literal', 'inferential');--> statement-breakpoint
CREATE TYPE "public"."story_source" AS ENUM('generated', 'bank');--> statement-breakpoint
CREATE TABLE "ability_estimates" (
	"learner_user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"weights" jsonb NOT NULL,
	"mean" real NOT NULL,
	"sd" real NOT NULL,
	"items" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ability_estimates_learner_user_id_scope_pk" PRIMARY KEY("learner_user_id","scope")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"chosen" integer NOT NULL,
	"correct" boolean NOT NULL,
	"response_ms" integer,
	"rushed" boolean DEFAULT false NOT NULL,
	"accommodations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weight" real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"try_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"given_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"kind" "decision_kind" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"guardian_email" text NOT NULL,
	"scope" text DEFAULT 'mic' NOT NULL,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_stats" (
	"question_id" uuid PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"retired" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"reading_help" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"grade" integer,
	"level" integer DEFAULT 1 NOT NULL,
	"level_passes" integer DEFAULT 0 NOT NULL,
	"keep_audio" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"learner_user_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"completed_at" timestamp with time zone,
	"recheck_correct" integer DEFAULT 0 NOT NULL,
	"recheck_total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lesson_progress_learner_user_id_lesson_id_pk" PRIMARY KEY("learner_user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parent_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_user_id" uuid NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"status" "link_status" DEFAULT 'pending' NOT NULL,
	"shares_progress" boolean DEFAULT true NOT NULL,
	"shares_analysis" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"start_level" integer NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"voice" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"skill" "skill" NOT NULL,
	"word" text,
	"text" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer_index" integer NOT NULL,
	"evidence" text NOT NULL,
	"subskill" text,
	"type" text DEFAULT 'multiple_choice' NOT NULL,
	"distractors" jsonb,
	"difficulty" real
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_user_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"tries_allowed" integer,
	"tries_used" integer DEFAULT 0 NOT NULL,
	"counted_try_id" uuid,
	"status" "session_status" DEFAULT 'reading' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" integer NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"words" integer NOT NULL,
	"reading_grade" real NOT NULL,
	"source" "story_source" NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"completed" boolean NOT NULL,
	"words_total" integer NOT NULL,
	"words_right" integer NOT NULL,
	"words_per_minute" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"age_band" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "ability_estimates" ADD CONSTRAINT "ability_estimates_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_id_reading_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."reading_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_objects" ADD CONSTRAINT "audio_objects_try_id_tries_id_fk" FOREIGN KEY ("try_id") REFERENCES "public"."tries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_approvals" ADD CONSTRAINT "guardian_approvals_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_stats" ADD CONSTRAINT "item_stats_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_settings" ADD CONSTRAINT "learner_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_codes" ADD CONSTRAINT "link_codes_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_parent_user_id_users_id_fk" FOREIGN KEY ("parent_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_sessions" ADD CONSTRAINT "placement_sessions_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_learner_user_id_users_id_fk" FOREIGN KEY ("learner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tries" ADD CONSTRAINT "tries_session_id_reading_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."reading_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_session_idx" ON "answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "audio_objects_try_idx" ON "audio_objects" USING btree ("try_id");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "decisions_learner_idx" ON "decisions" USING btree ("learner_user_id");--> statement-breakpoint
CREATE INDEX "guardian_approvals_learner_idx" ON "guardian_approvals" USING btree ("learner_user_id");--> statement-breakpoint
CREATE INDEX "link_codes_learner_idx" ON "link_codes" USING btree ("learner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_links_parent_learner_idx" ON "parent_links" USING btree ("parent_user_id","learner_user_id");--> statement-breakpoint
CREATE INDEX "parent_links_learner_idx" ON "parent_links" USING btree ("learner_user_id");--> statement-breakpoint
CREATE INDEX "placement_sessions_learner_idx" ON "placement_sessions" USING btree ("learner_user_id");--> statement-breakpoint
CREATE INDEX "questions_story_idx" ON "questions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "reading_sessions_learner_idx" ON "reading_sessions" USING btree ("learner_user_id");--> statement-breakpoint
CREATE INDEX "tries_session_idx" ON "tries" USING btree ("session_id");