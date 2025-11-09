/**
 * Background Worker Process
 *
 * Starts BullMQ workers to process background jobs:
 * - Crawl jobs (website crawling and content extraction)
 * - Scoring jobs (page scoring and analysis)
 * - AI jobs (recommendations and embeddings)
 *
 * This should run as a separate process from the main Express server.
 */

require('dotenv').config();

// Database setup
const { supabaseAdmin } = require('./services/database/supabase');

// Import worker initializers
const { initializeCrawlWorker, closeCrawlWorker } = require('./services/jobs/processors/crawl');
const { initializeScoringWorker, closeScoringWorker } = require('./services/jobs/processors/score');

// Initialize all models with Supabase client
const UserModel = require('./models/user');
const OrganizationModel = require('./models/organization');
const OrganizationMemberModel = require('./models/organization-member');
const ProjectModel = require('./models/project');
const CrawlRunModel = require('./models/crawl-run');
const PageModel = require('./models/page');
const SnapshotModel = require('./models/snapshot');

UserModel.setSupabaseClient(supabaseAdmin);
OrganizationModel.setSupabaseClient(supabaseAdmin);
OrganizationMemberModel.setSupabaseClient(supabaseAdmin);
ProjectModel.setSupabaseClient(supabaseAdmin);
CrawlRunModel.setSupabaseClient(supabaseAdmin);
PageModel.setSupabaseClient(supabaseAdmin);
SnapshotModel.setSupabaseClient(supabaseAdmin);

console.log('='.repeat(60));
console.log('AEO Platform - Background Worker');
console.log('='.repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log('='.repeat(60));

// Initialize workers
let crawlWorker;
let scoringWorker;

async function startWorkers() {
  try {
    console.log('\n🚀 Starting background workers...\n');

    // Start crawl worker
    console.log('📡 Starting crawl worker...');
    crawlWorker = initializeCrawlWorker(supabaseAdmin);
    console.log('✅ Crawl worker started (concurrency: 2)');

    // Start scoring worker
    console.log('🎯 Starting scoring worker...');
    scoringWorker = initializeScoringWorker(supabaseAdmin);
    console.log('✅ Scoring worker started (concurrency: 3)');

    // TODO: Add more workers as they are implemented
    // - AI worker (User Story 4)

    console.log('\n✨ All workers started successfully!');
    console.log('📊 Workers are now processing jobs from the queue...\n');
    console.log('Press Ctrl+C to stop workers\n');
  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n\n🛑 Shutting down workers...');

  try {
    if (crawlWorker) {
      await closeCrawlWorker();
      console.log('✅ Crawl worker closed');
    }

    if (scoringWorker) {
      await closeScoringWorker();
      console.log('✅ Scoring worker closed');
    }

    console.log('👋 Workers shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  shutdown();
});

// Start workers
startWorkers();
