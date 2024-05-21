CREATE TABLE IF NOT EXISTS "bugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"price" double precision,
	"attributes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
