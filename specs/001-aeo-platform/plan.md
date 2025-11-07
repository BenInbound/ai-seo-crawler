# Implementation Plan: Multi-Client AEO Platform

**Branch**: `001-aeo-platform` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-aeo-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform the existing single-user ai-seo-crawler into a multi-tenant Answer Engine Optimization platform. The system will support multiple organizations with isolated data, intelligent page-type-aware scoring (0-100 scale), AI-powered recommendations, and comprehensive crawl management. Key capabilities include: organization/project management with role-based access control (Admin/Editor/Viewer), versioned page snapshots, deterministic scoring with simple averaging, token-optimized AI analysis with caching, and historical comparison dashboards.

## Technical Context

**Language/Version**: Node.js 18+ (JavaScript ES6+)
**Primary Dependencies**:
  - Backend: Express.js, @supabase/supabase-js, Puppeteer, Cheerio, BullMQ + ioredis
  - Frontend: React 18, TailwindCSS, Recharts, Axios
  - AI: openai (official OpenAI SDK - GPT-4 + embeddings)
  - PDF Processing: pdf-parse (one-time AEO guide text extraction)
  - Auth: jsonwebtoken, bcrypt
  - Token Counting: tiktoken (OpenAI tokenizer)
**Storage**: Supabase (PostgreSQL with Row-Level Security + pgvector extension)
**Testing**: Jest (existing), supertest + jest-openapi (API contract validation)
**Target Platform**: Vercel (serverless functions) + client-side React SPA
**Project Type**: Web application (backend + frontend)
**Performance Goals**:
  - 100-page crawl completes in <15 minutes (SC-002)
  - Dashboard loads in <10 seconds for 1000 pages (SC-010)
  - API response <200ms p95
**Constraints**:
  - Token budget enforcement per crawl (configurable limits)
  - 60% token reduction through summarization/caching (SC-005)
  - Serverless cold start tolerance
  - Browser rendering (Puppeteer) only when static fetch insufficient
**Scale/Scope**:
  - 10+ organizations, 100+ projects total
  - Crawls up to 10,000 pages per website
  - Historical snapshots retained indefinitely per org

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Status**: PASS (No project constitution defined - proceeding with standard best practices)

Since no project-specific constitution exists, the following standard practices will be applied:
- Maintain existing code structure and conventions
- Add comprehensive error handling
- Include unit and integration tests
- Document all public APIs
- Follow existing patterns (Express routes, React components)

**Post-Design Status**: PASS

Phase 1 design complete. Validation:
- ✅ Maintains existing Express + React structure
- ✅ Follows RESTful API conventions
- ✅ Contract testing approach defined (supertest + jest-openapi)
- ✅ Database schema properly normalized with RLS
- ✅ Authentication approach simplified per user requirements
- ✅ No unnecessary complexity introduced

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── api/
│   └── routes/
│       ├── auth.js              # NEW: Authentication endpoints
│       ├── organizations.js      # NEW: Org management
│       ├── projects.js           # NEW: Project management
│       ├── crawler.js            # MODIFIED: Multi-tenant crawling
│       ├── scores.js             # NEW: Scoring endpoints
│       └── dashboard.js          # NEW: Analytics/comparison
├── crawler/
│   ├── engine.js                 # MODIFIED: Multi-project support
│   ├── analyzer.js               # MODIFIED: Page-type detection
│   ├── scorer.js                 # MODIFIED: 0-100 scale, type-aware rubrics
│   └── extractor.js              # NEW: Structured content extraction
├── services/
│   ├── ai/
│   │   ├── client.js             # NEW: Claude API integration
│   │   ├── summarizer.js         # NEW: Content summarization
│   │   ├── recommender.js        # NEW: AI recommendations
│   │   └── pdf-processor.js      # NEW: One-time PDF distillation
│   ├── auth/
│   │   ├── password.js           # NEW: bcrypt hashing
│   │   └── session.js            # NEW: JWT generation/validation
│   ├── database/
│   │   ├── supabase.js           # NEW: Supabase client setup
│   │   └── rls-policies.sql      # NEW: Row-Level Security policies
│   └── jobs/
│       ├── queue.js              # NEW: Bull/BullMQ setup
│       └── processors/
│           ├── crawl.js          # NEW: Background crawl processing
│           └── score.js          # NEW: Background scoring processing
├── models/                        # NEW: Data access layer
│   ├── organization.js
│   ├── user.js
│   ├── project.js
│   ├── page.js
│   ├── snapshot.js
│   └── score.js
├── utils/
│   ├── robotsChecker.js          # EXISTING
│   ├── url-normalizer.js         # NEW: Canonical/dedup logic
│   ├── token-counter.js          # NEW: Token estimation
│   └── cache.js                  # NEW: Content hash-based caching
└── index.js                       # MODIFIED: Add auth middleware

client/
├── src/
│   ├── components/
│   │   ├── auth/                 # NEW: Login/Register forms
│   │   ├── organizations/        # NEW: Org switcher, management
│   │   ├── projects/             # NEW: Project list, creation
│   │   ├── dashboard/            # NEW: Score trends, comparison
│   │   ├── pages/                # NEW: Page table, filters
│   │   └── scoring/              # NEW: Detail view, recommendations
│   ├── services/
│   │   ├── api.js                # MODIFIED: Auth headers
│   │   └── auth.js               # NEW: Login/logout logic
│   ├── contexts/
│   │   ├── AuthContext.js        # NEW: User session state
│   │   └── OrgContext.js         # NEW: Current org/project state
│   ├── pages/                    # NEW: Page-level components
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── ProjectDetail.js
│   │   └── PageDetail.js
│   └── App.js                    # MODIFIED: Add routing, auth

tests/
├── unit/
│   ├── server/
│   │   ├── models/               # NEW: Model tests
│   │   ├── services/             # NEW: Service tests
│   │   └── utils/                # NEW: Utility tests
│   └── client/
│       └── components/           # NEW: Component tests
├── integration/
│   ├── api/                      # NEW: API endpoint tests
│   ├── crawler/                  # NEW: E2E crawl tests
│   └── scoring/                  # NEW: Scoring accuracy tests
└── contract/
    └── api/                      # NEW: OpenAPI validation

supabase/
├── migrations/                    # NEW: Database schema migrations
│   └── 001_initial_schema.sql
└── seed/                          # NEW: Test data
    └── dev_data.sql
```

**Structure Decision**: Maintain existing web application structure (server/ + client/) and extend with multi-tenancy layers. Backend follows Express.js patterns with new routes, services, and models. Frontend maintains React component structure with new feature-specific directories. Database schema managed via Supabase migrations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations
