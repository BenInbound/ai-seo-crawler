/**
 * Scoring Job Processor
 *
 * Background job processor for AI-powered page scoring.
 * Handles token budget enforcement, caching, and score persistence.
 *
 * Based on:
 * - FR-058-060: Token management and caching
 * - FR-036: Deterministic scoring via caching
 * - User Story 3: Intelligent page scoring
 */

const { scorePage, rescorePage } = require('../../../crawler/ai-scorer');
const PageScoreModel = require('../../../models/score');
const PageModel = require('../../../models/page');
const SnapshotModel = require('../../../models/snapshot');
const CrawlRunModel = require('../../../models/crawl-run');

/**
 * Process a scoring job
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.crawlRunId - Crawl run ID
 * @param {Array<string>} job.data.snapshotIds - Snapshot IDs to score
 * @param {number} job.data.tokenLimit - Max tokens for this job (optional)
 * @returns {Promise<Object>} - Job result
 */
async function processScoreJob(job) {
  const { crawlRunId, snapshotIds, tokenLimit = null } = job.data;

  console.log(
    `[Score Job] Starting scoring for crawl run ${crawlRunId}, ${snapshotIds.length} snapshots`
  );

  let totalTokensUsed = 0;
  let scoresCreated = 0;
  let cacheHits = 0;
  const errors = [];

  try {
    // Get crawl run info
    const crawlRun = await CrawlRunModel.getById(crawlRunId);

    if (!crawlRun) {
      throw new Error(`Crawl run ${crawlRunId} not found`);
    }

    // Update job progress
    await job.updateProgress({
      stage: 'scoring',
      processed: 0,
      total: snapshotIds.length,
      tokensUsed: 0
    });

    // Process each snapshot
    for (let i = 0; i < snapshotIds.length; i++) {
      const snapshotId = snapshotIds[i];

      try {
        // Check token limit
        if (tokenLimit && totalTokensUsed >= tokenLimit) {
          console.log(`[Score Job] Token limit reached (${totalTokensUsed}/${tokenLimit})`);
          break;
        }

        // Get snapshot
        const snapshot = await SnapshotModel.getById(snapshotId);

        if (!snapshot) {
          errors.push({ snapshotId, error: 'Snapshot not found' });
          continue;
        }

        // Check cache
        const cacheKey = snapshot.content_hash; // Simplified, should include rubric version
        const existingScore = await PageScoreModel.findByCacheKey(cacheKey);

        if (existingScore) {
          console.log(`[Score Job] Cache hit for snapshot ${snapshotId}`);

          // Reuse cached score by creating new score record with same values
          await PageScoreModel.create({
            page_id: snapshot.page_id,
            snapshot_id: snapshot.id,
            rubric_version: existingScore.rubric_version,
            page_type: existingScore.page_type,
            criteria_scores: existingScore.criteria_scores,
            criteria_explanations: existingScore.criteria_explanations,
            ai_recommendations: existingScore.ai_recommendations,
            ai_cache_key: cacheKey,
            ai_tokens_used: 0 // No tokens used due to cache
          });

          cacheHits++;
          scoresCreated++;
        } else {
          // Score the page
          const scoreResult = await scorePage(snapshot);

          // Save score to database
          const savedScore = await PageScoreModel.create({
            page_id: snapshot.page_id,
            snapshot_id: snapshot.id,
            rubric_version: scoreResult.rubricVersion,
            page_type: scoreResult.pageType,
            criteria_scores: scoreResult.criteriaScores,
            criteria_explanations: scoreResult.criteriaExplanations,
            ai_recommendations: scoreResult.aiRecommendations,
            ai_cache_key: scoreResult.aiCacheKey,
            ai_tokens_used: scoreResult.aiTokensUsed
          });

          // Update page current_score_id
          await PageModel.update(snapshot.page_id, {
            current_score_id: savedScore.id
          });

          totalTokensUsed += scoreResult.aiTokensUsed;
          scoresCreated++;

          console.log(
            `[Score Job] Scored snapshot ${snapshotId}: ${scoreResult.overallScore}/100`
          );
        }

        // Update progress
        await job.updateProgress({
          stage: 'scoring',
          processed: i + 1,
          total: snapshotIds.length,
          tokensUsed: totalTokensUsed
        });
      } catch (error) {
        console.error(`[Score Job] Error scoring snapshot ${snapshotId}:`, error.message);
        errors.push({ snapshotId, error: error.message });
      }
    }

    // Update crawl run with token usage
    await CrawlRunModel.update(crawlRunId, {
      token_usage: totalTokensUsed
    });

    const result = {
      crawlRunId,
      scoresCreated,
      cacheHits,
      totalTokensUsed,
      errors,
      cacheHitRate: snapshotIds.length > 0 ? (cacheHits / snapshotIds.length) * 100 : 0
    };

    console.log(
      `[Score Job] Completed: ${scoresCreated} scores, ${cacheHits} cache hits, ${totalTokensUsed} tokens`
    );

    return result;
  } catch (error) {
    console.error(`[Score Job] Fatal error:`, error);
    throw error;
  }
}

/**
 * Process a rescore job (single page)
 *
 * @param {Object} job - BullMQ job object
 * @param {string} job.data.pageId - Page ID to rescore
 * @param {boolean} job.data.useCachedSnapshot - Use existing snapshot (default true)
 * @returns {Promise<Object>} - Job result
 */
async function processRescoreJob(job) {
  const { pageId, useCachedSnapshot = true } = job.data;

  console.log(`[Rescore Job] Rescoring page ${pageId}`);

  try {
    // Get page
    const page = await PageModel.getById(pageId);

    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }

    // Get latest snapshot
    const snapshot = await SnapshotModel.getLatestByPage(pageId);

    if (!snapshot) {
      throw new Error(`No snapshot found for page ${pageId}`);
    }

    // Rescore (bypasses cache)
    const scoreResult = await rescorePage(snapshot);

    // Save new score
    const savedScore = await PageScoreModel.create({
      page_id: page.id,
      snapshot_id: snapshot.id,
      rubric_version: scoreResult.rubricVersion,
      page_type: scoreResult.pageType,
      criteria_scores: scoreResult.criteriaScores,
      criteria_explanations: scoreResult.criteriaExplanations,
      ai_recommendations: scoreResult.aiRecommendations,
      ai_cache_key: scoreResult.aiCacheKey,
      ai_tokens_used: scoreResult.aiTokensUsed
    });

    // Update page current_score_id
    await PageModel.update(page.id, {
      current_score_id: savedScore.id
    });

    console.log(`[Rescore Job] Completed: ${scoreResult.overallScore}/100`);

    return {
      pageId,
      scoreId: savedScore.id,
      overallScore: scoreResult.overallScore,
      tokensUsed: scoreResult.aiTokensUsed
    };
  } catch (error) {
    console.error(`[Rescore Job] Error:`, error);
    throw error;
  }
}

/**
 * Process batch rescore job (multiple pages)
 *
 * @param {Object} job - BullMQ job object
 * @param {Array<string>} job.data.pageIds - Page IDs to rescore
 * @param {number} job.data.tokenLimit - Max tokens (optional)
 * @returns {Promise<Object>} - Job result
 */
async function processBatchRescoreJob(job) {
  const { pageIds, tokenLimit = null } = job.data;

  console.log(`[Batch Rescore Job] Rescoring ${pageIds.length} pages`);

  let totalTokensUsed = 0;
  let scoresCreated = 0;
  const errors = [];

  try {
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i];

      try {
        // Check token limit
        if (tokenLimit && totalTokensUsed >= tokenLimit) {
          console.log(`[Batch Rescore] Token limit reached (${totalTokensUsed}/${tokenLimit})`);
          break;
        }

        // Rescore page
        const result = await processRescoreJob({
          data: { pageId, useCachedSnapshot: true }
        });

        totalTokensUsed += result.tokensUsed;
        scoresCreated++;

        // Update progress
        await job.updateProgress({
          processed: i + 1,
          total: pageIds.length,
          tokensUsed: totalTokensUsed
        });
      } catch (error) {
        console.error(`[Batch Rescore] Error rescoring page ${pageId}:`, error.message);
        errors.push({ pageId, error: error.message });
      }
    }

    const result = {
      scoresCreated,
      totalTokensUsed,
      errors
    };

    console.log(`[Batch Rescore Job] Completed: ${scoresCreated} scores, ${totalTokensUsed} tokens`);

    return result;
  } catch (error) {
    console.error(`[Batch Rescore Job] Fatal error:`, error);
    throw error;
  }
}

/**
 * Job processor router
 *
 * Routes different job types to appropriate handlers
 *
 * @param {Object} job - BullMQ job object
 * @returns {Promise<Object>} - Job result
 */
async function processJob(job) {
  const jobType = job.name || job.data.type;

  switch (jobType) {
    case 'score':
    case 'score-pages':
      return processScoreJob(job);

    case 'rescore':
    case 'rescore-page':
      return processRescoreJob(job);

    case 'batch-rescore':
      return processBatchRescoreJob(job);

    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

module.exports = {
  processJob,
  processScoreJob,
  processRescoreJob,
  processBatchRescoreJob
};
