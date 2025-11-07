-- Multi-Client AEO Platform - Initial Schema
-- Created: 2025-11-07
-- Description: Core tables for multi-tenant AEO platform with RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================================================
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,

  CONSTRAINT role_check CHECK (role IN ('admin', 'editor', 'viewer')),
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(organization_id);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{"depth_limit": 3}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ============================================================================
-- CRAWL RUNS TABLE
-- ============================================================================
CREATE TABLE crawl_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL,
  config_snapshot JSONB NOT NULL,
  pages_discovered INTEGER DEFAULT 0,
  pages_processed INTEGER DEFAULT 0,
  token_usage INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),

  CONSTRAINT run_type_check CHECK (run_type IN ('full', 'sitemap_only', 'sample', 'delta')),
  CONSTRAINT status_check CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed')),
  CONSTRAINT pages_check CHECK (pages_processed <= pages_discovered)
);

CREATE INDEX idx_crawl_runs_project ON crawl_runs(project_id);
CREATE INDEX idx_crawl_runs_started ON crawl_runs(started_at DESC);
CREATE INDEX idx_crawl_runs_status ON crawl_runs(status);

-- ============================================================================
-- PAGES TABLE
-- ============================================================================
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  page_type TEXT,
  first_discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_crawled_at TIMESTAMPTZ,
  last_crawl_run_id UUID REFERENCES crawl_runs(id),
  current_snapshot_id UUID,
  current_score_id UUID,

  CONSTRAINT page_type_check CHECK (page_type IN ('homepage', 'product', 'solution', 'blog', 'resource', 'conversion')),
  CONSTRAINT unique_project_url UNIQUE (project_id, url_hash)
);

CREATE INDEX idx_pages_project ON pages(project_id);
CREATE INDEX idx_pages_type ON pages(page_type);
CREATE INDEX idx_pages_last_crawled ON pages(last_crawled_at);

-- ============================================================================
-- PAGE SNAPSHOTS TABLE
-- ============================================================================
CREATE TABLE page_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  crawl_run_id UUID NOT NULL REFERENCES crawl_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  raw_html TEXT,
  cleaned_text TEXT,
  content_hash TEXT NOT NULL,
  extraction JSONB NOT NULL DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_page ON page_snapshots(page_id);
CREATE INDEX idx_snapshots_crawl_run ON page_snapshots(crawl_run_id);
CREATE INDEX idx_snapshots_content_hash ON page_snapshots(content_hash);
CREATE INDEX idx_snapshots_created ON page_snapshots(snapshot_at DESC);

-- ============================================================================
-- PAGE SCORES TABLE
-- ============================================================================
CREATE TABLE page_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES page_snapshots(id) ON DELETE CASCADE,
  rubric_version TEXT NOT NULL,
  page_type TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  criteria_scores JSONB NOT NULL DEFAULT '{}',
  criteria_explanations JSONB NOT NULL DEFAULT '{}',
  ai_recommendations JSONB DEFAULT '[]',
  ai_cache_key TEXT,
  ai_tokens_used INTEGER DEFAULT 0,
  scored_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT overall_score_range CHECK (overall_score BETWEEN 0 AND 100),
  CONSTRAINT score_page_type_check CHECK (page_type IN ('homepage', 'product', 'solution', 'blog', 'resource', 'conversion'))
);

CREATE INDEX idx_scores_page ON page_scores(page_id);
CREATE INDEX idx_scores_snapshot ON page_scores(snapshot_id);
CREATE INDEX idx_scores_cache_key ON page_scores(ai_cache_key);
CREATE INDEX idx_scores_overall ON page_scores(overall_score);

-- ============================================================================
-- EMBEDDINGS TABLE (Optional - for future similarity features)
-- ============================================================================
-- Note: Requires pgvector extension (installed separately in T008)
-- Uncomment after pgvector is enabled
/*
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  snapshot_id UUID NOT NULL REFERENCES page_snapshots(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  model_version TEXT NOT NULL,
  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_page ON embeddings(page_id);
*/

-- ============================================================================
-- FOREIGN KEY UPDATES (Add FKs that reference tables created later)
-- ============================================================================
ALTER TABLE pages
  ADD CONSTRAINT fk_pages_snapshot FOREIGN KEY (current_snapshot_id) REFERENCES page_snapshots(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_pages_score FOREIGN KEY (current_score_id) REFERENCES page_scores(id) ON DELETE SET NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE users IS 'Platform users with authentication credentials';
COMMENT ON TABLE organizations IS 'Multi-tenant organizations (clients)';
COMMENT ON TABLE org_members IS 'User-Organization membership with roles';
COMMENT ON TABLE projects IS 'Website projects to analyze';
COMMENT ON TABLE crawl_runs IS 'Crawl execution tracking';
COMMENT ON TABLE pages IS 'Unique URLs discovered during crawling';
COMMENT ON TABLE page_snapshots IS 'Immutable versioned page content captures';
COMMENT ON TABLE page_scores IS 'AEO scoring results per snapshot';
