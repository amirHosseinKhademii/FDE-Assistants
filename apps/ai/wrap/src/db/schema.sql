-- Wrap index schema (Step 2.6). Idempotent: safe to re-run.
-- Target: Postgres 17/18 with pgvector. Dimension = EMBEDDING_DIMENSIONS (1536).

CREATE EXTENSION IF NOT EXISTS vector;

-- One row per chunk in data/chunks.jsonl. id is the chunk id from that file.
CREATE TABLE IF NOT EXISTS chunks (
  id           TEXT PRIMARY KEY,
  content_hash VARCHAR(64) NOT NULL UNIQUE,   -- sha256(content), hex
  source_file  TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  start_line   INTEGER,
  end_line     INTEGER,
  heading_path TEXT,
  type         VARCHAR(50) NOT NULL,
  tokens       INTEGER,
  content      TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_subsystem_idx ON chunks ((metadata->>'subsystem'));
CREATE INDEX IF NOT EXISTS chunks_type_idx      ON chunks (type);

-- One row per (content, model). Idempotency key is (content_hash, model).
CREATE TABLE IF NOT EXISTS embeddings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id     TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL,
  embedding    vector(1536) NOT NULL,
  model        VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_hash, model)
);

CREATE INDEX IF NOT EXISTS embeddings_chunk_idx ON embeddings (chunk_id);

-- HNSW (plan parameters: m=12, ef_construction=200). Search-time ef_search is set per session.
CREATE INDEX IF NOT EXISTS embeddings_embedding_hnsw_idx
  ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 12, ef_construction = 200);
