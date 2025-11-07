-- Enable pgvector extension for embeddings support
-- Created: 2025-11-07
-- Description: Enables PostgreSQL pgvector extension for vector similarity search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- EMBEDDINGS TABLE
-- ============================================================================
-- Now that pgvector is enabled, create the embeddings table
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES page_snapshots(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  model_version TEXT NOT NULL,
  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for embeddings
CREATE INDEX idx_embeddings_page ON embeddings(page_id);
CREATE INDEX idx_embeddings_snapshot ON embeddings(snapshot_id);

-- IVFFlat index for efficient similarity search
-- Note: This index type works well for approximate nearest neighbor searches
-- Lists parameter (100) is reasonable for datasets up to ~100k vectors
-- Adjust based on actual data size if needed
CREATE INDEX idx_embeddings_vector ON embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic similarity and topic clustering';
COMMENT ON COLUMN embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
