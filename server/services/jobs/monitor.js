/**
 * Job Monitoring Utilities
 * Monitor and manage BullMQ job queues
 */

const { getQueue, QUEUE_NAMES } = require('./queue');

/**
 * Get queue statistics
 * @param {string} queueName - Queue name
 * @returns {Promise<object>} Queue statistics
 */
async function getQueueStats(queueName) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused()
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed
  };
}

/**
 * Get statistics for all queues
 * @returns {Promise<object>} All queue statistics
 */
async function getAllQueueStats() {
  const [crawlStats, scoringStats, aiStats] = await Promise.all([
    getQueueStats(QUEUE_NAMES.CRAWL),
    getQueueStats(QUEUE_NAMES.SCORING),
    getQueueStats(QUEUE_NAMES.AI)
  ]);

  return {
    crawl: crawlStats,
    scoring: scoringStats,
    ai: aiStats,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get active jobs in a queue
 * @param {string} queueName - Queue name
 * @param {number} start - Start index (default: 0)
 * @param {number} end - End index (default: 9)
 * @returns {Promise<Array>} Array of active jobs
 */
async function getActiveJobs(queueName, start = 0, end = 9) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobs = await queue.getActive(start, end);
  return jobs.map(formatJobInfo);
}

/**
 * Get failed jobs in a queue
 * @param {string} queueName - Queue name
 * @param {number} start - Start index (default: 0)
 * @param {number} end - End index (default: 9)
 * @returns {Promise<Array>} Array of failed jobs
 */
async function getFailedJobs(queueName, start = 0, end = 9) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobs = await queue.getFailed(start, end);
  return jobs.map(formatJobInfo);
}

/**
 * Get completed jobs in a queue
 * @param {string} queueName - Queue name
 * @param {number} start - Start index (default: 0)
 * @param {number} end - End index (default: 9)
 * @returns {Promise<Array>} Array of completed jobs
 */
async function getCompletedJobs(queueName, start = 0, end = 9) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobs = await queue.getCompleted(start, end);
  return jobs.map(formatJobInfo);
}

/**
 * Get waiting jobs in a queue
 * @param {string} queueName - Queue name
 * @param {number} start - Start index (default: 0)
 * @param {number} end - End index (default: 9)
 * @returns {Promise<Array>} Array of waiting jobs
 */
async function getWaitingJobs(queueName, start = 0, end = 9) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobs = await queue.getWaiting(start, end);
  return jobs.map(formatJobInfo);
}

/**
 * Get job by ID
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @returns {Promise<object|null>} Job information
 */
async function getJobInfo(queueName, jobId) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  return formatJobInfo(job);
}

/**
 * Format job information for API response
 * @param {object} job - BullMQ job instance
 * @returns {object} Formatted job info
 */
function formatJobInfo(job) {
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    timestamp: job.timestamp,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace ? job.stacktrace.slice(0, 3) : null, // Limit stack trace
    returnvalue: job.returnvalue
  };
}

/**
 * Retry a failed job
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
async function retryJob(queueName, jobId) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  await job.retry();
}

/**
 * Remove a job from queue
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
async function removeJob(queueName, jobId) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  await job.remove();
}

/**
 * Clean old jobs from queue
 * @param {string} queueName - Queue name
 * @param {number} grace - Grace period in milliseconds (default: 1 hour)
 * @param {string} status - Job status to clean ('completed' or 'failed')
 * @returns {Promise<number>} Number of jobs cleaned
 */
async function cleanOldJobs(queueName, grace = 3600000, status = 'completed') {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobs = await queue.clean(grace, status);
  return jobs.length;
}

/**
 * Get queue health status
 * @param {string} queueName - Queue name
 * @returns {Promise<object>} Health status
 */
async function getQueueHealth(queueName) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const stats = await getQueueStats(queueName);
  const isPaused = await queue.isPaused();

  // Calculate health metrics
  const failureRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
  const activeRate = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;

  let health = 'healthy';
  const issues = [];

  if (isPaused) {
    health = 'paused';
    issues.push('Queue is paused');
  } else if (failureRate > 50) {
    health = 'critical';
    issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
  } else if (failureRate > 20) {
    health = 'degraded';
    issues.push(`Elevated failure rate: ${failureRate.toFixed(2)}%`);
  }

  if (stats.waiting > 1000) {
    if (health === 'healthy') {
      health = 'degraded';
    }
    issues.push(`High number of waiting jobs: ${stats.waiting}`);
  }

  return {
    queueName,
    health,
    issues,
    stats: {
      failureRate: failureRate.toFixed(2) + '%',
      activeRate: activeRate.toFixed(2) + '%',
      ...stats
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Get overall system health
 * @returns {Promise<object>} System health status
 */
async function getSystemHealth() {
  const [crawlHealth, scoringHealth, aiHealth] = await Promise.all([
    getQueueHealth(QUEUE_NAMES.CRAWL),
    getQueueHealth(QUEUE_NAMES.SCORING),
    getQueueHealth(QUEUE_NAMES.AI)
  ]);

  const allHealthy = [crawlHealth, scoringHealth, aiHealth].every(
    h => h.health === 'healthy'
  );
  const anyCritical = [crawlHealth, scoringHealth, aiHealth].some(
    h => h.health === 'critical'
  );
  const anyDegraded = [crawlHealth, scoringHealth, aiHealth].some(
    h => h.health === 'degraded'
  );

  let overallHealth = 'healthy';
  if (anyCritical) {
    overallHealth = 'critical';
  } else if (anyDegraded) {
    overallHealth = 'degraded';
  }

  return {
    overallHealth,
    queues: {
      crawl: crawlHealth,
      scoring: scoringHealth,
      ai: aiHealth
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Monitor job progress
 * Set up event listeners for job progress updates
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @param {function} callback - Callback function for progress updates
 * @returns {Promise<void>}
 */
async function monitorJobProgress(queueName, jobId, callback) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Listen for progress events
  job.on('progress', (progress) => {
    callback({ jobId, progress, status: 'active' });
  });

  job.on('completed', (result) => {
    callback({ jobId, status: 'completed', result });
  });

  job.on('failed', (error) => {
    callback({ jobId, status: 'failed', error: error.message });
  });
}

/**
 * Pause all queues
 * @returns {Promise<void>}
 */
async function pauseAllQueues() {
  const { pauseQueue } = require('./queue');
  await Promise.all([
    pauseQueue(QUEUE_NAMES.CRAWL),
    pauseQueue(QUEUE_NAMES.SCORING),
    pauseQueue(QUEUE_NAMES.AI)
  ]);
}

/**
 * Resume all queues
 * @returns {Promise<void>}
 */
async function resumeAllQueues() {
  const { resumeQueue } = require('./queue');
  await Promise.all([
    resumeQueue(QUEUE_NAMES.CRAWL),
    resumeQueue(QUEUE_NAMES.SCORING),
    resumeQueue(QUEUE_NAMES.AI)
  ]);
}

module.exports = {
  getQueueStats,
  getAllQueueStats,
  getActiveJobs,
  getFailedJobs,
  getCompletedJobs,
  getWaitingJobs,
  getJobInfo,
  retryJob,
  removeJob,
  cleanOldJobs,
  getQueueHealth,
  getSystemHealth,
  monitorJobProgress,
  pauseAllQueues,
  resumeAllQueues
};
