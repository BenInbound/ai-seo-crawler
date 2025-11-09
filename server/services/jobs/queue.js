/**
 * BullMQ Job Queue Configuration
 * Handles background processing for crawls, scoring, and AI analysis
 */

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// Validate Redis connection
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required for job queue');
}

// Create Redis connection
const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Connection event handlers
redisConnection.on('connect', () => {
  console.log('Redis connected for job queue');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Queue configuration
const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000 // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
};

// Job types
const JOB_TYPES = {
  CRAWL: 'crawl',
  SCORE: 'score',
  ANALYZE: 'analyze',
  GENERATE_EMBEDDINGS: 'generate_embeddings',
  RESCORE: 'rescore',
  BATCH_RESCORE: 'batch_rescore'
};

// Queue names
const QUEUE_NAMES = {
  CRAWL: 'crawl-queue',
  SCORING: 'scoring-queue',
  AI: 'ai-queue'
};

// ============================================================================
// CREATE QUEUES
// ============================================================================

/**
 * Crawl Queue - For website crawling tasks
 */
const crawlQueue = new Queue(QUEUE_NAMES.CRAWL, {
  ...queueConfig,
  defaultJobOptions: {
    ...queueConfig.defaultJobOptions,
    priority: 1,
    timeout: 3600000 // 1 hour timeout for large crawls
  }
});

/**
 * Scoring Queue - For page scoring and analysis
 */
const scoringQueue = new Queue(QUEUE_NAMES.SCORING, {
  ...queueConfig,
  defaultJobOptions: {
    ...queueConfig.defaultJobOptions,
    priority: 2,
    timeout: 600000 // 10 minute timeout
  }
});

/**
 * AI Queue - For AI-powered tasks (recommendations, embeddings)
 */
const aiQueue = new Queue(QUEUE_NAMES.AI, {
  ...queueConfig,
  defaultJobOptions: {
    ...queueConfig.defaultJobOptions,
    priority: 3,
    timeout: 300000 // 5 minute timeout
  }
});

// ============================================================================
// JOB FUNCTIONS
// ============================================================================

/**
 * Add crawl job to queue
 * @param {object} data - Job data
 * @param {string} data.crawlRunId - Crawl run UUID
 * @param {string} data.projectId - Project UUID
 * @param {string} data.userId - User UUID who initiated crawl
 * @param {object} data.config - Crawl configuration
 * @returns {Promise<object>} Job instance
 */
async function addCrawlJob(data) {
  // Add timeout to prevent hanging when Redis is unavailable
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Queue operation timed out - Redis may be unavailable')), 5000);
  });

  try {
    const job = await Promise.race([
      crawlQueue.add(JOB_TYPES.CRAWL, data, {
        jobId: data.crawlRunId,
        priority: data.priority || 1
      }),
      timeoutPromise
    ]);
    return job;
  } catch (error) {
    console.warn('Failed to add crawl job to queue (continuing anyway):', error.message);
    // Return a mock job object so the crawler route can continue
    return { id: data.crawlRunId, state: 'failed', failedReason: error.message };
  }
}

/**
 * Add scoring job to queue
 * @param {object} data - Job data
 * @param {string} data.crawlRunId - Crawl run UUID
 * @param {Array<string>} data.snapshotIds - Array of snapshot UUIDs to score
 * @param {number} data.tokenLimit - Optional token limit for this scoring job
 * @param {boolean} data.isManualRescore - Whether this is a manual rescore (uses unique ID)
 * @returns {Promise<object>} Job instance
 */
async function addScoringJob(data) {
  // For manual rescores, use a unique job ID to avoid conflicts
  const jobId = data.isManualRescore
    ? `score-manual-${Date.now()}-${data.snapshotIds[0]}`
    : `score-${data.crawlRunId}`;

  return scoringQueue.add(JOB_TYPES.SCORE, data, {
    jobId,
    priority: data.priority || 2
  });
}

/**
 * Add AI analysis job to queue
 * @param {object} data - Job data
 * @param {string} data.pageId - Page UUID
 * @param {string} data.snapshotId - Snapshot UUID
 * @param {string} data.scoreId - Score UUID
 * @returns {Promise<object>} Job instance
 */
async function addAIAnalysisJob(data) {
  return aiQueue.add(JOB_TYPES.ANALYZE, data, {
    jobId: `analyze-${data.snapshotId}`,
    priority: data.priority || 3
  });
}

/**
 * Add embedding generation job
 * @param {object} data - Job data
 * @param {string} data.pageId - Page UUID
 * @param {string} data.snapshotId - Snapshot UUID
 * @returns {Promise<object>} Job instance
 */
async function addEmbeddingJob(data) {
  return aiQueue.add(JOB_TYPES.GENERATE_EMBEDDINGS, data, {
    jobId: `embed-${data.snapshotId}`,
    priority: 5 // Lower priority
  });
}

/**
 * Add batch rescore job
 * @param {object} data - Job data
 * @param {string} data.projectId - Project UUID
 * @param {Array} data.pageIds - Array of page UUIDs to rescore
 * @param {string} data.rubricVersion - New rubric version
 * @returns {Promise<object>} Job instance
 */
async function addBatchRescoreJob(data) {
  return scoringQueue.add(JOB_TYPES.BATCH_RESCORE, data, {
    jobId: `batch-rescore-${data.projectId}-${Date.now()}`,
    priority: 4
  });
}

/**
 * Pause a queue
 * @param {string} queueName - Queue name
 * @returns {Promise<void>}
 */
async function pauseQueue(queueName) {
  const queue = getQueue(queueName);
  if (queue) {
    await queue.pause();
  }
}

/**
 * Resume a queue
 * @param {string} queueName - Queue name
 * @returns {Promise<void>}
 */
async function resumeQueue(queueName) {
  const queue = getQueue(queueName);
  if (queue) {
    await queue.resume();
  }
}

/**
 * Get queue by name
 * @param {string} queueName - Queue name
 * @returns {Queue|null} Queue instance
 */
function getQueue(queueName) {
  const queues = {
    [QUEUE_NAMES.CRAWL]: crawlQueue,
    [QUEUE_NAMES.SCORING]: scoringQueue,
    [QUEUE_NAMES.AI]: aiQueue
  };
  return queues[queueName] || null;
}

/**
 * Get job by ID
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @returns {Promise<object|null>} Job instance
 */
async function getJob(queueName, jobId) {
  const queue = getQueue(queueName);
  if (!queue) {
    return null;
  }
  return queue.getJob(jobId);
}

/**
 * Clean completed jobs from queue
 * @param {string} queueName - Queue name
 * @param {number} grace - Grace period in milliseconds
 * @returns {Promise<void>}
 */
async function cleanQueue(queueName, grace = 3600000) {
  const queue = getQueue(queueName);
  if (queue) {
    await queue.clean(grace, 'completed');
    await queue.clean(grace * 24, 'failed'); // Keep failed jobs longer
  }
}

/**
 * Close all queue connections
 * @returns {Promise<void>}
 */
async function closeQueues() {
  await crawlQueue.close();
  await scoringQueue.close();
  await aiQueue.close();
  await redisConnection.quit();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Log queue events
crawlQueue.on('error', (err) => {
  console.error('Crawl queue error:', err);
});

scoringQueue.on('error', (err) => {
  console.error('Scoring queue error:', err);
});

aiQueue.on('error', (err) => {
  console.error('AI queue error:', err);
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Queues
  crawlQueue,
  scoringQueue,
  aiQueue,

  // Queue names
  QUEUE_NAMES,

  // Job types
  JOB_TYPES,

  // Job functions
  addCrawlJob,
  addScoringJob,
  addAIAnalysisJob,
  addEmbeddingJob,
  addBatchRescoreJob,

  // Queue management
  pauseQueue,
  resumeQueue,
  getQueue,
  getJob,
  cleanQueue,
  closeQueues,

  // Redis connection
  redisConnection
};
