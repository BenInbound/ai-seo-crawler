# Research: Multi-Client AEO Platform

**Date**: 2025-11-07
**Feature**: Multi-Client Answer Engine Optimization Platform

## Overview

This document captures research findings and decisions for technical dependencies and architectural patterns required to implement the multi-tenant AEO platform.

## OpenAI API Client

**Decision**: Use `openai` (official OpenAI SDK)

**Rationale**:
- Official library maintained by OpenAI with guaranteed compatibility
- Full TypeScript support with type definitions
- Built-in streaming capabilities for long AI responses
- Automatic retry logic for rate limits and transient errors
- Access to GPT-4, GPT-4-turbo, and embedding models in one package
- Well-documented and widely adopted

**Alternatives Considered**:
- Generic HTTP clients (axios, fetch) - Rejected due to lack of streaming helpers and retry logic
- Community wrappers - Rejected in favor of official support

**Implementation Notes**:
- Install: `npm install openai`
- Configure via `OPENAI_API_KEY` environment variable
- Use GPT-4 or GPT-4-turbo for AI recommendations
- Use streaming API for recommendation generation to provide progress feedback
- Use text-embedding-3-small for embeddings (already planned)

---

## PDF Processing

**Decision**: Use `pdf-parse` for one-time AEO guide distillation

**Rationale**:
- Lightweight, pure TypeScript library with zero external dependencies
- Simple API perfect for one-time processing tasks
- Cross-platform compatibility (no Poppler or system binaries required)
- Recently updated (v2.4.5, 2025) with active maintenance
- Sufficient for text extraction from structured PDF documents

**Alternatives Considered**:
- `pdfjs-dist` (Mozilla PDF.js) - Overkill for simple text extraction
- `pdfreader` - More complex API, unnecessary for our use case
- Poppler-based solutions - Require system-level dependencies, deployment complexity

**Implementation Notes**:
- Install: `npm install pdf-parse`
- Process both AEO PDFs during system initialization or first deployment
- Store extracted principles in database or config file for persistence
- Simple usage: `const data = await pdfParse(pdfBuffer)`
- Extract text content and structure into distilled scoring rules

---

## Contract Testing

**Decision**: Use `supertest` + `jest-openapi` for API contract validation

**Rationale**:
- SuperTest is the de facto standard for Express.js API testing
- Seamlessly integrates with existing Jest test suite
- jest-openapi validates responses against OpenAPI 3.x specifications
- Prevents API contract drift between documentation and implementation
- Fast, reliable tests suitable for CI/CD pipelines
- No external infrastructure required (unlike Pact broker)

**Alternatives Considered**:
- Pact.js - Overkill for monolithic API, requires broker infrastructure
- Manual schema validation - Error-prone and time-consuming
- Postman/Newman - External tooling, less integrated with Jest workflow

**Implementation Notes**:
- Install: `npm install --save-dev supertest jest-openapi`
- Create OpenAPI 3.x specification in `specs/001-aeo-platform/contracts/`
- Load spec in test setup: `jestOpenAPI('/path/to/openapi.yaml')`
- Use `.toSatisfyApiSpec()` matcher to validate responses
- Example test pattern:
  ```javascript
  const response = await request(app).get('/api/projects');
  expect(response.status).toBe(200);
  expect(response).toSatisfyApiSpec();
  ```

---

## Job Queue for Background Processing

**Decision**: Use `bullmq` (modern Bull queue with better TypeScript support)

**Rationale**:
- Modern rewrite of Bull with full TypeScript support
- Redis-backed for reliability and persistence
- Built-in retry mechanisms and failure handling
- Supports job prioritization and delayed jobs
- Well-suited for long-running crawl and scoring tasks
- Good observability with job events and progress tracking

**Alternatives Considered**:
- Bull (original) - Less TypeScript support, maintenance mode
- Agenda - MongoDB-based, doesn't fit our PostgreSQL stack
- bee-queue - Simpler but lacks advanced features we need
- AWS SQS/Lambda - Vendor lock-in, more complex deployment

**Implementation Notes**:
- Install: `npm install bullmq ioredis`
- Requires Redis instance (can use Upstash Redis on Vercel)
- Create separate queues for crawl and scoring jobs
- Implement job processors in `server/services/jobs/processors/`
- Set token budget limits per job execution
- Support pause/resume for token limit enforcement

---

## Authentication Strategy

**Decision**: JWT tokens with bcrypt password hashing

**Rationale**:
- Simple email/password authentication as specified in clarifications
- JWT tokens enable stateless API authentication
- bcrypt is industry standard for password hashing
- No need for complex OAuth/SSO infrastructure per user requirements
- Tokens can encode user ID and organization memberships

**Implementation Notes**:
- Install: `npm install jsonwebtoken bcrypt`
- Hash passwords with bcrypt (10 rounds minimum)
- Issue JWT on login with 7-day expiration
- Include user_id and org_ids in token payload
- Middleware to validate token and inject user context into requests
- Refresh token flow optional (can add later if needed)

---

## URL Normalization and Canonicalization

**Decision**: Build custom normalizer using Node.js URL API + heuristics

**Rationale**:
- Need custom logic for tracking parameter detection
- Must handle canonical link following per spec
- Simple enough to implement without external dependencies
- Full control over normalization rules

**Implementation Strategy**:
- Use native `URL` class for parsing
- Strip common tracking parameters (utm_*, fbclid, gclid, etc.)
- Normalize protocol, trailing slashes, default ports
- Follow canonical links from HTML `<link rel="canonical">`
- Detect pagination patterns (page=, p=, offset=) to prevent loops
- Hash normalized URLs for duplicate detection

---

## Content Hashing for Cache Keys

**Decision**: Use Node.js `crypto` module with SHA-256

**Rationale**:
- Built-in, no dependencies required
- SHA-256 provides sufficient collision resistance
- Fast hashing suitable for large HTML content
- Cache key format: `sha256(cleanedText + rubricVersion)`

**Implementation Notes**:
```javascript
const crypto = require('crypto');
function hashContent(text, rubricVersion) {
  return crypto.createHash('sha256')
    .update(text + rubricVersion)
    .digest('hex');
}
```

---

## Token Counting

**Decision**: Use `tiktoken` (OpenAI's official tokenizer)

**Rationale**:
- Official OpenAI tokenizer for accurate GPT token counting
- Supports all GPT models (GPT-4, GPT-4-turbo, GPT-3.5-turbo)
- Fast native implementation
- Essential for accurate budget enforcement

**Implementation Notes**:
- Install: `npm install tiktoken`
- Use encoding for GPT-4: `tiktoken.encoding_for_model("gpt-4")`
- Count tokens before API calls to enforce limits
- Track cumulative usage per crawl run
- Pause processing when limit reached, allow resume

---

## Supabase Integration

**Decision**: Use `@supabase/supabase-js` client library

**Rationale**:
- Official Supabase JavaScript client
- Built-in Row-Level Security (RLS) support
- Automatic connection pooling
- Support for pgvector extension for embeddings

**Implementation Notes**:
- Install: `npm install @supabase/supabase-js`
- Configure with `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Use RLS policies to enforce organization isolation
- Create service role client for admin operations (migrations, seeds)
- Regular client for user-facing operations with RLS enforcement

---

## Vector Embeddings

**Decision**: Use OpenAI `text-embedding-3-small` via `openai` npm package

**Rationale**:
- Cost-effective embedding model ($0.02 per 1M tokens)
- Good quality for semantic similarity
- Supabase pgvector extension supports OpenAI embeddings
- Simple integration via official OpenAI library

**Implementation Notes**:
- Install: `npm install openai`
- Generate embeddings for page content summaries
- Store in dedicated `embeddings` table with pgvector type
- Use for topic grouping and related content discovery
- Can defer to Phase 2/3 if not critical for MVP

---

## Deployment Considerations

**Platform**: Vercel (serverless functions) + Supabase

**Key Considerations**:
- Puppeteer requires `@sparticuz/chromium` for serverless (already in dependencies)
- Background jobs need separate worker process or external Redis-based queue
- Consider Vercel cron jobs or external worker for long-running crawls
- Environment variables: API keys, database credentials, JWT secret
- Cold start optimization: lazy-load Puppeteer, cache Supabase client

**Alternatives Explored**:
- Traditional VPS (DigitalOcean, AWS EC2) - More control but higher operational overhead
- Docker containers (Fly.io, Railway) - Good middle ground, consider if Vercel limits problematic

---

## Summary

All "NEEDS CLARIFICATION" items from Technical Context have been resolved:

1. **OpenAI API**: `openai` (official OpenAI SDK)
2. **PDF Processing**: `pdf-parse` (lightweight, zero dependencies)
3. **Contract Testing**: `supertest` + `jest-openapi` (Express/Jest standard)

Additional key decisions:
- Job queue: BullMQ with Redis
- Authentication: JWT + bcrypt
- URL normalization: Custom implementation with Node.js URL API
- Content hashing: SHA-256 via Node.js crypto
- Token counting: tiktoken (OpenAI's official tokenizer)
- Vector embeddings: OpenAI text-embedding-3-small (already using OpenAI, same SDK)

All chosen libraries are actively maintained, work with Node.js 18+, and integrate well with the existing Express + React stack.
