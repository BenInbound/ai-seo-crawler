-- Row-Level Security (RLS) Policies
-- Created: 2025-11-07
-- Description: Multi-tenant isolation policies for all tables

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Users can only view and update their own record
CREATE POLICY "Users can view own record"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================
-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can create organizations (handled at application layer)
-- For now, allow authenticated users to create orgs (they become admin automatically)
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update organizations
CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can delete organizations
CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- ORG_MEMBERS TABLE POLICIES
-- ============================================================================
-- Users can view members of organizations they belong to
CREATE POLICY "Users can view org members"
  ON org_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can invite new members
CREATE POLICY "Admins can invite members"
  ON org_members FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can update member roles
CREATE POLICY "Admins can update members"
  ON org_members FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only admins can remove members
CREATE POLICY "Admins can remove members"
  ON org_members FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================
-- Users can view projects in their organizations
CREATE POLICY "Users can view projects in their orgs"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
    )
  );

-- Admins and editors can create projects
CREATE POLICY "Admins and editors can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- Admins and editors can update projects
CREATE POLICY "Admins and editors can update projects"
  ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- Only admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM org_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- CRAWL_RUNS TABLE POLICIES
-- ============================================================================
-- Users can view crawl runs for projects they have access to
CREATE POLICY "Users can view crawl runs"
  ON crawl_runs FOR SELECT
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Admins and editors can create crawl runs
CREATE POLICY "Admins and editors can create crawl runs"
  ON crawl_runs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'editor')
    )
  );

-- Admins and editors can update crawl runs (pause, resume, etc.)
CREATE POLICY "Admins and editors can update crawl runs"
  ON crawl_runs FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'editor')
    )
  );

-- ============================================================================
-- PAGES TABLE POLICIES
-- ============================================================================
-- Users can view pages for projects they have access to
CREATE POLICY "Users can view pages"
  ON pages FOR SELECT
  USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Service role (background jobs) can insert/update pages
-- RLS is bypassed for service role, but we keep policies for user-facing operations

-- ============================================================================
-- PAGE_SNAPSHOTS TABLE POLICIES
-- ============================================================================
-- Users can view snapshots for pages they have access to
CREATE POLICY "Users can view snapshots"
  ON page_snapshots FOR SELECT
  USING (
    page_id IN (
      SELECT pg.id
      FROM pages pg
      JOIN projects p ON pg.project_id = p.id
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Service role can insert snapshots (immutable after creation)

-- ============================================================================
-- PAGE_SCORES TABLE POLICIES
-- ============================================================================
-- Users can view scores for pages they have access to
CREATE POLICY "Users can view scores"
  ON page_scores FOR SELECT
  USING (
    page_id IN (
      SELECT pg.id
      FROM pages pg
      JOIN projects p ON pg.project_id = p.id
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Service role can insert/update scores

-- ============================================================================
-- EMBEDDINGS TABLE POLICIES
-- ============================================================================
-- Users can view embeddings for pages they have access to
CREATE POLICY "Users can view embeddings"
  ON embeddings FOR SELECT
  USING (
    page_id IN (
      SELECT pg.id
      FROM pages pg
      JOIN projects p ON pg.project_id = p.id
      JOIN org_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Service role can insert embeddings

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Service role operations bypass RLS entirely
-- 2. Application code using service role must validate organization context
-- 3. Background jobs use service role for crawling, scoring, and embeddings
-- 4. Client-facing operations use user JWTs with RLS enforcement
-- 5. auth.uid() returns the user_id from JWT payload
