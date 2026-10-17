CREATE TABLE "email_suppressions" (
	"address_hash" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"provider_email_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
