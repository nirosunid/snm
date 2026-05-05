import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- pgvector is required by the embedding_vec column below.
    -- The image is pgvector/pgvector:pg16 so the .so is on disk; this just
    -- activates the extension in the current database.
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TYPE "public"."enum_voice_samples_source" AS ENUM('brief', 'pasted_sample');

    CREATE TABLE "voice_samples" (
      "id" serial PRIMARY KEY NOT NULL,
      "brand_id" integer NOT NULL,
      "owner_id" integer NOT NULL,
      "content" varchar NOT NULL,
      "source" "enum_voice_samples_source" DEFAULT 'pasted_sample' NOT NULL,
      "model" varchar NOT NULL,
      "embedding" jsonb NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Parallel pgvector column kept in sync by the VoiceSamples afterChange
    -- hook. Payload's introspection won't see it (the collection only knows
    -- about the embedding jsonb column), so this column is invisible to the
    -- schema-diff machinery.
    ALTER TABLE "voice_samples" ADD COLUMN "embedding_vec" vector(1536);

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "voice_samples_id" integer;

    ALTER TABLE "voice_samples"
      ADD CONSTRAINT "voice_samples_brand_id_brands_id_fk"
      FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id")
      ON DELETE set null ON UPDATE no action;

    ALTER TABLE "voice_samples"
      ADD CONSTRAINT "voice_samples_owner_id_users_id_fk"
      FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;

    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_voice_samples_fk"
      FOREIGN KEY ("voice_samples_id") REFERENCES "public"."voice_samples"("id")
      ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "voice_samples_brand_idx" ON "voice_samples" USING btree ("brand_id");
    CREATE INDEX "voice_samples_owner_idx" ON "voice_samples" USING btree ("owner_id");
    CREATE INDEX "voice_samples_updated_at_idx" ON "voice_samples" USING btree ("updated_at");
    CREATE INDEX "voice_samples_created_at_idx" ON "voice_samples" USING btree ("created_at");
    CREATE INDEX "payload_locked_documents_rels_voice_samples_id_idx"
      ON "payload_locked_documents_rels" USING btree ("voice_samples_id");

    CREATE INDEX "voice_samples_embedding_vec_hnsw_idx"
      ON "voice_samples"
      USING hnsw ("embedding_vec" vector_cosine_ops);
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "voice_samples" DISABLE ROW LEVEL SECURITY;
    DROP TABLE "voice_samples" CASCADE;
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_voice_samples_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_voice_samples_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "voice_samples_id";
    DROP TYPE "public"."enum_voice_samples_source";
    -- vector extension stays installed; later collections may rely on it.
  `)
}
