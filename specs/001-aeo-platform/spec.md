# Feature Specification: Multi-Client Answer Engine Optimization Platform

**Feature Branch**: `001-aeo-platform`
**Created**: 2025-11-07
**Status**: Draft
**Input**: User description: "Multi-client Answer Engine Optimization platform with intelligent scoring and AI recommendations"

## Clarifications

### Session 2025-11-07

- Q: Authentication complexity for multi-client platform? → A: Simple email/password authentication (no SSO/OAuth). Multi-client and role-based access control remain, but authentication mechanism is basic.
- Q: What specific permissions should each organization role have? → A: Admin: full control including user invites; Editor: can create/edit projects and run crawls; Viewer: read-only access to reports
- Q: What numeric range should the scoring system use? → A: 0-100 percentage scale (intuitive for non-technical stakeholders)
- Q: How should individual criterion scores be combined into the overall page score? → A: Simple average of all criterion scores (equal weight for each)
- Q: How should users be notified when background crawls/tasks complete? → A: In-app notifications only (toast/banner when user is logged in)
- Q: What should the default crawl depth limit be? → A: Depth 3 (homepage + two levels, good balance)

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Organization Setup and Project Creation (Priority: P1)

A marketing agency needs to onboard a new client into the AEO platform. The agency administrator creates an organization for the client, invites team members, and creates the first project targeting the client's main website.

**Why this priority**: Without the ability to create organizations and projects, no other functionality can be used. This is the foundational capability that enables all subsequent features.

**Independent Test**: Can be fully tested by creating an organization, adding users to it, creating a project within that organization, and verifying that only authorized users can see the organization's data.

**Acceptance Scenarios**:

1. **Given** I am a platform user, **When** I create a new organization with a name and initial settings, **Then** the organization is created, I am automatically added as an admin, and I can invite other users
2. **Given** I am an organization admin, **When** I create a project with a target website URL, **Then** the project is created and associated with my organization
3. **Given** I am a user in Organization A, **When** I attempt to view projects from Organization B, **Then** I am denied access and see only my organization's data
4. **Given** I am invited to an organization, **When** I accept the invitation, **Then** I gain access to all projects within that organization according to my assigned role

---

### User Story 2 - Website Crawling and Snapshot Storage (Priority: P1)

A content strategist needs to analyze their client's website for AEO readiness. They initiate a crawl that discovers pages via sitemap, follows internal links to a specified depth, and stores versioned snapshots of each page's content.

**Why this priority**: This is the core data collection capability. Without crawled and stored page data, there's nothing to analyze or score.

**Independent Test**: Can be fully tested by initiating a crawl on a test website, verifying that pages are discovered correctly, content is extracted, and snapshots are stored with version history.

**Acceptance Scenarios**:

1. **Given** I have a project configured, **When** I initiate a full crawl, **Then** the system discovers pages from the sitemap and internal links, respects robots.txt, and stores a snapshot for each unique page
2. **Given** a page has been crawled before, **When** I run a new crawl and the content has changed, **Then** a new snapshot is created with the current content while preserving previous versions
3. **Given** a crawl encounters a canonical URL, **When** processing that page, **Then** duplicate content is prevented and only the canonical version is stored
4. **Given** a crawl is in progress, **When** the system detects pagination or tracking parameters, **Then** those URLs are normalized to prevent infinite loops
5. **Given** a page requires JavaScript rendering, **When** static fetch fails to retrieve meaningful content, **Then** the system automatically attempts browser-based rendering as a fallback

---

### User Story 3 - Intelligent Page Scoring with Type Awareness (Priority: P2)

A content manager wants to understand how well their pages are optimized for answer engines. They view scoring results that reflect page-type-specific expectations, with different criteria applied to homepages, blog posts, product pages, and conversion pages.

**Why this priority**: This delivers the core value proposition of the platform. It builds on crawled data to provide actionable insights, but requires P1 functionality (crawling) to be in place first.

**Independent Test**: Can be fully tested by scoring various page types independently, verifying that each receives appropriate type-specific criteria, and confirming that scores are deterministic and repeatable.

**Acceptance Scenarios**:

1. **Given** a page snapshot has been stored, **When** the system scores the page, **Then** the page type is automatically detected and the appropriate rubric is applied
2. **Given** a blog post is being scored, **When** the rubric is applied, **Then** the system checks for publication date and may include FAQ scoring if relevant questions are present
3. **Given** a homepage is being scored, **When** the rubric is applied, **Then** the system does not penalize the absence of publication dates or FAQ sections
4. **Given** a product page is being scored, **When** the rubric is applied, **Then** the system evaluates question-style headings based on whether they reduce purchase friction
5. **Given** a conversion page is being scored, **When** the rubric is applied, **Then** the system prioritizes action focus and conciseness over comprehensive content coverage

---

### User Story 4 - AI-Powered Improvement Recommendations (Priority: P2)

A content editor reviews scoring results and receives specific, human-sounding recommendations that reference actual page content and avoid generic advice. The recommendations are tailored to the page type and sound natural rather than robotic.

**Why this priority**: This transforms raw scores into actionable guidance, significantly increasing the platform's value. Depends on P2 scoring functionality.

**Independent Test**: Can be fully tested by reviewing AI recommendations for various page types and verifying they are concise, page-type appropriate, reference specific content, and avoid formulaic patterns.

**Acceptance Scenarios**:

1. **Given** a page has been scored, **When** AI recommendations are generated, **Then** each recommendation references specific elements from the page content and provides clear, actionable guidance
2. **Given** multiple pages of the same type are scored, **When** recommendations are generated, **Then** the suggestions vary naturally and avoid repetitive phrasing across different pages
3. **Given** a blog post lacks a clear answer to the title question, **When** recommendations are generated, **Then** the AI suggests adding a direct answer early in the content with a specific example of how to implement it
4. **Given** a product page uses excessive question-style headings, **When** recommendations are generated, **Then** the AI suggests rewriting headings to be more direct while maintaining SEO value

---

### User Story 5 - Token and Cost Management (Priority: P2)

A platform administrator needs to control AI processing costs across multiple client projects. They set token limits per crawl, view token usage per project, and ensure the system caches results to avoid redundant AI processing.

**Why this priority**: This protects the business from runaway costs and ensures efficient resource usage. Critical for multi-tenant operation but can be implemented after core functionality.

**Independent Test**: Can be fully tested by monitoring token usage during crawls, verifying cache hits prevent redundant AI calls, and confirming that token limits pause processing appropriately.

**Acceptance Scenarios**:

1. **Given** a crawl is configured with a token limit, **When** the limit is reached during processing, **Then** the crawl pauses and allows manual resume or limit adjustment
2. **Given** a page's content has not changed since last scoring, **When** a rescore is requested, **Then** the system retrieves cached AI results instead of making new API calls
3. **Given** multiple projects are running, **When** viewing the project dashboard, **Then** I can see token usage per project and identify which projects are consuming the most resources
4. **Given** page content is sent to AI for analysis, **When** the content is processed, **Then** it is first summarized to a consistent, short format to minimize token consumption

---

### User Story 6 - Project Dashboard and Historical Comparison (Priority: P3)

A marketing manager reviews their client's website performance over time. They view crawl history, score trends, compare runs to identify improvements or regressions, and filter pages by score and page type.

**Why this priority**: This enables strategic decision-making and demonstrates value to clients, but the core analysis capability must exist first (P1 and P2 functionality).

**Independent Test**: Can be fully tested by running multiple crawls over time, viewing the dashboard, comparing different runs, and filtering results by various criteria.

**Acceptance Scenarios**:

1. **Given** I am viewing a project dashboard, **When** I access the page, **Then** I see recent crawl history, average scores by page type, and trend graphs showing improvement over time
2. **Given** multiple crawl runs exist, **When** I select two runs to compare, **Then** I see which pages improved, which declined, and which remained stable with specific score differences
3. **Given** I am viewing the pages table, **When** I apply filters by score range and page type, **Then** only matching pages are displayed and I can quickly identify problematic pages
4. **Given** I select a specific page, **When** viewing the detail screen, **Then** I see the current snapshot content, complete scoring breakdown, and AI recommendations with the ability to view historical snapshots

---

### User Story 7 - Targeted Rescoring Without Refetching (Priority: P3)

A content editor has updated several pages on their website based on AEO recommendations. They want to rescore those specific pages without running a full crawl, using the existing HTML snapshots to save time when content hasn't changed.

**Why this priority**: This improves workflow efficiency and reduces unnecessary crawling, but is an optimization on top of core functionality.

**Independent Test**: Can be fully tested by using the rescore button on a page detail screen, verifying that scoring occurs without new HTTP requests when content hasn't changed, and confirming that scores update appropriately.

**Acceptance Scenarios**:

1. **Given** I am viewing a page detail screen, **When** I click the rescore button and the page content hasn't changed, **Then** scoring is recalculated using the existing snapshot without fetching new HTML
2. **Given** I want to rescore after updating the rubric, **When** I trigger a rescore, **Then** all pages are reevaluated with the new rubric version and changes are tracked
3. **Given** I select multiple pages for rescoring, **When** I initiate the batch rescore, **Then** processing occurs as a background task and I receive an in-app notification when complete

---

### Edge Cases

- **What happens when a sitemap is unavailable or malformed?** The system falls back to crawling from the homepage and discovering links organically, logging a warning that sitemap-based discovery was not possible.

- **How does the system handle robots.txt disallowing critical pages?** The system respects robots.txt directives and excludes those pages from crawling, but logs them in the crawl report as "excluded" so users understand why certain pages weren't analyzed.

- **What happens when a page's content is entirely behind authentication?** The system stores a snapshot indicating the page requires authentication and cannot be fully analyzed, allowing users to manually provide content if needed.

- **How are pages with multiple canonical URLs handled?** The system follows the canonical chain to the final destination and stores only one snapshot, linking all variant URLs to the canonical version.

- **What happens when a crawl is interrupted due to server failure?** The system maintains crawl state and allows resumption from the last successfully processed page, preventing duplicate work.

- **How does the system prevent detection as a bot and potential IP blocking?** The system uses reasonable crawl delays, respects robots.txt, sends appropriate user-agent headers, and limits concurrent requests to avoid overwhelming target servers.

- **What happens when AI recommendations cannot be generated due to API failures?** The system stores the numeric scores and marks the AI recommendation as "pending retry," allowing manual retry or processing during the next scheduled run.

- **How are very large websites (10,000+ pages) handled efficiently?** The system supports sample crawls (random subset), sitemap-only crawls (skip link discovery), and configurable depth limits to control scope.

- **What happens when two users from the same organization modify the same project simultaneously?** The system uses optimistic locking or last-write-wins with audit logging to track who made changes and when.

- **How are deleted pages from previous crawls handled?** Pages that no longer exist are marked as "404/removed" in the current crawl run but historical snapshots are preserved for comparison purposes.

## Requirements *(mandatory)*

### Functional Requirements

#### Multi-Tenancy and Access Control

- **FR-001**: System MUST support multiple organizations, each isolated from other organizations' data
- **FR-002**: System MUST support multiple projects per organization
- **FR-003**: Users MUST be able to belong to multiple organizations with different roles per organization
- **FR-004**: System MUST enforce row-level security at the database level to ensure users only access data belonging to their organizations
- **FR-005**: All application operations MUST verify organization and project context before retrieving or modifying data
- **FR-005a**: System MUST enforce role-based permissions where Admin users can invite/manage users and have full control, Editor users can create/edit projects and run crawls, and Viewer users have read-only access to reports and dashboards

#### Data Model and Storage

- **FR-006**: System MUST store organizations with name, settings, and creation metadata
- **FR-007**: System MUST store users with authentication credentials, profile information, and preferences
- **FR-008**: System MUST store organization memberships linking users to organizations with role assignments
- **FR-009**: System MUST store projects with target URL, configuration, and organization association
- **FR-010**: System MUST store pages with URL, discovered date, and project association
- **FR-011**: System MUST store page snapshots with raw HTML, cleaned text, structured extraction output, metrics, and version timestamp
- **FR-012**: System MUST store page scores with rubric version, numeric scoring breakdown by criteria, AI recommendations, and snapshot reference
- **FR-013**: System MUST store embeddings for page content to enable similarity analysis and topic grouping
- **FR-014**: Each page snapshot MUST be immutable and versioned to enable historical comparison

#### Website Crawling

- **FR-015**: System MUST attempt to discover pages via sitemap URLs when available
- **FR-016**: System MUST discover internal links up to a configurable depth limit (default: 3 levels from homepage)
- **FR-017**: System MUST respect robots.txt directives and meta robots tags
- **FR-018**: System MUST detect and follow canonical URLs to prevent duplicate content storage
- **FR-019**: System MUST normalize URLs to avoid pagination loops and tracking parameter traps
- **FR-020**: System MUST store each crawl result as a versioned snapshot linked to the crawl run
- **FR-021**: System MUST attempt static HTTP fetch first and only use browser rendering when static fetch produces insufficient content
- **FR-022**: System MUST support full crawl, sitemap-only crawl, sample crawl, and delta crawl modes
- **FR-023**: System MUST process crawls as background tasks not tied to synchronous HTTP requests

#### Content Extraction

- **FR-024**: System MUST extract page title and meta description from each crawled page
- **FR-025**: System MUST extract canonical URL from each crawled page
- **FR-026**: System MUST extract heading hierarchy (H1-H6) preserving structure and order
- **FR-027**: System MUST extract main body content excluding navigation, footer, and sidebar elements
- **FR-028**: System MUST detect and extract FAQ or question-answer blocks when present
- **FR-029**: System MUST extract internal links and outbound links with anchor text
- **FR-030**: System MUST detect and extract schema markup types present on the page
- **FR-031**: System MUST extract author and date signals when present and relevant

#### Page Type Detection and Awareness

- **FR-032**: System MUST automatically detect page type from supported categories: Homepage, Product/Service, Solution/Industry, Blog/Article, Resource/Documentation, Conversion (Contact/Pricing)
- **FR-033**: Scoring rubric MUST be segmented by page type with different expectations per type
- **FR-034**: Homepage scoring MUST NOT require publication date or FAQ sections
- **FR-035**: Blog/Article scoring MUST include publication date and evaluate FAQ sections when they clarify real user questions
- **FR-036**: Product/Service scoring MUST evaluate question-style headings based on whether they reduce purchase friction
- **FR-037**: Conversion page scoring MUST prioritize action focus and conciseness over content comprehensiveness

#### Scoring Rubric

- **FR-038**: System MUST apply a deterministic and repeatable scoring process using a 0-100 percentage scale
- **FR-039**: Each scoring criterion MUST return a numeric score (0-100) and a short explanation
- **FR-039a**: Overall page score MUST be calculated as the simple average of all individual criterion scores
- **FR-040**: Scoring MUST evaluate clear direct answer or value clarity when appropriate for page type
- **FR-041**: Scoring MUST evaluate coverage of key user questions when relevant to page type
- **FR-042**: Scoring MUST evaluate strength of E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals
- **FR-043**: Scoring MUST evaluate quality and relevance of outbound links
- **FR-044**: Scoring MUST evaluate correctness and appropriateness of schema markup
- **FR-045**: Scoring MUST evaluate internal link support and context flow
- **FR-046**: Scoring MUST evaluate readability and layout clarity
- **FR-047**: Scoring MUST evaluate core performance indicators (page speed, mobile friendliness)
- **FR-048**: Scoring MUST evaluate indexing signals (robots meta, canonicals, redirects)
- **FR-049**: Scoring MUST evaluate basic accessibility checks (alt text, heading structure, ARIA)
- **FR-050**: System MUST record rubric version with each score to enable tracking of scoring changes over time

#### AI Evaluation and Recommendations

- **FR-051**: System MUST process and distill the two AEO principle PDFs one time into persistent scoring rules
- **FR-052**: AI agent MUST NOT reprocess PDFs each time a page is scored
- **FR-053**: AI recommendations MUST be concise (typically 2-4 sentences per recommendation)
- **FR-054**: AI recommendations MUST match the page type and avoid suggesting inappropriate patterns
- **FR-055**: AI recommendations MUST sound human and natural, avoiding robotic or formulaic phrasing
- **FR-056**: AI recommendations MUST reference specific parts of the extracted page content for clarity
- **FR-057**: AI recommendations MUST avoid forcing patterns that do not belong on the page type

#### Token and Cost Control

- **FR-058**: System MUST summarize page content before sending to AI, using short structured consistent summaries
- **FR-059**: System MUST cache AI results based on content hash and rubric version
- **FR-060**: System MUST skip AI processing when content has not changed and cached results exist
- **FR-061**: System MUST enforce a configurable token limit per crawl run
- **FR-062**: System MUST allow crawl pause and resume when token limits are reached
- **FR-063**: System MUST record and display token usage per project for visibility and cost tracking

#### User Interface

- **FR-064**: System MUST provide an organization and project switcher for users in multiple organizations
- **FR-065**: System MUST display a project dashboard showing recent crawl history and score trends
- **FR-066**: System MUST provide a pages table with filters by score range and page type
- **FR-067**: System MUST provide a page detail screen showing snapshot content, scoring breakdown, and AI recommendations
- **FR-068**: System MUST provide a rescore button that reprocesses scoring without refetching HTML when content hasn't changed
- **FR-069**: System MUST provide a compare runs view to show improvement or degradation between crawl runs
- **FR-070**: System MUST display in-app notifications (toast/banner) to users when background crawls and tasks complete

### Key Entities

- **Organization**: Represents a client or company using the platform. Contains name, settings, billing information, and creation metadata. Each organization is completely isolated from other organizations.

- **User**: Represents a person who uses the platform. Contains authentication credentials, profile information (name, email), and preferences. Users can belong to multiple organizations.

- **OrganizationMember**: Links users to organizations with role assignments (admin, editor, viewer). Admin role grants full control including user invites; Editor role allows creating/editing projects and running crawls; Viewer role provides read-only access to reports and dashboards.

- **Project**: Represents a website being analyzed for AEO readiness. Contains target URL, crawl configuration (depth limit defaulting to 3, sample size, token limits), organization association, and project metadata.

- **Page**: Represents a unique URL discovered during crawling. Contains normalized URL, first discovered date, last crawled date, project association, and current page type classification.

- **PageSnapshot**: Represents a versioned capture of a page's content at a specific point in time. Contains raw HTML, cleaned text, structured extraction output (title, meta, headings, body, FAQ, links, schema, author, date), performance metrics, and snapshot timestamp. Immutable once created.

- **PageScore**: Represents the evaluation of a page snapshot against the AEO rubric. Contains rubric version identifier, numeric scores by criteria category (0-100 scale), explanation text per criterion, overall score (0-100), AI-generated recommendations, and reference to the scored snapshot.

- **Embedding**: Represents vector embeddings of page content for similarity analysis. Contains page reference, embedding vector, model version, and creation timestamp. Used for topic grouping and related content discovery.

- **CrawlRun**: Represents a single execution of the crawler. Contains run type (full, sitemap-only, sample, delta), start and end timestamps, pages discovered count, pages processed count, token usage, status, and configuration snapshot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an organization and project in under 3 minutes from account creation
- **SC-002**: A full crawl of a 100-page website completes within 15 minutes
- **SC-003**: Page type detection achieves 90% accuracy when compared to manual classification
- **SC-004**: AI recommendations reference specific page content in 95% of generated suggestions
- **SC-005**: Token usage is reduced by at least 60% through content summarization and caching compared to sending full HTML to AI
- **SC-006**: Users can identify their lowest-scoring pages within 30 seconds of viewing the project dashboard
- **SC-007**: The system correctly prevents cross-organization data access in 100% of access attempts
- **SC-008**: Crawl runs resume successfully after interruption with less than 5% duplicate work
- **SC-009**: Score variations for unchanged content between runs differ by less than 2% when using the same rubric version
- **SC-010**: The comparison view displays improvement trends within 10 seconds for crawls containing up to 1000 pages
- **SC-011**: 80% of users report that AI recommendations sound natural and actionable in user feedback surveys
- **SC-012**: Delta crawls identify and reprocess only changed pages, reducing processing time by at least 70% for typical websites

## Assumptions

1. **Authentication System**: Simple email/password authentication will be used (no SSO or OAuth complexity). The system maintains multi-client separation and role-based access control, but the authentication mechanism itself is straightforward for internal use.

2. **Supabase as Primary Database**: The specification assumes Supabase (PostgreSQL) as the data store with Row-Level Security (RLS) capabilities for multi-tenant isolation.

3. **AI Provider**: OpenAI API (GPT-4 or GPT-4-turbo) will be used for generating recommendations and text-embedding-3-small for vector embeddings.

4. **PDF Processing**: The two AEO principle PDFs will be processed once during system setup or initial deployment, with results stored persistently in the database or configuration files.

5. **Background Job Processing**: We assume a job queue system (e.g., Bull, BullMQ, or Supabase pg_cron) will handle asynchronous crawl processing.

6. **Content Hash Algorithm**: We assume a standard cryptographic hash (SHA-256) will be used to detect content changes for caching purposes.

7. **Embedding Model**: We assume OpenAI text-embedding-3-small or similar will be used for vector embeddings, stored in Supabase's pgvector extension.

8. **Crawl Politeness**: Default crawl delays will be 1-2 seconds between requests to the same domain to avoid overwhelming target servers.

9. **Token Counting**: We assume token usage will be estimated using the AI provider's tokenization library before making API calls.

10. **Browser Rendering Threshold**: Static fetch will be considered "insufficient" when extracted text is less than 200 words, triggering browser rendering fallback.

11. **Historical Data Retention**: We assume all snapshots and scores are retained indefinitely unless explicitly deleted by organization admins, to enable long-term trend analysis.

12. **Page Type Classification**: Initial page type detection will use heuristics (URL patterns, content patterns, schema markup) rather than requiring manual classification, with the option to override.
