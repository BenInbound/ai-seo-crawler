# Data Model: Multi-Client AEO Platform

**Date**: 2025-11-07
**Feature**: Multi-Client Answer Engine Optimization Platform

## Overview

This document defines the database schema and entity relationships for the multi-tenant AEO platform. All entities are stored in Supabase (PostgreSQL) with Row-Level Security (RLS) policies enforcing organization isolation.

---

## Entities

### Organization

Represents a client or company using the platform. Complete isolation from other organizations.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `name` (TEXT, NOT NULL) - Organization display name
- `slug` (TEXT, UNIQUE, NOT NULL) - URL-friendly identifier
- `settings` (JSONB, DEFAULT '{}') - Organization-specific configuration
- `billing_email` (TEXT) - Contact for billing/admin
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Primary key on `id`
- Unique index on `slug`

**RLS Policy**:
- Users can only SELECT organizations they belong to (via `org_members`)

---

### User

Represents a person who uses the platform. Can belong to multiple organizations.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `email` (TEXT, UNIQUE, NOT NULL) - Email address (used for login)
- `password_hash` (TEXT, NOT NULL) - Bcrypt hashed password
- `name` (TEXT) - Display name
- `preferences` (JSONB, DEFAULT '{}') - User preferences (theme, notifications, etc.)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- `last_login_at` (TIMESTAMPTZ)

**Indexes**:
- Primary key on `id`
- Unique index on `email`

**Validation**:
- Email format validation (regex or constraint)
- Password minimum length 8 characters (enforced in application)

**RLS Policy**:
- Users can SELECT/UPDATE their own record only

---

### OrganizationMember

Links users to organizations with role assignments. Defines access permissions.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `organization_id` (UUID, FK → organizations.id, NOT NULL)
- `user_id` (UUID, FK → users.id, NOT NULL)
- `role` (TEXT, NOT NULL) - One of: 'admin', 'editor', 'viewer'
- `invited_by` (UUID, FK → users.id) - User who sent invitation
- `invited_at` (TIMESTAMPTZ, DEFAULT NOW())
- `joined_at` (TIMESTAMPTZ) - When invitation was accepted

**Indexes**:
- Primary key on `id`
- Unique index on `(organization_id, user_id)` - one membership per user per org
- Index on `user_id` for efficient user lookup

**Constraints**:
- CHECK: `role IN ('admin', 'editor', 'viewer')`
- Foreign keys with CASCADE delete (removing org removes memberships)

**Role Permissions** (enforced in application layer):
- **admin**: Full control including user invites, project management, crawl execution
- **editor**: Create/edit projects, run crawls, view reports
- **viewer**: Read-only access to reports and dashboards

**RLS Policy**:
- Users can SELECT memberships for organizations they belong to
- Only 'admin' role can INSERT/UPDATE/DELETE memberships

---

### Project

Represents a website being analyzed for AEO readiness. Belongs to one organization.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `organization_id` (UUID, FK → organizations.id, NOT NULL)
- `name` (TEXT, NOT NULL) - Project display name
- `target_url` (TEXT, NOT NULL) - Root URL of website to crawl
- `description` (TEXT) - Optional project description
- `config` (JSONB, DEFAULT '{}') - Crawl configuration
  - `depth_limit` (INTEGER, default 3) - Max crawl depth
  - `sample_size` (INTEGER, nullable) - For sample crawls
  - `token_limit` (INTEGER, nullable) - Max tokens per crawl
  - `excluded_patterns` (ARRAY) - URL patterns to skip
- `created_by` (UUID, FK → users.id, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Primary key on `id`
- Index on `organization_id` for filtering by org
- Index on `created_at` for sorting

**Validation**:
- `target_url` must be valid URL format
- `depth_limit` must be >= 1 and <= 10
- `sample_size` if set must be > 0

**RLS Policy**:
- Users can SELECT/INSERT/UPDATE/DELETE projects for their organizations
- Editors and admins can mutate, viewers can only SELECT

---

### CrawlRun

Represents a single execution of the crawler. Tracks progress and configuration.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `project_id` (UUID, FK → projects.id, NOT NULL)
- `run_type` (TEXT, NOT NULL) - One of: 'full', 'sitemap_only', 'sample', 'delta'
- `status` (TEXT, NOT NULL) - One of: 'queued', 'running', 'paused', 'completed', 'failed'
- `config_snapshot` (JSONB, NOT NULL) - Copy of project config at run time
- `pages_discovered` (INTEGER, DEFAULT 0) - Total URLs found
- `pages_processed` (INTEGER, DEFAULT 0) - Pages fully crawled and scored
- `token_usage` (INTEGER, DEFAULT 0) - Cumulative token count
- `error_message` (TEXT) - Error details if status=failed
- `started_at` (TIMESTAMPTZ, DEFAULT NOW())
- `completed_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK → users.id, NOT NULL)

**Indexes**:
- Primary key on `id`
- Index on `project_id` for filtering runs by project
- Index on `started_at` for chronological sorting
- Index on `status` for finding active runs

**Constraints**:
- CHECK: `run_type IN ('full', 'sitemap_only', 'sample', 'delta')`
- CHECK: `status IN ('queued', 'running', 'paused', 'completed', 'failed')`
- CHECK: `pages_processed <= pages_discovered`

**RLS Policy**:
- Users can SELECT/INSERT/UPDATE runs for projects they have access to
- Editors and admins can start runs, viewers can only view

---

### Page

Represents a unique URL discovered during crawling. One record per unique normalized URL.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `project_id` (UUID, FK → projects.id, NOT NULL)
- `url` (TEXT, NOT NULL) - Normalized canonical URL
- `url_hash` (TEXT, NOT NULL) - SHA-256 hash of normalized URL for fast lookup
- `page_type` (TEXT) - One of: 'homepage', 'product', 'solution', 'blog', 'resource', 'conversion'
- `first_discovered_at` (TIMESTAMPTZ, NOT NULL) - When first seen
- `last_crawled_at` (TIMESTAMPTZ) - Most recent successful crawl
- `last_crawl_run_id` (UUID, FK → crawl_runs.id) - Most recent crawl run
- `current_snapshot_id` (UUID, FK → page_snapshots.id) - Latest snapshot
- `current_score_id` (UUID, FK → page_scores.id) - Latest score

**Indexes**:
- Primary key on `id`
- Unique index on `(project_id, url_hash)` - prevent duplicates
- Index on `project_id` for listing pages
- Index on `page_type` for filtering
- Index on `last_crawled_at` for finding stale pages

**Constraints**:
- CHECK: `page_type IN ('homepage', 'product', 'solution', 'blog', 'resource', 'conversion')`

**RLS Policy**:
- Users can SELECT pages for projects they have access to
- System (service role) can INSERT/UPDATE

---

### PageSnapshot

Immutable versioned capture of page content at a specific point in time.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `page_id` (UUID, FK → pages.id, NOT NULL)
- `crawl_run_id` (UUID, FK → crawl_runs.id, NOT NULL)
- `url` (TEXT, NOT NULL) - URL at time of snapshot (may differ from canonical)
- `status_code` (INTEGER, NOT NULL) - HTTP response code
- `raw_html` (TEXT) - Complete HTML response
- `cleaned_text` (TEXT) - Extracted main content
- `content_hash` (TEXT, NOT NULL) - SHA-256 hash of cleaned_text
- `extraction` (JSONB, NOT NULL) - Structured content:
  - `title` (TEXT)
  - `meta_description` (TEXT)
  - `canonical_url` (TEXT)
  - `headings` (ARRAY of {level, text})
  - `body` (TEXT)
  - `faq` (ARRAY of {question, answer})
  - `internal_links` (ARRAY of {url, anchor})
  - `outbound_links` (ARRAY of {url, anchor})
  - `schema_types` (ARRAY of TEXT)
  - `author` (TEXT)
  - `date_published` (DATE)
- `metrics` (JSONB) - Performance data:
  - `load_time_ms` (INTEGER)
  - `content_length` (INTEGER)
  - `word_count` (INTEGER)
  - `render_method` (TEXT) - 'static' or 'browser'
- `snapshot_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Primary key on `id`
- Index on `page_id` for finding all snapshots of a page
- Index on `crawl_run_id` for finding all snapshots from a run
- Index on `content_hash` for detecting unchanged content
- Index on `snapshot_at` for chronological ordering

**RLS Policy**:
- Users can SELECT snapshots for pages they have access to
- System (service role) can INSERT only (immutable after creation)

---

### PageScore

Evaluation of a page snapshot against the AEO rubric.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `page_id` (UUID, FK → pages.id, NOT NULL)
- `snapshot_id` (UUID, FK → page_snapshots.id, NOT NULL)
- `rubric_version` (TEXT, NOT NULL) - Version identifier for scoring rules
- `page_type` (TEXT, NOT NULL) - Type-specific rubric applied
- `overall_score` (INTEGER, NOT NULL) - 0-100 overall score
- `criteria_scores` (JSONB, NOT NULL) - Individual criterion scores (0-100):
  - `direct_answer` (INTEGER)
  - `question_coverage` (INTEGER)
  - `eeat_signals` (INTEGER)
  - `outbound_links` (INTEGER)
  - `schema_markup` (INTEGER)
  - `internal_linking` (INTEGER)
  - `readability` (INTEGER)
  - `performance` (INTEGER)
  - `indexing` (INTEGER)
  - `accessibility` (INTEGER)
- `criteria_explanations` (JSONB, NOT NULL) - Short explanation per criterion
- `ai_recommendations` (JSONB) - Array of recommendation objects:
  - `category` (TEXT) - Which criterion this addresses
  - `text` (TEXT) - Human-sounding recommendation
  - `references` (ARRAY) - Specific content elements referenced
- `ai_cache_key` (TEXT) - Content hash + rubric version for caching
- `ai_tokens_used` (INTEGER) - Token count for this evaluation
- `scored_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Primary key on `id`
- Index on `page_id` for finding scores of a page
- Index on `snapshot_id` for linking score to specific snapshot
- Index on `ai_cache_key` for cache lookup
- Index on `overall_score` for filtering/sorting by score

**Constraints**:
- CHECK: `overall_score BETWEEN 0 AND 100`
- CHECK: All values in `criteria_scores` BETWEEN 0 AND 100
- CHECK: `page_type IN ('homepage', 'product', 'solution', 'blog', 'resource', 'conversion')`

**Validation** (application layer):
- `overall_score` = simple average of all `criteria_scores` values
- `ai_recommendations` must reference specific elements from snapshot extraction

**RLS Policy**:
- Users can SELECT scores for pages they have access to
- System (service role) can INSERT/UPDATE

---

### Embedding

Vector embeddings of page content for similarity analysis and topic grouping.

**Fields**:
- `id` (UUID, PK) - Unique identifier
- `page_id` (UUID, FK → pages.id, NOT NULL)
- `snapshot_id` (UUID, FK → page_snapshots.id, NOT NULL)
- `embedding` (VECTOR(1536)) - pgvector type, OpenAI text-embedding-3-small dimensions
- `model_version` (TEXT, NOT NULL) - Embedding model identifier
- `source_text` (TEXT) - Summarized content that was embedded
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- Primary key on `id`
- Index on `page_id` for finding embeddings of a page
- IVFFlat index on `embedding` for efficient similarity search

**RLS Policy**:
- Users can SELECT embeddings for pages they have access to
- System (service role) can INSERT

**Note**: Embeddings can be deferred to Phase 2/3 if not critical for MVP. Used for "related pages" and topic clustering features.

---

## Relationships

```
Organization (1) ──< (N) OrganizationMember >── (N) User (1)
Organization (1) ──< (N) Project
Project (1) ──< (N) CrawlRun
Project (1) ──< (N) Page
CrawlRun (1) ──< (N) PageSnapshot >── (N) Page (1)
Page (1) ──< (N) PageSnapshot
Page (1) ──< (N) PageScore
PageSnapshot (1) ──< (N) PageScore
PageSnapshot (1) ──< (N) Embedding
Page (1) ──< (N) Embedding
```

**Key Relationships**:
- Organization is the root tenant entity
- Users belong to Organizations via OrganizationMember (many-to-many)
- Projects belong to one Organization
- Pages belong to one Project
- PageSnapshots are immutable versions created per CrawlRun
- PageScores evaluate specific PageSnapshots
- Embeddings are generated from PageSnapshots

---

## Row-Level Security (RLS) Policies

All tables must have RLS enabled. Policies enforce organization-level isolation.

**Policy Pattern**:
```sql
-- Example for projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their organizations"
ON projects FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM org_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins and editors can modify projects"
ON projects FOR UPDATE
USING (
  organization_id IN (
    SELECT om.organization_id
    FROM org_members om
    WHERE om.user_id = auth.uid()
    AND om.role IN ('admin', 'editor')
  )
);
```

**Service Role Access**:
- Background jobs use service role to bypass RLS
- Service role still validates organization context in application logic
- Never expose service role key to client

---

## Data Retention

**Policy** (from spec assumptions):
- All snapshots and scores retained indefinitely unless explicitly deleted by org admins
- Enables long-term trend analysis and historical comparison
- Organization admins can delete old crawl runs to manage storage

**Future Considerations**:
- Implement archive/cold storage for old snapshots
- Add data retention settings per organization
- Provide data export before deletion

---

## Migration Strategy

**Phase 1 - Core Schema**:
1. Create organizations, users, org_members tables
2. Create projects table
3. Create crawl_runs, pages, page_snapshots, page_scores tables
4. Apply RLS policies
5. Create indexes

**Phase 2 - Embeddings (Optional)**:
1. Enable pgvector extension
2. Create embeddings table
3. Create IVFFlat index

**Seed Data**:
- Create default admin user
- Create sample organization for testing
- Add test projects with example data

---

## Example Queries

**Get all projects for current user**:
```sql
SELECT p.*
FROM projects p
JOIN org_members om ON p.organization_id = om.organization_id
WHERE om.user_id = $1;
```

**Get latest score for each page in a project**:
```sql
SELECT
  p.id,
  p.url,
  ps.overall_score,
  ps.scored_at
FROM pages p
LEFT JOIN page_scores ps ON p.current_score_id = ps.id
WHERE p.project_id = $1
ORDER BY ps.overall_score ASC;
```

**Compare scores between two crawl runs**:
```sql
SELECT
  p.url,
  old_score.overall_score as old_score,
  new_score.overall_score as new_score,
  (new_score.overall_score - old_score.overall_score) as change
FROM pages p
LEFT JOIN page_scores old_score ON old_score.page_id = p.id AND old_score.snapshot_id IN (
  SELECT id FROM page_snapshots WHERE crawl_run_id = $1
)
LEFT JOIN page_scores new_score ON new_score.page_id = p.id AND new_score.snapshot_id IN (
  SELECT id FROM page_snapshots WHERE crawl_run_id = $2
)
WHERE p.project_id = $3
ORDER BY change DESC;
```

**Find unchanged pages for cache optimization**:
```sql
SELECT
  ps1.page_id,
  ps1.content_hash
FROM page_snapshots ps1
JOIN page_snapshots ps2 ON ps1.page_id = ps2.page_id
WHERE ps1.crawl_run_id = $1 -- old run
  AND ps2.crawl_run_id = $2 -- new run
  AND ps1.content_hash = ps2.content_hash;
```
