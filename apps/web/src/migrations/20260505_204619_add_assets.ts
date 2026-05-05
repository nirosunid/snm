import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "assets_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "assets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_id" integer NOT NULL,
  	"owner_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"file_id" integer NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "assets_id" integer;
  ALTER TABLE "assets_tags" ADD CONSTRAINT "assets_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "assets" ADD CONSTRAINT "assets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "assets" ADD CONSTRAINT "assets_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "assets_tags_order_idx" ON "assets_tags" USING btree ("_order");
  CREATE INDEX "assets_tags_parent_id_idx" ON "assets_tags" USING btree ("_parent_id");
  CREATE INDEX "assets_brand_idx" ON "assets" USING btree ("brand_id");
  CREATE INDEX "assets_owner_idx" ON "assets" USING btree ("owner_id");
  CREATE INDEX "assets_file_idx" ON "assets" USING btree ("file_id");
  CREATE INDEX "assets_updated_at_idx" ON "assets" USING btree ("updated_at");
  CREATE INDEX "assets_created_at_idx" ON "assets" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_assets_fk" FOREIGN KEY ("assets_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_assets_id_idx" ON "payload_locked_documents_rels" USING btree ("assets_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assets_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "assets" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "assets_tags" CASCADE;
  DROP TABLE "assets" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_assets_fk";
  
  DROP INDEX "payload_locked_documents_rels_assets_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "assets_id";`)
}
