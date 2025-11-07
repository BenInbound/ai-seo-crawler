/**
 * Crawl Job Processor
 *
 * Processes background crawl jobs for User Story 2.
 * Handles page discovery, content extraction, snapshot storage, and progress tracking.
 *
 * Features:
 * - Sitemap discovery and parsing
 * - Recursive link following up to depth limit
 * - URL deduplication with canonical URL resolution
 * - Content extraction with structured data
 * - Snapshot versioning (only create if content changed)
 * - Progress tracking and token usage monitoring
 * - Pause/resume support
 * - Error handling and retry logic
 */

const { Worker } = require('bullmq');
const { CrawlerEngine } = require('../../../crawler/engine');
const { parseAllSitemaps } = require('../../../crawler/sitemap-parser');
const {
  normalizeUrl,
  resolveCanonical,
  shouldCrawl,
  isSameDomain
} = require('../../../crawler/canonicalizer');
const { extractContent, calculateMetrics } = require('../../../crawler/extractor');
const { RobotsChecker } = require('../../../utils/robotsChecker');

// Models
const CrawlRunModel = require('../../../models/crawl-run');
const PageModel = require('../../../models/page');
const SnapshotModel = require('../../../models/snapshot');

// Queue configuration
const { redisConnection, QUEUE_NAMES } = require('../queue');

/**
 * Crawl Job Worker
 *
 * Processes crawl jobs from the crawl queue
 */
let crawlWorker;

/**
 * Initialize the crawl worker
 *
 * @param {Object} supabase - Supabase client
 * @returns {Worker} - Crawl worker instance
 */
function initializeCrawlWorker(supabase) {
  // Initialize models with Supabase client
  CrawlRunModel.setSupabaseClient(supabase);
  PageModel.setSupabaseClient(supabase);
  SnapshotModel.setSupabaseClient(supabase);

  // Create worker
  crawlWorker = new Worker(
    QUEUE_NAMES.CRAWL,
    async job => {
      console.log(`Processing crawl job ${job.id}:`, job.data);

      try {
        return await processCrawlJob(job);
      } catch (error) {
        console.error(`Crawl job ${job.id} failed:`, error);

        // Mark crawl run as failed
        await CrawlRunModel.fail(job.data.crawlRunId, error.message);

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 crawls concurrently
      limiter: {
        max: 5,
        duration: 1000 // Rate limit: 5 jobs per second max
      }
    }
  );

  // Worker event listeners
  crawlWorker.on('completed', (job, result) => {
    console.log(`Crawl job ${job.id} completed:`, {
      pagesDiscovered: result.pagesDiscovered,
      pagesProcessed: result.pagesProcessed,
      duration: result.duration
    });
  });

  crawlWorker.on('failed', (job, error) => {
    console.error(`Crawl job ${job.id} failed:`, error.message);
  });

  crawlWorker.on('error', error => {
    console.error('Crawl worker error:', error);
  });

  return crawlWorker;
}

/**
 * Process a crawl job
 *
 * @param {Object} job - BullMQ job instance
 * @param {string} job.data.crawlRunId - Crawl run UUID
 * @param {string} job.data.projectId - Project UUID
 * @param {string} job.data.userId - User UUID who initiated crawl
 * @param {Object} job.data.config - Crawl configuration
 * @returns {Promise<Object>} - Crawl results
 */
async function processCrawlJob(job) {
  const { crawlRunId, projectId, config } = job.data;
  const startTime = Date.now();

  // Mark crawl run as running
  await CrawlRunModel.update(crawlRunId, { status: 'running' });

  // Get project configuration
  const {
    base_url,
    user_agent = 'AEO-Platform-Bot/1.0',
    depth_limit = 3,
    sample_size = null,
    token_limit = null,
    excluded_patterns = [],
    run_type = 'full'
  } = config;

  console.log(`Starting ${run_type} crawl for project ${projectId}:`, {
    baseUrl: base_url,
    depthLimit: depth_limit,
    sampleSize: sample_size,
    tokenLimit: token_limit
  });

  // Initialize crawler engine with project configuration
  const crawler = new CrawlerEngine({
    projectId,
    config: {
      depth_limit,
      sample_size,
      token_limit,
      excluded_patterns
    },
    userAgent: user_agent
  });

  // Initialize robots checker
  const robotsChecker = new RobotsChecker(user_agent);

  // Check robots.txt
  const domain = new URL(base_url).hostname;
  const robotsInfo = await robotsChecker.checkRobots(domain, user_agent);

  if (!robotsInfo.canCrawl && !robotsInfo.canCrawlAsBrowser) {
    throw new Error(`Crawling blocked by robots.txt for ${domain}`);
  }

  // Use recommended user agent if needed
  const effectiveUserAgent = robotsInfo.canCrawl ? user_agent : robotsInfo.bestUserAgent;
  console.log(`Using user agent: ${effectiveUserAgent.substring(0, 50)}...`);

  // Respect crawl delay
  const crawlDelay = Math.max(robotsInfo.crawlDelay * 1000, 2000);

  // URL queue and tracking
  const urlQueue = [];
  const processedUrls = new Set();
  const urlDepth = new Map(); // Track depth of each URL
  let pagesDiscovered = 0;
  let pagesProcessed = 0;
  let tokenUsage = 0;

  // Phase 1: URL Discovery
  console.log('Phase 1: Discovering URLs...');

  if (run_type === 'full' || run_type === 'sitemap_only' || run_type === 'delta') {
    // Discover and parse sitemaps
    try {
      const sitemapUrls = await parseAllSitemaps(base_url, effectiveUserAgent);
      console.log(`Found ${sitemapUrls.length} URLs in sitemaps`);

      // Add sitemap URLs to queue
      for (const sitemapUrl of sitemapUrls) {
        if (shouldCrawl(sitemapUrl.url, [], excluded_patterns)) {
          const normalized = normalizeUrl(sitemapUrl.url);
          if (!processedUrls.has(normalized)) {
            urlQueue.push({ url: normalized, depth: 0, priority: sitemapUrl.priority || 0.5 });
            urlDepth.set(normalized, 0);
          }
        }
      }
    } catch (error) {
      console.warn('Sitemap parsing failed, will crawl from base URL:', error.message);
    }
  }

  // Add base URL if not already in queue
  const normalizedBase = normalizeUrl(base_url);
  if (!urlDepth.has(normalizedBase)) {
    urlQueue.unshift({ url: normalizedBase, depth: 0, priority: 1.0 });
    urlDepth.set(normalizedBase, 0);
  }

  // Sort queue by priority (higher priority first)
  urlQueue.sort((a, b) => b.priority - a.priority);

  pagesDiscovered = urlQueue.length;
  await CrawlRunModel.incrementCounts(crawlRunId, { pages_discovered: pagesDiscovered });

  console.log(`Discovered ${pagesDiscovered} URLs to crawl`);

  // Phase 2: Page Crawling and Extraction
  console.log('Phase 2: Crawling and extracting content...');

  // Initialize browser
  await crawler.initBrowser();

  try {
    while (urlQueue.length > 0) {
      // Check for pause signal
      const crawlRun = await CrawlRunModel.getById(crawlRunId);
      if (crawlRun.status === 'paused') {
        console.log(`Crawl ${crawlRunId} paused. Saving progress...`);
        break;
      }

      // Check token limit
      if (token_limit && tokenUsage >= token_limit) {
        console.log(`Token limit (${token_limit}) reached. Stopping crawl.`);
        await CrawlRunModel.update(crawlRunId, { status: 'completed' });
        break;
      }

      // Check sample size limit
      if (sample_size && pagesProcessed >= sample_size) {
        console.log(`Sample size (${sample_size}) reached. Stopping crawl.`);
        await CrawlRunModel.update(crawlRunId, { status: 'completed' });
        break;
      }

      // Get next URL
      const current = urlQueue.shift();
      const { url, depth } = current;

      // Skip if already processed
      if (processedUrls.has(url)) {
        continue;
      }

      // Mark as processed
      processedUrls.add(url);

      console.log(`Crawling [depth ${depth}]: ${url}`);

      // Report progress every 10 pages
      if (pagesProcessed % 10 === 0) {
        await job.updateProgress({
          pagesDiscovered,
          pagesProcessed,
          tokenUsage,
          currentUrl: url
        });
      }

      try {
        // Crawl page (use fallback if browser not available)
        const pageData = crawler.browser
          ? await crawler.crawlPage(url, crawlDelay)
          : await crawler.crawlPageHTTP(url);

        // Extract structured content
        const extraction = extractContent(pageData.html, url);

        // Calculate metrics
        const metrics = calculateMetrics(
          pageData.html,
          extraction,
          pageData.loadTime,
          pageData.fallbackMode ? 'static' : 'browser'
        );

        // Resolve canonical URL
        const canonicalUrl = resolveCanonical(url, pageData.html);

        // Upsert page record (deduplication via URL hash)
        const page = await PageModel.upsert({
          project_id: projectId,
          url: canonicalUrl,
          page_type: null, // Will be set by page-type detection in scoring phase
          last_crawl_run_id: crawlRunId
        });

        // Check if content changed (via content hash)
        const cleanedText = extraction.body || '';
        const contentChanged = await SnapshotModel.hasContentChanged(
          page.id,
          SnapshotModel.generateContentHash(cleanedText)
        );

        // Create snapshot only if content changed
        if (contentChanged || run_type === 'full') {
          const snapshot = await SnapshotModel.create({
            page_id: page.id,
            crawl_run_id: crawlRunId,
            url: canonicalUrl,
            status_code: pageData.statusCode,
            raw_html: pageData.html,
            cleaned_text: cleanedText,
            extraction,
            metrics
          });

          console.log(`Created snapshot ${snapshot.id} for page ${page.id}`);

          // Update page with current snapshot
          await PageModel.update(page.id, { current_snapshot_id: snapshot.id });
        } else {
          console.log(`Content unchanged for ${url}, skipping snapshot`);
        }

        pagesProcessed++;

        // Phase 3: Link Discovery (if within depth limit)
        let discoveredLinks = 0;
        if (run_type === 'full' && depth < depth_limit) {
          const internalLinks = extraction.internal_links || [];

          for (const link of internalLinks) {
            const linkUrl = link.url;

            // Validate same domain
            if (!isSameDomain(linkUrl, base_url)) {
              continue;
            }

            // Apply exclusion patterns
            if (!shouldCrawl(linkUrl, [], excluded_patterns)) {
              continue;
            }

            // Normalize
            const normalizedLink = normalizeUrl(linkUrl);

            // Skip if already discovered or processed
            if (urlDepth.has(normalizedLink) || processedUrls.has(normalizedLink)) {
              continue;
            }

            // Add to queue with increased depth
            urlQueue.push({ url: normalizedLink, depth: depth + 1, priority: 0.3 });
            urlDepth.set(normalizedLink, depth + 1);
            pagesDiscovered++;
            discoveredLinks++;

            console.log(`Discovered new link [depth ${depth + 1}]: ${normalizedLink}`);
          }
        }

        // Update progress
        await CrawlRunModel.incrementCounts(crawlRunId, {
          pages_processed: 1,
          pages_discovered: discoveredLinks
        });
      } catch (error) {
        console.error(`Failed to crawl ${url}:`, error.message);
        // Continue with next URL
      }

      // Respect crawl delay
      await sleep(crawlDelay);
    }
  } finally {
    // Always close browser
    await crawler.closeBrowser();
  }

  // Mark crawl as completed
  const duration = Date.now() - startTime;
  const finalStatus = await CrawlRunModel.getById(crawlRunId);

  if (finalStatus.status === 'running') {
    await CrawlRunModel.complete(crawlRunId);
  }

  console.log(`Crawl ${crawlRunId} finished:`, {
    pagesDiscovered,
    pagesProcessed,
    tokenUsage,
    duration: `${(duration / 1000).toFixed(1)}s`
  });

  return {
    crawlRunId,
    projectId,
    pagesDiscovered,
    pagesProcessed,
    tokenUsage,
    duration,
    status: finalStatus.status
  };
}

/**
 * Sleep utility
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Close the crawl worker
 *
 * @returns {Promise<void>}
 */
async function closeCrawlWorker() {
  if (crawlWorker) {
    await crawlWorker.close();
  }
}

module.exports = {
  initializeCrawlWorker,
  processCrawlJob,
  closeCrawlWorker
};
