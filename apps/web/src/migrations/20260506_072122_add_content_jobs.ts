import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_jobs_status" AS ENUM('queued', 'generating', 'ready', 'approved', 'published', 'failed');
  CREATE TABLE "content_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_id" integer NOT NULL,
  	"owner_id" integer NOT NULL,
  	"topic" varchar NOT NULL,
  	"status" "enum_content_jobs_status" DEFAULT 'queued' NOT NULL,
  	"input_payload" jsonb,
  	"draft_payload" jsonb,
  	"error" varchar,
  	"provider" varchar,
  	"model" varchar,
  	"voice_samples_used" numeric DEFAULT 0,
  	"cost_cents" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_jobs_id" integer;
  ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "content_jobs_brand_idx" ON "content_jobs" USING btree ("brand_id");
  CREATE INDEX "content_jobs_owner_idx" ON "content_jobs" USING btree ("owner_id");
  CREATE INDEX "content_jobs_status_idx" ON "content_jobs" USING btree ("status");
  CREATE INDEX "content_jobs_updated_at_idx" ON "content_jobs" USING btree ("updated_at");
  CREATE INDEX "content_jobs_created_at_idx" ON "content_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_jobs_fk" FOREIGN KEY ("content_jobs_id") REFERENCES "public"."content_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("content_jobs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_jobs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "content_jobs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_jobs_fk";
  
  DROP INDEX "payload_locked_documents_rels_content_jobs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_jobs_id";
  DROP TYPE "public"."enum_content_jobs_status";`)
}
