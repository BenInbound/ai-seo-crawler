# Quickstart: Multi-Client AEO Platform

**Date**: 2025-11-07
**Feature**: Multi-Client Answer Engine Optimization Platform
**Branch**: `001-aeo-platform`

## Overview

This guide will help you get started implementing the Multi-Client AEO Platform. Follow these steps in order to set up the development environment and begin implementation.

---

## Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- PostgreSQL 14+ or Supabase account
- Redis instance (local or Upstash)
- Anthropic API key
- Git repository cloned

---

## Step 1: Install Dependencies

Install new dependencies required for the platform:

```bash
# Backend dependencies
npm install @supabase/supabase-js openai tiktoken bullmq ioredis jsonwebtoken bcrypt pdf-parse

# Dev dependencies
npm install --save-dev supertest jest-openapi

# Update existing dependencies
npm update
```

---

## Step 2: Environment Configuration

Create or update `.env` file with required credentials:

```env
# Existing
PORT=3001
NODE_ENV=development

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for job queue)
REDIS_URL=redis://localhost:6379
# OR for Upstash:
# REDIS_URL=rediss://:password@host:port

# Authentication
JWT_SECRET=your-secure-random-secret-key-change-this
JWT_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=your-openai-api-key

# Crawling
USER_AGENT=AEO-Platform-Bot/1.0
CRAWL_DELAY_MS=1000
```

---

## Step 3: Database Setup

### Option A: Using Supabase Dashboard

1. Create a new Supabase project
2. Navigate to SQL Editor
3. Run the migration script: `supabase/migrations/001_initial_schema.sql`
4. Enable Row-Level Security on all tables
5. Apply RLS policies from `server/services/database/rls-policies.sql`
6. Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in project
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Generate TypeScript types (optional)
supabase gen types typescript --local > types/supabase.ts
```

---

## Step 4: Project Structure Setup

Create the new directory structure:

```bash
# Server directories
mkdir -p server/models
mkdir -p server/services/ai
mkdir -p server/services/auth
mkdir -p server/services/database
mkdir -p server/services/jobs/processors
mkdir -p server/api/routes
mkdir -p server/utils

# Client directories
mkdir -p client/src/components/auth
mkdir -p client/src/components/organizations
mkdir -p client/src/components/projects
mkdir -p client/src/components/dashboard
mkdir -p client/src/components/pages
mkdir -p client/src/components/scoring
mkdir -p client/src/contexts
mkdir -p client/src/pages
mkdir -p client/src/services

# Test directories
mkdir -p tests/unit/server/models
mkdir -p tests/unit/server/services
mkdir -p tests/integration/api
mkdir -p tests/contract/api

# Database
mkdir -p supabase/migrations
mkdir -p supabase/seed
```

---

## Step 5: Core Services Implementation Order

Follow this implementation order for best results:

### Phase 1: Foundation (Priority P1)

1. **Database Layer**
   - [ ] Create Supabase client setup (`server/services/database/supabase.js`)
   - [ ] Implement models (`server/models/*.js`)
   - [ ] Apply RLS policies
   - [ ] Write model unit tests

2. **Authentication**
   - [ ] Implement password hashing (`server/services/auth/password.js`)
   - [ ] Implement JWT token generation/validation (`server/services/auth/session.js`)
   - [ ] Create auth routes (`server/api/routes/auth.js`)
   - [ ] Add auth middleware to Express app
   - [ ] Write auth tests

3. **Organization & User Management**
   - [ ] Create organization routes (`server/api/routes/organizations.js`)
   - [ ] Create org member routes
   - [ ] Implement role-based access control middleware
   - [ ] Write organization tests

4. **Project Management**
   - [ ] Create project routes (`server/api/routes/projects.js`)
   - [ ] Implement project CRUD operations
   - [ ] Write project tests

### Phase 2: Core Features (Priority P1)

5. **Crawling Infrastructure**
   - [ ] Set up BullMQ queue (`server/services/jobs/queue.js`)
   - [ ] Modify existing crawler for multi-tenancy (`server/crawler/engine.js`)
   - [ ] Implement URL normalizer (`server/utils/url-normalizer.js`)
   - [ ] Create content extractor (`server/crawler/extractor.js`)
   - [ ] Implement job processor (`server/services/jobs/processors/crawl.js`)
   - [ ] Create crawl routes (`server/api/routes/crawler.js`)
   - [ ] Write crawler integration tests

6. **Content Storage**
   - [ ] Implement page snapshot storage
   - [ ] Implement content hashing (`server/utils/cache.js`)
   - [ ] Write snapshot tests

### Phase 3: Scoring & AI (Priority P2)

7. **AI Integration**
   - [ ] Set up OpenAI API client (`server/services/ai/client.js`)
   - [ ] Process AEO PDFs one-time (`server/services/ai/pdf-processor.js`)
   - [ ] Store distilled principles in database/config
   - [ ] Implement content summarizer (`server/services/ai/summarizer.js`)
   - [ ] Implement token counter with tiktoken (`server/utils/token-counter.js`)

8. **Scoring System**
   - [ ] Update scorer for 0-100 scale (`server/crawler/scorer.js`)
   - [ ] Implement page-type detection (`server/crawler/analyzer.js`)
   - [ ] Create type-specific rubrics
   - [ ] Implement scoring job processor
   - [ ] Create scoring routes (`server/api/routes/scores.js`)
   - [ ] Write scoring tests

9. **AI Recommendations**
   - [ ] Implement recommendation generator (`server/services/ai/recommender.js`)
   - [ ] Implement result caching
   - [ ] Integrate with scoring flow
   - [ ] Write recommendation tests

### Phase 4: Frontend & Dashboard (Priority P3)

10. **Frontend Foundation**
    - [ ] Create AuthContext (`client/src/contexts/AuthContext.js`)
    - [ ] Create OrgContext (`client/src/contexts/OrgContext.js`)
    - [ ] Update API client with auth headers (`client/src/services/api.js`)
    - [ ] Create auth service (`client/src/services/auth.js`)

11. **Auth UI**
    - [ ] Login component
    - [ ] Register component
    - [ ] Update App.js with routing

12. **Organization UI**
    - [ ] Organization switcher component
    - [ ] Organization list/management
    - [ ] Member management

13. **Project & Dashboard UI**
    - [ ] Project list component
    - [ ] Dashboard page with trends
    - [ ] Pages table with filters
    - [ ] Page detail view
    - [ ] Score comparison view

---

## Step 6: Testing Setup

### Contract Testing

1. Load OpenAPI spec in tests:
```javascript
const jestOpenAPI = require('jest-openapi').default;
const path = require('path');

jestOpenAPI(path.join(__dirname, '../specs/001-aeo-platform/contracts/openapi.yaml'));
```

2. Write contract tests:
```javascript
const request = require('supertest');
const app = require('../server/index');

describe('API Contract Tests', () => {
  it('GET /api/organizations should satisfy spec', async () => {
    const response = await request(app)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response).toSatisfyApiSpec();
  });
});
```

---

## Step 7: Development Workflow

### Local Development

```bash
# Terminal 1: Start Redis (if local)
redis-server

# Terminal 2: Start backend
npm run server:dev

# Terminal 3: Start frontend
npm run client:dev

# Terminal 4: Watch tests
npm test -- --watch
```

### Database Migrations

When schema changes are needed:

1. Create new migration file: `supabase/migrations/00X_description.sql`
2. Test locally: `supabase db reset` (resets and applies all migrations)
3. Push to remote: `supabase db push`

### Running Background Jobs

Background jobs run automatically when the server starts. Monitor job queue:

```javascript
// In separate script or admin dashboard
const { Queue } = require('bullmq');
const crawlQueue = new Queue('crawl', { connection: redisConnection });

// Get job counts
const counts = await crawlQueue.getJobCounts();
console.log(counts); // { waiting, active, completed, failed }

// Get failed jobs
const failed = await crawlQueue.getFailed();
```

---

## Step 8: Deployment Checklist

Before deploying to Vercel:

- [ ] All environment variables set in Vercel dashboard
- [ ] Supabase database configured and migrated
- [ ] Redis instance provisioned (Upstash recommended)
- [ ] API keys secured and rotated from defaults
- [ ] RLS policies tested and verified
- [ ] Rate limiting configured
- [ ] Error tracking set up (Sentry, LogRocket, etc.)
- [ ] Performance monitoring configured

---

## Common Issues & Solutions

### Issue: Puppeteer fails in serverless

**Solution**: Ensure `@sparticuz/chromium` is installed and imported correctly:
```javascript
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

### Issue: JWT token expires too quickly

**Solution**: Adjust `JWT_EXPIRES_IN` in .env and implement refresh token flow if needed.

### Issue: RLS policies blocking legitimate queries

**Solution**: Check that JWT payload includes correct user_id and verify RLS policies use `auth.uid()` correctly. Use service role client for admin operations.

### Issue: Job queue not processing

**Solution**: Verify Redis connection, check worker is running, inspect job error logs:
```javascript
crawlQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

---

## API Documentation

View the full API specification:
- **Local**: `http://localhost:3001/api-docs` (if Swagger UI configured)
- **Spec File**: `specs/001-aeo-platform/contracts/openapi.yaml`

Test API endpoints:
- Use Postman/Insomnia with OpenAPI import
- Use `curl` with JWT token:
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \
       http://localhost:3001/api/organizations
  ```

---

## Next Steps

After completing the quickstart:

1. Review [data-model.md](./data-model.md) for complete schema reference
2. Review [research.md](./research.md) for technology decisions
3. Review [plan.md](./plan.md) for full implementation plan
4. Run `/speckit.tasks` to generate detailed task list
5. Start implementing Phase 1 tasks

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **OpenAI API Docs**: https://platform.openai.com/docs
- **BullMQ Docs**: https://docs.bullmq.io
- **OpenAPI Tools**: https://swagger.io/tools/

---

## Development Timeline Estimate

Based on a single full-time developer:

- **Phase 1** (Foundation): 2-3 weeks
- **Phase 2** (Core Features): 2-3 weeks
- **Phase 3** (Scoring & AI): 2 weeks
- **Phase 4** (Frontend): 2-3 weeks

**Total**: 8-11 weeks for MVP

With a team of 2-3 developers working in parallel: 4-6 weeks for MVP.
