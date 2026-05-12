import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_accounts_platform" AS ENUM('instagram');
  CREATE TYPE "public"."enum_accounts_account_type" AS ENUM('business', 'media_creator');
  CREATE TABLE "accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_id" integer NOT NULL,
  	"owner_id" integer NOT NULL,
  	"platform" "enum_accounts_platform" DEFAULT 'instagram' NOT NULL,
  	"platform_user_id" varchar NOT NULL,
  	"username" varchar NOT NULL,
  	"account_type" "enum_accounts_account_type" NOT NULL,
  	"access_token" varchar NOT NULL,
  	"token_expires_at" timestamp(3) with time zone,
  	"connected_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "accounts_id" integer;
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "accounts_brand_idx" ON "accounts" USING btree ("brand_id");
  CREATE INDEX "accounts_owner_idx" ON "accounts" USING btree ("owner_id");
  CREATE INDEX "accounts_platform_idx" ON "accounts" USING btree ("platform");
  CREATE INDEX "accounts_platform_user_id_idx" ON "accounts" USING btree ("platform_user_id");
  CREATE INDEX "accounts_updated_at_idx" ON "accounts" USING btree ("updated_at");
  CREATE INDEX "accounts_created_at_idx" ON "accounts" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_accounts_fk" FOREIGN KEY ("accounts_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("accounts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "accounts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "accounts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_accounts_fk";
  
  DROP INDEX "payload_locked_documents_rels_accounts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "accounts_id";
  DROP TYPE "public"."enum_accounts_platform";
  DROP TYPE "public"."enum_accounts_account_type";`)
}
