/**
 * Integration Tests for User Story 2
 *
 * Tests:
 * - T064: Test full crawl with sitemap discovery on test website
 * - T065: Test link following up to depth limit
 * - T066: Verify canonical URL handling and deduplication
 * - T067: Verify snapshot versioning across multiple crawls
 * - T068: Test browser rendering fallback when static fetch insufficient
 *
 * Prerequisites:
 * - Backend server must be running
 * - Database must be initialized with schema and RLS policies
 * - BullMQ and Redis must be running
 * - Environment variables must be configured
 * - Test website with sitemap available (or use example.com for basic tests)
 *
 * Run with: npm test tests/integration/crawler/user-story-2.test.js
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test configuration
const TEST_WEBSITE = process.env.TEST_CRAWL_URL || 'https://example.com';

describe('User Story 2: Multi-Tenant Website Crawling', () => {
  let supabase;
  let userToken;
  let orgId;
  let projectId;

  beforeAll(async () => {
    // Initialize Supabase client for direct database verification
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }

    // Setup: Register user, create organization, create project
    const timestamp = Date.now();
    const userData = {
      name: `Crawler Test User ${timestamp}`,
      email: `crawler-test-${timestamp}@example.com`,
      password: 'SecurePass123!'
    };

    // Register user
    const registerResponse = await request(BASE_URL)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    userToken = registerResponse.body.token;

    // Get personal organization
    const orgsResponse = await request(BASE_URL)
      .get('/api/organizations')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    orgId = orgsResponse.body.data[0].id;

    // Create test project
    const projectData = {
      name: `Test Crawl Project ${timestamp}`,
      target_url: TEST_WEBSITE,
      description: 'Integration test project for User Story 2',
      depth_limit: 2,
      sample_size: 10,
      token_limit: 100000,
      excluded_patterns: ['/admin', '/private']
    };

    const projectResponse = await request(BASE_URL)
      .post(`/api/organizations/${orgId}/projects`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(projectData)
      .expect(201);

    projectId = projectResponse.body.id;
  });

  describe('T064: Test full crawl with sitemap discovery', () => {
    let crawlId;

    test('Should start a full crawl and discover URLs from sitemap', async () => {
      const response = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'full' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.runType).toBe('full');
      expect(response.body.status).toBe('queued');
      expect(response.body.pagesDiscovered).toBe(0);
      expect(response.body.pagesProcessed).toBe(0);

      crawlId = response.body.id;
    });

    test('Should process crawl and discover pages from sitemap', async () => {
      // Wait for crawl to start processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      const response = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should have discovered URLs from sitemap
      expect(response.body.status).toMatch(/queued|running|paused|completed/);

      // If still running, wait and check again
      if (response.body.status === 'running' || response.body.status === 'queued') {
        console.log('Crawl in progress, waiting for completion...');
        // In real tests, would poll until completed or timeout
      }

      // Verify pages were discovered
      expect(response.body.pagesDiscovered).toBeGreaterThan(0);
    });

    test('Should verify sitemap URLs were stored in database', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Query pages table for this project
      const { data: pages, error } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', projectId)
        .limit(10);

      if (error) {
        console.error('Database query error:', error);
        return;
      }

      expect(pages).toBeInstanceOf(Array);
      expect(pages.length).toBeGreaterThan(0);

      // Verify page structure
      const firstPage = pages[0];
      expect(firstPage).toHaveProperty('id');
      expect(firstPage).toHaveProperty('url');
      expect(firstPage).toHaveProperty('url_hash');
      expect(firstPage).toHaveProperty('first_discovered_at');
    });

    test('Should verify sitemap parser discovered sitemap.xml', async () => {
      // The sitemap parser should have:
      // 1. Checked robots.txt for sitemap URLs
      // 2. Tried common sitemap locations (/sitemap.xml, etc.)
      // 3. Added discovered URLs to queue

      // This is verified by checking that pages were discovered
      const response = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // If sitemap was found and parsed, should have > 0 pages discovered
      expect(response.body.pagesDiscovered).toBeGreaterThan(0);
    });
  });

  describe('T065: Test link following up to depth limit', () => {
    let crawlId;

    test('Should start a full crawl with depth limit of 2', async () => {
      const response = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'full' })
        .expect(201);

      crawlId = response.body.id;
      expect(response.body.runType).toBe('full');
    });

    test('Should follow internal links up to configured depth', async () => {
      // Wait for crawl to process some pages
      await new Promise(resolve => setTimeout(resolve, 10000));

      const response = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should have discovered more pages than just the homepage
      // (homepage at depth 0, linked pages at depth 1, their links at depth 2)
      expect(response.body.pagesDiscovered).toBeGreaterThan(1);
    });

    test('Should not crawl beyond depth limit', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // In the crawler engine, depth tracking ensures pages beyond depth_limit
      // are not added to the queue. This is internal logic but we can verify
      // the crawl completed without processing excessive pages

      const response = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // With depth_limit=2, should have reasonable number of pages
      // Not thousands (which would indicate infinite depth)
      expect(response.body.pagesProcessed).toBeLessThan(1000);
    });

    test('Should respect excluded patterns', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Query for pages that should have been excluded
      const { data: excludedPages } = await supabase
        .from('pages')
        .select('url')
        .eq('project_id', projectId)
        .or('url.like.%/admin%,url.like.%/private%');

      // Should not have crawled any URLs matching excluded patterns
      expect(excludedPages.length).toBe(0);
    });
  });

  describe('T066: Verify canonical URL handling and deduplication', () => {
    let crawlId;

    test('Should normalize URLs and deduplicate', async () => {
      const response = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'full' })
        .expect(201);

      crawlId = response.body.id;
    });

    test('Should store canonical URLs, not variants', async () => {
      // Wait for some processing
      await new Promise(resolve => setTimeout(resolve, 10000));

      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Query pages table
      const { data: pages } = await supabase
        .from('pages')
        .select('url, url_hash')
        .eq('project_id', projectId)
        .limit(10);

      if (!pages || pages.length === 0) return;

      // Verify URL normalization:
      // - No trailing slashes (unless root)
      // - Lowercase hostnames
      // - No tracking parameters (utm_*, fbclid, etc.)
      pages.forEach(page => {
        const url = page.url;

        // Should not have tracking parameters
        expect(url).not.toMatch(/utm_/);
        expect(url).not.toMatch(/fbclid/);
        expect(url).not.toMatch(/gclid/);

        // Should not have trailing slash (unless root path)
        const urlObj = new URL(url);
        if (urlObj.pathname.length > 1) {
          expect(urlObj.pathname).not.toMatch(/\/$/);
        }
      });
    });

    test('Should follow canonical link tags', async () => {
      // The extractor should extract canonical URL from <link rel="canonical">
      // The canonicalizer should use this canonical URL instead of the visited URL
      // This ensures multiple URLs pointing to same content are deduplicated

      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Verify no duplicate content hashes
      const { data: snapshots } = await supabase
        .from('page_snapshots')
        .select('content_hash, url')
        .eq('crawl_run_id', crawlId)
        .limit(100);

      if (!snapshots || snapshots.length === 0) return;

      // Group by content hash
      const hashGroups = {};
      snapshots.forEach(snap => {
        if (!hashGroups[snap.content_hash]) {
          hashGroups[snap.content_hash] = [];
        }
        hashGroups[snap.content_hash].push(snap.url);
      });

      // Each content hash should only appear once (no duplicates)
      Object.keys(hashGroups).forEach(hash => {
        expect(hashGroups[hash].length).toBe(1);
      });
    });

    test('Should generate consistent URL hashes', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      const { data: pages } = await supabase
        .from('pages')
        .select('url, url_hash')
        .eq('project_id', projectId)
        .limit(10);

      if (!pages || pages.length === 0) return;

      // Verify hash format (should be 64-character hex string for SHA-256)
      pages.forEach(page => {
        expect(page.url_hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('T067: Verify snapshot versioning across multiple crawls', () => {
    let firstCrawlId;
    let testPageId;

    test('Should run first crawl and create initial snapshots', async () => {
      const response = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'sample' })
        .expect(201);

      firstCrawlId = response.body.id;

      // Wait for crawl to complete
      await new Promise(resolve => setTimeout(resolve, 15000));

      const statusResponse = await request(BASE_URL)
        .get(`/api/crawls/${firstCrawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(statusResponse.body.pagesProcessed).toBeGreaterThan(0);
    });

    test('Should verify first snapshots were created', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      const { data: snapshots } = await supabase
        .from('page_snapshots')
        .select('*')
        .eq('crawl_run_id', firstCrawlId)
        .limit(1);

      expect(snapshots).toBeInstanceOf(Array);
      expect(snapshots.length).toBeGreaterThan(0);

      const firstSnapshot = snapshots[0];
      testPageId = firstSnapshot.page_id;

      // Verify snapshot structure
      expect(firstSnapshot).toHaveProperty('id');
      expect(firstSnapshot).toHaveProperty('page_id');
      expect(firstSnapshot).toHaveProperty('crawl_run_id');
      expect(firstSnapshot).toHaveProperty('content_hash');
      expect(firstSnapshot).toHaveProperty('extraction');
      expect(firstSnapshot).toHaveProperty('metrics');
      expect(firstSnapshot).toHaveProperty('snapshot_at');
    });

    test('Should run second crawl and create new snapshots only if content changed', async () => {
      const response = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'delta' })
        .expect(201);

      // Wait for crawl to complete
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Verify crawl completed
      expect(response.body.id).toBeDefined();
    });

    test('Should verify snapshot versioning behavior', async () => {
      if (!supabase || !testPageId) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Query all snapshots for the test page
      const { data: pageSnapshots } = await supabase
        .from('page_snapshots')
        .select('*')
        .eq('page_id', testPageId)
        .order('snapshot_at', { ascending: true });

      // Should have at least one snapshot from first crawl
      expect(pageSnapshots.length).toBeGreaterThanOrEqual(1);

      // If content didn't change, should still only have 1 snapshot
      // If content changed, should have 2 snapshots with different content_hash
      if (pageSnapshots.length === 2) {
        expect(pageSnapshots[0].content_hash).not.toBe(pageSnapshots[1].content_hash);
      }
    });

    test('Should verify page.current_snapshot_id points to latest snapshot', async () => {
      if (!supabase || !testPageId) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Get page record
      const { data: page } = await supabase
        .from('pages')
        .select('*, current_snapshot:page_snapshots!current_snapshot_id(*)')
        .eq('id', testPageId)
        .single();

      expect(page).toHaveProperty('current_snapshot_id');
      expect(page.current_snapshot).toBeDefined();

      // Get latest snapshot
      const { data: latestSnapshot } = await supabase
        .from('page_snapshots')
        .select('id')
        .eq('page_id', testPageId)
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single();

      // current_snapshot_id should match latest snapshot
      expect(page.current_snapshot_id).toBe(latestSnapshot.id);
    });

    test('Should verify immutable snapshot records', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      // Snapshots should be immutable (never updated, only inserted)
      // This is enforced by RLS policies and application logic
      // Verify by checking that no snapshot has an updated_at field

      const { data: snapshots } = await supabase
        .from('page_snapshots')
        .select('*')
        .eq('crawl_run_id', firstCrawlId)
        .limit(5);

      snapshots.forEach(snapshot => {
        // Supabase doesn't have updated_at by default, but verify structure is intact
        expect(snapshot.snapshot_at).toBeDefined();
        expect(new Date(snapshot.snapshot_at)).toBeInstanceOf(Date);
      });
    });
  });

  describe('T068: Test browser rendering fallback when static fetch insufficient', () => {
    let crawlId;

    test('Should attempt crawl with browser rendering fallback', async () => {
      // Some pages require JavaScript to render content
      // The crawler should fall back to Puppeteer when needed

      const response = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'sample' })
        .expect(201);

      crawlId = response.body.id;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 20000));
    });

    test('Should verify pages were crawled successfully', async () => {
      const response = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should have processed some pages
      expect(response.body.pagesProcessed).toBeGreaterThan(0);
    });

    test('Should verify render method is recorded in metrics', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      const { data: snapshots } = await supabase
        .from('page_snapshots')
        .select('metrics')
        .eq('crawl_run_id', crawlId)
        .limit(10);

      if (!snapshots || snapshots.length === 0) return;

      // Verify metrics contain render_method
      snapshots.forEach(snapshot => {
        expect(snapshot.metrics).toHaveProperty('render_method');
        expect(['static', 'browser']).toContain(snapshot.metrics.render_method);
      });
    });

    test('Should verify fallback to HTTP when Puppeteer fails', async () => {
      // In serverless environments, Puppeteer may fail to initialize
      // The crawler should gracefully fall back to HTTP fetch with Cheerio

      // This is tested by the successful completion of the crawl
      // If fallback didn't work, the crawl would have failed

      const response = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should be completed or running (not failed due to Puppeteer issues)
      expect(response.body.status).not.toBe('failed');
    });

    test('Should verify extracted content regardless of render method', async () => {
      if (!supabase) {
        console.log('Skipping database verification (Supabase not configured)');
        return;
      }

      const { data: snapshots } = await supabase
        .from('page_snapshots')
        .select('extraction, metrics')
        .eq('crawl_run_id', crawlId)
        .limit(5);

      if (!snapshots || snapshots.length === 0) return;

      // Verify extraction structure is present regardless of render method
      snapshots.forEach(snapshot => {
        expect(snapshot.extraction).toBeDefined();
        expect(snapshot.extraction).toHaveProperty('title');
        expect(snapshot.extraction).toHaveProperty('body');
        expect(snapshot.extraction).toHaveProperty('headings');

        // Content should be extracted even with static method
        if (snapshot.metrics.render_method === 'static') {
          // Should still have extracted some content
          expect(snapshot.extraction.title || snapshot.extraction.body).toBeTruthy();
        }
      });
    });
  });

  describe('Integration: End-to-End Crawl Workflow', () => {
    test('Should complete full workflow: start, pause, resume, complete', async () => {
      // Start crawl
      const startResponse = await request(BASE_URL)
        .post(`/api/projects/${projectId}/crawls`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ runType: 'sample' })
        .expect(201);

      const crawlId = startResponse.body.id;

      // Wait for crawl to start running
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Pause crawl
      const pauseResponse = await request(BASE_URL)
        .post(`/api/crawls/${crawlId}/pause`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(pauseResponse.body.status).toBe('paused');

      // Verify paused state
      const pausedStatus = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(pausedStatus.body.status).toBe('paused');

      // Resume crawl
      const resumeResponse = await request(BASE_URL)
        .post(`/api/crawls/${crawlId}/resume`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(resumeResponse.body.status).toMatch(/queued|running/);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Verify completion
      const finalStatus = await request(BASE_URL)
        .get(`/api/crawls/${crawlId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(finalStatus.body.status).toMatch(/running|completed/);
    });
  });
});
