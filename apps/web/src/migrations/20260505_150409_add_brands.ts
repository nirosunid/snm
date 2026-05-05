import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_brands_font" AS ENUM('Inter', 'Playfair Display', 'IBM Plex Sans');
  CREATE TABLE "brands_dos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "brands_donts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "brands_vocabulary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"owner_id" integer NOT NULL,
  	"niche" varchar,
  	"audience" varchar,
  	"tone" varchar,
  	"palette_primary" varchar,
  	"palette_secondary" varchar,
  	"palette_accent" varchar,
  	"palette_background" varchar,
  	"palette_text" varchar,
  	"font" "enum_brands_font" DEFAULT 'Inter',
  	"logo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "brands_id" integer;
  ALTER TABLE "brands_dos" ADD CONSTRAINT "brands_dos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_donts" ADD CONSTRAINT "brands_donts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands_vocabulary" ADD CONSTRAINT "brands_vocabulary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brands_dos_order_idx" ON "brands_dos" USING btree ("_order");
  CREATE INDEX "brands_dos_parent_id_idx" ON "brands_dos" USING btree ("_parent_id");
  CREATE INDEX "brands_donts_order_idx" ON "brands_donts" USING btree ("_order");
  CREATE INDEX "brands_donts_parent_id_idx" ON "brands_donts" USING btree ("_parent_id");
  CREATE INDEX "brands_vocabulary_order_idx" ON "brands_vocabulary" USING btree ("_order");
  CREATE INDEX "brands_vocabulary_parent_id_idx" ON "brands_vocabulary" USING btree ("_parent_id");
  CREATE INDEX "brands_owner_idx" ON "brands" USING btree ("owner_id");
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands_dos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "brands_donts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "brands_vocabulary" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "brands" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "brands_dos" CASCADE;
  DROP TABLE "brands_donts" CASCADE;
  DROP TABLE "brands_vocabulary" CASCADE;
  DROP TABLE "brands" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_brands_fk";
  
  DROP INDEX "payload_locked_documents_rels_brands_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "brands_id";
  DROP TYPE "public"."enum_brands_font";`)
}
