import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_jobs" ADD COLUMN "account_id" integer;
  ALTER TABLE "content_jobs" ADD COLUMN "published_at" timestamp(3) with time zone;
  ALTER TABLE "content_jobs" ADD COLUMN "published_media_id" varchar;
  ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "content_jobs_account_idx" ON "content_jobs" USING btree ("account_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_jobs" DROP CONSTRAINT "content_jobs_account_id_accounts_id_fk";
  
  DROP INDEX "content_jobs_account_idx";
  ALTER TABLE "content_jobs" DROP COLUMN "account_id";
  ALTER TABLE "content_jobs" DROP COLUMN "published_at";
  ALTER TABLE "content_jobs" DROP COLUMN "published_media_id";`)
}
