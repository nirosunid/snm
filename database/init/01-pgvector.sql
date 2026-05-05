-- Enable pgvector at first DB initialization.
-- Idempotent: safe to re-run.
CREATE EXTENSION IF NOT EXISTS vector;
