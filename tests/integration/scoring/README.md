# User Story 3 Integration Tests

## Overview

This directory contains integration tests for **User Story 3: Intelligent Page Scoring**. These tests validate the core scoring functionality including page-type detection, rubric application, score determinism, and overall score calculation.

## Test Coverage

### T085: Page-Type Detection Accuracy
Tests the `ContentAnalyzer.detectPageType()` method with diverse sample pages:
- Homepage detection (root URL)
- Blog post detection (URL patterns + content indicators)
- Product page detection (schema markup, pricing, cart buttons)
- Solution page detection (features, benefits)
- Resource page detection (downloads, whitepapers)
- Conversion page detection (forms, CTAs)
- Edge cases and fallback behavior

### T086: Type-Specific Rubrics
Validates that rubrics are correctly applied based on page type:
- Rubric loading and caching
- Page-type-specific criteria retrieval
- Emphasis markers for different page types
- Verification that blog emphasizes content quality
- Verification that products emphasize schema markup
- Default criteria for unknown page types

### T087: Score Determinism
Ensures scoring is consistent and cacheable:
- Identical content produces identical scores
- Content hash-based caching works correctly
- Different content produces different scores
- Better content scores higher than poor content
- Rubric stability across reloads

### T088: Overall Score Calculation
Verifies the simple averaging algorithm:
- Overall score = simple average of all criteria scores
- Handles varying numbers of criteria
- Rounds to nearest integer
- No weighted averaging or bias
- Edge cases (0, 100, mixed scores)

## Prerequisites

Before running these tests, ensure:

1. **Backend server is running**:
   ```bash
   npm run dev
   ```

2. **Database is initialized**:
   - Supabase must be configured
   - Schema and RLS policies applied
   - Tables: `users`, `organizations`, `org_members`, `projects`, `pages`, `page_scores`

3. **Background job processing**:
   ```bash
   npm run queue:dev
   ```
   - BullMQ and Redis must be running

4. **Environment variables**:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   OPENAI_API_KEY=your_openai_key
   JWT_SECRET=your_jwt_secret
   API_BASE_URL=http://localhost:3001
   ```

5. **Dependencies installed**:
   ```bash
   npm install
   ```

## Running the Tests

### Run all User Story 3 tests:
```bash
npm test tests/integration/scoring/user-story-3.test.js
```

### Run specific test suites:
```bash
# Page-type detection only
npm test tests/integration/scoring/user-story-3.test.js -- -t "T085"

# Rubric application only
npm test tests/integration/scoring/user-story-3.test.js -- -t "T086"

# Score determinism only
npm test tests/integration/scoring/user-story-3.test.js -- -t "T087"

# Overall score calculation only
npm test tests/integration/scoring/user-story-3.test.js -- -t "T088"
```

### Run with verbose output:
```bash
npm test tests/integration/scoring/user-story-3.test.js -- --verbose
```

## Test Structure

Each test suite follows this pattern:

1. **Setup**: Creates test user, organization, and project
2. **Test Execution**: Runs specific validation tests
3. **Assertions**: Verifies expected behavior
4. **Cleanup**: (Handled automatically by test teardown)

## Important Notes

### AI-Powered Tests (T087)
Tests that call `scorePage()` require:
- Valid `OPENAI_API_KEY` environment variable
- Sufficient OpenAI API credits
- These tests will be skipped if API key is not configured

Tests will output:
```
Skipping AI scoring test (OPENAI_API_KEY not configured)
```

### Database Tests (T087, T088)
Tests that query the database directly require:
- Valid Supabase configuration
- Service role key for bypassing RLS
- These tests will be skipped if Supabase is not configured

Tests will output:
```
Skipping database verification (Supabase not configured)
```

### Test Data
Tests create temporary:
- User accounts (email: `scoring-test-{timestamp}@example.com`)
- Organizations (auto-created with user registration)
- Projects (name: `Test Scoring Project {timestamp}`)

These can be cleaned up manually if needed.

## Troubleshooting

### Tests fail with "Cannot find module"
Ensure you're running from the repository root:
```bash
cd /path/to/ai-seo-crawler
npm test tests/integration/scoring/user-story-3.test.js
```

### Tests timeout
- Increase Jest timeout in `package.json` or test file
- Check that backend server is responding
- Verify Redis and BullMQ are running

### "Unauthorized" errors
- Verify JWT_SECRET matches between test and server
- Check that user registration is working
- Ensure auth endpoints are accessible

### Database connection errors
- Verify SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY permissions
- Ensure RLS policies allow service role access

## Success Criteria

All tests should pass with:
- ✓ Page-type detection: 100% accuracy on test samples
- ✓ Rubric application: Correct criteria emphasis per page type
- ✓ Score determinism: Identical content = identical score
- ✓ Overall score: Simple average calculation verified

## Next Steps

After T085-T088 pass:
1. Proceed to **User Story 4** (AI-Powered Recommendations)
2. Run end-to-end scoring workflow with real crawls
3. Validate scoring performance at scale (1000+ pages)
4. Monitor token usage and caching effectiveness
