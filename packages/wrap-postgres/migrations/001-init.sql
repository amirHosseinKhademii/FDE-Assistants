-- Initialize pgvector and create base schema for wrap project

CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store document chunks with metadata
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  subsystem TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table to store embeddings for each chunk
CREATE TABLE IF NOT EXISTS embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  embedding vector(1536),
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index will be created in Step 2.6 when performance tuning is applied
-- -- CREATE INDEX idx_embeddings_hnsw ON embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 12, ef_construction = 200);
