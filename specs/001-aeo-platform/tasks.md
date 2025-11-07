# Tasks: Multi-Client AEO Platform

**Input**: Design documents from `/specs/001-aeo-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- Backend: `server/`
- Frontend: `client/src/`
- Tests: `tests/`
- Database: `supabase/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure per plan.md in server/, client/src/, tests/, and supabase/
- [x] T002 Install backend dependencies: @supabase/supabase-js, openai, tiktoken, bullmq, ioredis, jsonwebtoken, bcrypt, pdf-parse
- [x] T003 [P] Install dev dependencies: supertest, jest-openapi
- [x] T004 [P] Update .gitignore to exclude node_modules, .env, and build artifacts
- [x] T005 [P] Create .env.example with all required environment variables per quickstart.md
- [x] T006 [P] Configure ESLint and Prettier for code quality

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Foundation

- [x] T007 Create initial database schema migration in supabase/migrations/001_initial_schema.sql
- [x] T008 Enable pgvector extension in Supabase for embeddings support
- [x] T009 Create Row-Level Security policies in server/services/database/rls-policies.sql
- [x] T010 [P] Create Supabase client setup in server/services/database/supabase.js
- [x] T011 [P] Create seed data script in supabase/seed/dev_data.sql for testing

### Authentication Foundation

- [x] T012 [P] Implement bcrypt password hashing service in server/services/auth/password.js
- [x] T013 [P] Implement JWT token generation and validation in server/services/auth/session.js
- [x] T014 Create authentication middleware in server/middleware/auth.js
- [x] T015 [P] Create role-based access control middleware in server/middleware/rbac.js

### API Foundation

- [x] T016 Update Express app in server/index.js to add authentication middleware
- [x] T017 [P] Create error handling middleware in server/middleware/error-handler.js
- [x] T018 [P] Create request logging middleware in server/middleware/logger.js

### Job Queue Foundation

- [x] T019 Setup BullMQ queue configuration in server/services/jobs/queue.js
- [x] T020 [P] Create job monitoring utilities in server/services/jobs/monitor.js

### Utility Foundation

- [x] T021 [P] Create URL normalizer utility in server/utils/url-normalizer.js
- [x] T022 [P] Create content hash utility in server/utils/cache.js
- [x] T023 [P] Create token counter utility using tiktoken in server/utils/token-counter.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Organization Setup and Project Creation (Priority: P1) 🎯 MVP

**Goal**: Enable users to create organizations, invite team members, and create projects with proper multi-tenant isolation

**Independent Test**: Create an organization, add users to it, create a project within that organization, and verify that only authorized users can see the organization's data

### Data Models for User Story 1

- [x] T024 [P] [US1] Create User model in server/models/user.js
- [x] T025 [P] [US1] Create Organization model in server/models/organization.js
- [x] T026 [P] [US1] Create OrganizationMember model in server/models/organization-member.js
- [x] T027 [P] [US1] Create Project model in server/models/project.js

### API Routes for User Story 1

- [x] T028 [US1] Implement authentication routes in server/api/routes/auth.js (POST /auth/register, POST /auth/login, GET /auth/me)
- [x] T029 [US1] Implement organization routes in server/api/routes/organizations.js (GET /organizations, POST /organizations, GET /organizations/:orgId, PATCH /organizations/:orgId)
- [x] T030 [US1] Implement organization member routes in server/api/routes/organizations.js (GET /organizations/:orgId/members, POST /organizations/:orgId/members)
- [x] T031 [US1] Implement project routes in server/api/routes/projects.js (GET /organizations/:orgId/projects, POST /organizations/:orgId/projects)

### Frontend Foundation for User Story 1

- [x] T032 [P] [US1] Create AuthContext in client/src/contexts/AuthContext.js
- [x] T033 [P] [US1] Create OrgContext in client/src/contexts/OrgContext.js
- [x] T034 [US1] Update API client with auth headers in client/src/services/api.js
- [x] T035 [US1] Create auth service in client/src/services/auth.js

### Frontend Components for User Story 1

- [x] T036 [P] [US1] Create Login component in client/src/components/auth/Login.js
- [x] T037 [P] [US1] Create Register component in client/src/components/auth/Register.js
- [x] T038 [P] [US1] Create organization switcher component in client/src/components/organizations/OrgSwitcher.js
- [x] T039 [P] [US1] Create organization management component in client/src/components/organizations/OrgManagement.js
- [x] T040 [P] [US1] Create project list component in client/src/components/projects/ProjectList.js
- [x] T041 [P] [US1] Create project creation form in client/src/components/projects/ProjectForm.js

### Frontend Pages for User Story 1

- [x] T042 [US1] Update App.js with routing and authentication in client/src/App.js
- [x] T043 [P] [US1] Create Login page in client/src/pages/Login.js
- [x] T044 [P] [US1] Create Dashboard page skeleton in client/src/pages/Dashboard.js

### Integration & Validation for User Story 1

- [x] T045 [US1] Test organization creation and user invitation flow end-to-end
- [x] T046 [US1] Verify RLS policies prevent cross-organization data access
- [x] T047 [US1] Validate role-based permissions (admin/editor/viewer)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Website Crawling and Snapshot Storage (Priority: P1)

**Goal**: Enable users to crawl websites, discover pages via sitemap and internal links, and store versioned snapshots of page content

**Independent Test**: Initiate a crawl on a test website, verify that pages are discovered correctly, content is extracted, and snapshots are stored with version history

### Data Models for User Story 2

- [x] T048 [P] [US2] Create CrawlRun model in server/models/crawl-run.js
- [x] T049 [P] [US2] Create Page model in server/models/page.js
- [x] T050 [P] [US2] Create PageSnapshot model in server/models/snapshot.js

### Crawler Infrastructure for User Story 2

- [x] T051 [US2] Update crawler engine for multi-tenancy in server/crawler/engine.js
- [x] T052 [P] [US2] Create content extractor in server/crawler/extractor.js
- [x] T053 [P] [US2] Update robots.txt checker for project-specific user agents in server/utils/robotsChecker.js
- [x] T054 [US2] Implement sitemap discovery and parsing in server/crawler/sitemap-parser.js
- [x] T055 [US2] Implement canonical URL following and deduplication in server/crawler/canonicalizer.js

### Background Job Processing for User Story 2

- [x] T056 [US2] Create crawl job processor in server/services/jobs/processors/crawl.js
- [x] T057 [US2] Implement crawl job with page discovery, extraction, and snapshot storage
- [x] T058 [US2] Add support for pause/resume functionality

### API Routes for User Story 2

- [x] T059 [US2] Implement crawl routes in server/api/routes/crawler.js (POST /projects/:projectId/crawls, GET /projects/:projectId/crawls, GET /crawls/:crawlId)
- [x] T060 [US2] Implement crawl control routes in server/api/routes/crawler.js (POST /crawls/:crawlId/pause, POST /crawls/:crawlId/resume)

### Frontend Components for User Story 2

- [x] T061 [P] [US2] Create crawl initiation component in client/src/components/projects/CrawlForm.js
- [x] T062 [P] [US2] Create crawl status display component in client/src/components/projects/CrawlStatus.js
- [x] T063 [P] [US2] Create crawl history component in client/src/components/projects/CrawlHistory.js

### Integration & Validation for User Story 2

- [x] T064 [US2] Test full crawl with sitemap discovery on test website
- [x] T065 [US2] Test link following up to depth limit
- [x] T066 [US2] Verify canonical URL handling and deduplication
- [x] T067 [US2] Verify snapshot versioning across multiple crawls
- [x] T068 [US2] Test browser rendering fallback when static fetch insufficient

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Intelligent Page Scoring with Type Awareness (Priority: P2)

**Goal**: Automatically detect page types and apply type-specific scoring rubrics to evaluate pages on a 0-100 scale

**Independent Test**: Score various page types independently, verify that each receives appropriate type-specific criteria, and confirm that scores are deterministic and repeatable

### Data Models for User Story 3

- [x] T069 [US3] Create PageScore model in server/models/score.js

### AI Services for User Story 3

- [x] T070 [P] [US3] Setup OpenAI API client in server/services/ai/client.js
- [x] T071 [P] [US3] Implement one-time PDF processor for AEO guides in server/services/ai/pdf-processor.js
- [x] T072 [US3] Process AEO principle PDFs and store distilled rules in database or config file
- [x] T073 [P] [US3] Implement content summarizer in server/services/ai/summarizer.js

### Scoring Engine for User Story 3

- [x] T074 [US3] Implement page-type detection in server/crawler/analyzer.js
- [x] T075 [US3] Update scorer for 0-100 scale in server/crawler/scorer.js
- [x] T076 [US3] Create type-specific rubrics in server/crawler/rubrics/ directory
- [x] T077 [US3] Implement rubric application logic with simple averaging for overall score
- [x] T078 [US3] Create scoring job processor in server/services/jobs/processors/score.js

### API Routes for User Story 3

- [x] T079 [US3] Implement score retrieval routes in server/api/routes/scores.js (GET /scores/:scoreId)
- [x] T080 [US3] Implement page list route with score filtering in server/api/routes/projects.js (GET /projects/:projectId/pages)

### Frontend Components for User Story 3

- [x] T081 [P] [US3] Create pages table component with filters in client/src/components/pages/PageTable.js
- [x] T082 [P] [US3] Create page detail component in client/src/components/pages/PageDetail.js
- [x] T083 [P] [US3] Create score breakdown display in client/src/components/scoring/ScoreBreakdown.js

### Frontend Pages for User Story 3

- [x] T084 [US3] Create page detail page in client/src/pages/PageDetail.js

### Integration & Validation for User Story 3

- [x] T085 [US3] Test page-type detection accuracy on diverse sample pages
- [x] T086 [US3] Verify type-specific rubrics apply correctly (homepage vs blog vs product)
- [x] T087 [US3] Validate score determinism (same content = same score)
- [x] T088 [US3] Verify overall score calculation as simple average

**Checkpoint**: All core scoring functionality should now be operational

---

## Phase 6: User Story 4 - AI-Powered Improvement Recommendations (Priority: P2)

**Goal**: Generate specific, human-sounding recommendations that reference actual page content and avoid generic advice

**Independent Test**: Review AI recommendations for various page types and verify they are concise, page-type appropriate, reference specific content, and avoid formulaic patterns

### AI Recommendation Engine for User Story 4

- [ ] T089 [US4] Implement AI recommendation generator in server/services/ai/recommender.js
- [ ] T090 [US4] Integrate recommendation generation with scoring flow
- [ ] T091 [US4] Add prompts for natural, page-type-aware recommendations
- [ ] T092 [US4] Implement recommendation caching based on content hash

### Frontend Components for User Story 4

- [ ] T093 [P] [US4] Create recommendations display component in client/src/components/scoring/Recommendations.js
- [ ] T094 [P] [US4] Update page detail view to show recommendations

### Integration & Validation for User Story 4

- [ ] T095 [US4] Test recommendation quality across different page types
- [ ] T096 [US4] Verify recommendations reference specific page content
- [ ] T097 [US4] Validate natural language variation (no formulaic patterns)

**Checkpoint**: AI recommendations should enhance scoring with actionable guidance

---

## Phase 7: User Story 5 - Token and Cost Management (Priority: P2)

**Goal**: Control AI processing costs with token limits, caching, and usage tracking

**Independent Test**: Monitor token usage during crawls, verify cache hits prevent redundant AI calls, and confirm that token limits pause processing appropriately

### Token Management for User Story 5

- [ ] T098 [US5] Implement token limit enforcement in crawl job processor
- [ ] T099 [US5] Add cache lookup before AI processing in scorer
- [ ] T100 [US5] Implement token usage tracking per project
- [ ] T101 [US5] Add pause/resume logic for token limit reached

### API Routes for User Story 5

- [ ] T102 [US5] Add token usage endpoints in server/api/routes/projects.js (GET /projects/:projectId/token-usage)

### Frontend Components for User Story 5

- [ ] T103 [P] [US5] Create token usage dashboard component in client/src/components/dashboard/TokenUsage.js
- [ ] T104 [P] [US5] Update crawl status to show token limits and usage

### Integration & Validation for User Story 5

- [ ] T105 [US5] Test token limit pause and resume functionality
- [ ] T106 [US5] Verify cache hits avoid redundant AI calls
- [ ] T107 [US5] Validate token usage tracking accuracy

**Checkpoint**: Token management should prevent runaway costs

---

## Phase 8: User Story 6 - Project Dashboard and Historical Comparison (Priority: P3)

**Goal**: Enable users to view crawl history, score trends, and compare runs to identify improvements or regressions

**Independent Test**: Run multiple crawls over time, view the dashboard, compare different runs, and filter results by various criteria

### API Routes for User Story 6

- [ ] T108 [US6] Implement dashboard endpoint in server/api/routes/dashboard.js (GET /projects/:projectId/dashboard)
- [ ] T109 [US6] Implement comparison endpoint in server/api/routes/dashboard.js (GET /projects/:projectId/compare)

### Frontend Components for User Story 6

- [ ] T110 [P] [US6] Create score trend chart in client/src/components/dashboard/ScoreTrends.js
- [ ] T111 [P] [US6] Create crawl history summary in client/src/components/dashboard/CrawlSummary.js
- [ ] T112 [P] [US6] Create comparison view component in client/src/components/dashboard/ComparisonView.js
- [ ] T113 [P] [US6] Update page table with advanced filtering

### Frontend Pages for User Story 6

- [ ] T114 [US6] Complete Dashboard page with all dashboard components in client/src/pages/Dashboard.js

### Integration & Validation for User Story 6

- [ ] T115 [US6] Test dashboard loads within 10 seconds for 1000 pages
- [ ] T116 [US6] Verify comparison view correctly identifies improvements/declines
- [ ] T117 [US6] Test filtering by score range and page type

**Checkpoint**: Historical tracking and comparison should provide strategic insights

---

## Phase 9: User Story 7 - Targeted Rescoring Without Refetching (Priority: P3)

**Goal**: Enable users to rescore specific pages without running a full crawl, using existing HTML snapshots when content hasn't changed

**Independent Test**: Use the rescore button on a page detail screen, verify that scoring occurs without new HTTP requests when content hasn't changed, and confirm that scores update appropriately

### API Routes for User Story 7

- [ ] T118 [US7] Implement rescore endpoint in server/api/routes/scores.js (POST /pages/:pageId/rescore)
- [ ] T119 [US7] Implement batch rescore endpoint in server/api/routes/scores.js (POST /projects/:projectId/rescore)

### Backend Logic for User Story 7

- [ ] T120 [US7] Implement rescore logic that uses existing snapshot when content unchanged
- [ ] T121 [US7] Add background job support for batch rescoring

### Frontend Components for User Story 7

- [ ] T122 [P] [US7] Add rescore button to page detail view
- [ ] T123 [P] [US7] Add batch rescore UI to page table

### Integration & Validation for User Story 7

- [ ] T124 [US7] Test rescore without refetch when content unchanged
- [ ] T125 [US7] Test batch rescoring with in-app notification on completion
- [ ] T126 [US7] Verify rubric version tracking on rescore

**Checkpoint**: All user stories should now be independently functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Testing & Quality

- [ ] T127 [P] Add contract tests using supertest + jest-openapi in tests/contract/api/
- [ ] T128 [P] Add integration tests for critical user journeys in tests/integration/
- [ ] T129 [P] Add unit tests for models in tests/unit/server/models/
- [ ] T130 [P] Add unit tests for services in tests/unit/server/services/

### Documentation

- [ ] T131 [P] Update README.md with project overview and setup instructions
- [ ] T132 [P] Create API documentation using OpenAPI spec
- [ ] T133 [P] Update CLAUDE.md with active technologies and commands

### Performance & Security

- [ ] T134 Add rate limiting to API endpoints
- [ ] T135 Implement request/response compression
- [ ] T136 [P] Add input validation for all API endpoints
- [ ] T137 [P] Security audit: check for SQL injection, XSS, and other vulnerabilities
- [ ] T138 Performance optimization: add database indexes per data-model.md

### Deployment

- [ ] T139 Configure Vercel deployment settings
- [ ] T140 Setup environment variables in Vercel dashboard
- [ ] T141 Configure Redis instance (Upstash) for production
- [ ] T142 Run quickstart.md validation steps

### Monitoring & Observability

- [ ] T143 [P] Add error tracking (Sentry or similar)
- [ ] T144 [P] Add performance monitoring
- [ ] T145 [P] Setup logging aggregation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 3 (P2): Depends on User Story 2 (needs crawled data to score)
  - User Story 4 (P2): Depends on User Story 3 (enhances scoring)
  - User Story 5 (P2): Depends on User Story 3 (token management for AI scoring)
  - User Story 6 (P3): Depends on User Story 3 (needs scores for trends)
  - User Story 7 (P3): Depends on User Story 3 (rescores existing snapshots)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational) ──┬──> User Story 1 (P1)
                         │
                         └──> User Story 2 (P1) ──> User Story 3 (P2) ──┬──> User Story 4 (P2)
                                                                         │
                                                                         ├──> User Story 5 (P2)
                                                                         │
                                                                         ├──> User Story 6 (P3)
                                                                         │
                                                                         └──> User Story 7 (P3)
```

### Within Each User Story

- Data models before services
- Services before API routes
- API routes before frontend components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- User Story 1 and User Story 2 can be developed in parallel after Foundational complete
- User Stories 4, 5 can be developed in parallel after User Story 3 complete
- User Stories 6, 7 can be developed in parallel after User Story 3 complete
- All tests marked [P] within a phase can run in parallel
- Models within a story marked [P] can run in parallel
- Frontend components within a story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all data models for User Story 1 together:
Task: "Create User model in server/models/user.js"
Task: "Create Organization model in server/models/organization.js"
Task: "Create OrganizationMember model in server/models/organization-member.js"
Task: "Create Project model in server/models/project.js"

# Launch frontend contexts together:
Task: "Create AuthContext in client/src/contexts/AuthContext.js"
Task: "Create OrgContext in client/src/contexts/OrgContext.js"

# Launch frontend components together (after contexts done):
Task: "Create Login component in client/src/components/auth/Login.js"
Task: "Create Register component in client/src/components/auth/Register.js"
Task: "Create organization switcher component in client/src/components/organizations/OrgSwitcher.js"
Task: "Create organization management component in client/src/components/organizations/OrgManagement.js"
Task: "Create project list component in client/src/components/projects/ProjectList.js"
Task: "Create project creation form in client/src/components/projects/ProjectForm.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Organization & Projects)
4. Complete Phase 4: User Story 2 (Crawling & Snapshots)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo basic crawling platform

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo
3. Add User Story 2 → Test independently → Deploy/Demo (MVP with crawling!)
4. Add User Story 3 → Test independently → Deploy/Demo (MVP with scoring!)
5. Add User Story 4 → Test independently → Deploy/Demo (AI recommendations)
6. Add User Story 5 → Test independently → Deploy/Demo (Cost control)
7. Add User Story 6 → Test independently → Deploy/Demo (Historical tracking)
8. Add User Story 7 → Test independently → Deploy/Demo (Targeted rescoring)
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (2-3 weeks)
2. Once Foundational is done:
   - Developer A: User Story 1 (Organizations & Projects)
   - Developer B: User Story 2 (Crawling)
3. After US1 & US2 complete:
   - Developer A: User Story 3 (Scoring)
   - Developer B: User Story 6 (Dashboard)
4. After US3 complete:
   - Developer A: User Story 4 (AI Recommendations)
   - Developer B: User Story 5 (Token Management)
   - Developer C: User Story 7 (Rescoring)

---

## Summary

**Total Tasks**: 145 tasks

**Task Count per User Story**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 17 tasks
- Phase 3 (User Story 1 - P1): 24 tasks
- Phase 4 (User Story 2 - P1): 21 tasks
- Phase 5 (User Story 3 - P2): 20 tasks
- Phase 6 (User Story 4 - P2): 9 tasks
- Phase 7 (User Story 5 - P2): 10 tasks
- Phase 8 (User Story 6 - P3): 10 tasks
- Phase 9 (User Story 7 - P3): 9 tasks
- Phase 10 (Polish): 19 tasks

**Parallel Opportunities Identified**:
- Phase 1: 5 parallel tasks
- Phase 2: 12 parallel tasks
- User Story 1: 13 parallel tasks
- User Story 2: 8 parallel tasks
- User Story 3: 7 parallel tasks
- User Story 4: 2 parallel tasks
- User Story 5: 2 parallel tasks
- User Story 6: 4 parallel tasks
- User Story 7: 2 parallel tasks
- Polish: 10 parallel tasks

**Independent Test Criteria**:
- User Story 1: Create organization → Add users → Create project → Verify isolation
- User Story 2: Initiate crawl → Verify page discovery → Check snapshot storage
- User Story 3: Score pages → Verify type detection → Confirm deterministic scores
- User Story 4: Generate recommendations → Verify page-specific content references
- User Story 5: Monitor tokens → Test cache hits → Verify limit enforcement
- User Story 6: View dashboard → Compare runs → Filter pages
- User Story 7: Rescore page → Verify no refetch → Confirm score update

**Suggested MVP Scope**: User Story 1 + User Story 2 (Organization setup + Basic crawling without scoring)

**Format Validation**: ✅ All tasks follow the checklist format (checkbox, ID, optional [P] marker, [Story] label, file paths)

---

## Notes

- [P] tasks = different files, no dependencies within the same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests are not explicitly included as they were not requested in the specification
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
