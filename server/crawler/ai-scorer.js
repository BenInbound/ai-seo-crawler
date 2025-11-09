/**
 * AI-Powered Scorer
 *
 * Intelligent page scoring using GPT-4 with rubric-based evaluation.
 * Generates 0-100 scores for each criterion with AI recommendations.
 *
 * Based on:
 * - FR-034: Page-type-aware scoring
 * - FR-035: 0-100 scale with type-specific rubrics
 * - FR-036: Deterministic scoring (same content = same score via caching)
 * - FR-053-057: AI recommendations requirements
 * - FR-058-059: Token optimization via summarization and caching
 */

const { generateCompletion, buildScoringSystemPrompt } = require('../services/ai/client');
const { prepareContentForScoring } = require('../services/ai/summarizer');
const { getCriteriaForPageType, getRubricVersion } = require('./rubrics');
const { generateCacheKey, calculateOverallScore } = require('../models/score');

/**
 * Score a page using AI with rubric-based evaluation
 *
 * @param {Object} snapshot - Page snapshot from database
 * @param {Object} options - Scoring options
 * @param {string} options.pageType - Page type (will auto-detect if not provided)
 * @param {boolean} options.useCache - Check cache before scoring (default true)
 * @returns {Promise<Object>} - Score result
 */
async function scorePage(snapshot, options = {}) {
  const {
    pageType: providedPageType = null,
    useCache = true
  } = options;

  // Determine page type
  const pageType = providedPageType || snapshot.extraction?.page_type || 'resource';

  // Get rubric criteria for this page type
  const rubricCriteria = await getCriteriaForPageType(pageType);
  const rubricVersion = await getRubricVersion();

  // Prepare content (with summarization if needed)
  const preparedContent = await prepareContentForScoring(snapshot, {
    tokenThreshold: 1000
  });

  // Generate cache key
  const contentHash = snapshot.content_hash;
  const cacheKey = generateCacheKey(contentHash, rubricVersion);

  // Check cache if enabled
  if (useCache) {
    // Cache lookup would happen at the caller level (scoring job processor)
    // This function focuses on scoring logic
  }

  // Build scoring prompt
  const scoringPrompt = buildScoringPrompt(
    preparedContent.content,
    pageType,
    rubricCriteria,
    rubricVersion
  );

  // Call AI for scoring
  const aiResponse = await generateCompletion({
    messages: [
      {
        role: 'system',
        content: buildScoringSystemPrompt(pageType, rubricVersion, rubricCriteria)
      },
      {
        role: 'user',
        content: scoringPrompt
      }
    ],
    model: 'gpt-4-turbo',
    maxTokens: 2000,
    temperature: 0.3, // Lower temp for more consistent scoring
    responseFormat: { type: 'json_object' }
  });

  // Parse AI response
  const scoringResult = JSON.parse(aiResponse.content);

  // Validate and normalize scores
  const criteriaScores = normalizeCriteriaScores(scoringResult.criteriaScores);
  const criteriaExplanations = scoringResult.criteriaExplanations || {};
  const aiRecommendations = scoringResult.recommendations || [];

  // Calculate overall score as simple average
  const overallScore = calculateOverallScore(criteriaScores);

  // Calculate total tokens used
  const totalTokensUsed =
    (preparedContent.tokensUsed || 0) + (aiResponse.usage?.totalTokens || 0);

  return {
    pageType,
    overallScore,
    criteriaScores,
    criteriaExplanations,
    aiRecommendations,
    aiCacheKey: cacheKey,
    aiTokensUsed: totalTokensUsed,
    rubricVersion,
    metadata: {
      contentPreparationMethod: preparedContent.method,
      tokensSaved: preparedContent.metadata?.reductionPercent || 0
    }
  };
}

/**
 * Build scoring prompt from prepared content
 *
 * @param {string} content - Prepared/summarized content
 * @param {string} pageType - Page type
 * @param {Array} rubricCriteria - Array of rubric criteria objects
 * @param {string} rubricVersion - Rubric version
 * @returns {string} - Scoring prompt
 */
function buildScoringPrompt(content, pageType, rubricCriteria, rubricVersion) {
  const criteriaList = rubricCriteria
    .map(criterion => {
      const emphasized = criterion.emphasized ? ' [EMPHASIZED]' : '';

      return `- ${criterion.name}${emphasized}: ${criterion.description}`;
    })
    .join('\n');

  return `Analyze and score this ${pageType} page for Answer Engine Optimization (AEO).

Criteria to Evaluate:
${criteriaList}

Page Content:
${content}

Provide your analysis as JSON with this structure:
{
  "criteriaScores": {
    "direct_answer": 75,
    "question_coverage": 80,
    ...
  },
  "criteriaExplanations": {
    "direct_answer": "Brief explanation of this score",
    ...
  },
  "recommendations": [
    {
      "category": "direct_answer",
      "text": "Human-sounding recommendation that references specific page content",
      "references": ["Specific element from page", "Another specific element"]
    }
  ]
}

Scoring Guidelines:
- Score each criterion 0-100
- 0-40: Poor (major improvements needed)
- 41-60: Fair (significant improvements recommended)
- 61-80: Good (minor improvements suggested)
- 81-100: Excellent (well optimized)
- Emphasize page-type-appropriate criteria
- Recommendations must be concise (2-4 sentences), human-sounding, and reference actual page content
- Avoid formulaic patterns like "Consider adding..." or "It would be beneficial to..."
- Be specific and actionable`;
}

/**
 * Normalize criteria scores to ensure they're all 0-100
 *
 * @param {Object} scores - Raw scores from AI
 * @returns {Object} - Normalized scores
 */
function normalizeCriteriaScores(scores) {
  const normalized = {};

  Object.entries(scores).forEach(([criterion, score]) => {
    // Ensure score is a number
    let numScore = typeof score === 'number' ? score : parseInt(score, 10);

    // Clamp to 0-100 range
    numScore = Math.max(0, Math.min(100, numScore));

    normalized[criterion] = numScore;
  });

  return normalized;
}

/**
 * Batch score multiple pages
 *
 * @param {Array} snapshots - Array of page snapshots
 * @param {Object} options - Scoring options
 * @returns {Promise<Array>} - Array of scoring results
 */
async function batchScorePages(snapshots, options = {}) {
  const results = [];

  for (const snapshot of snapshots) {
    try {
      const result = await scorePage(snapshot, options);
      results.push({
        snapshotId: snapshot.id,
        pageId: snapshot.page_id,
        success: true,
        ...result
      });
    } catch (error) {
      console.error(`Failed to score snapshot ${snapshot.id}:`, error.message);
      results.push({
        snapshotId: snapshot.id,
        pageId: snapshot.page_id,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Rescore a page without refetching (uses existing snapshot)
 *
 * @param {Object} snapshot - Existing page snapshot
 * @param {Object} options - Scoring options
 * @returns {Promise<Object>} - New score result
 */
async function rescorePage(snapshot, options = {}) {
  // Rescoring forces cache bypass to get new AI evaluation
  return scorePage(snapshot, {
    ...options,
    useCache: false
  });
}

/**
 * Quick score validation (check if score looks reasonable)
 *
 * @param {Object} scoreResult - Score result to validate
 * @returns {Object} - Validation result {valid, warnings}
 */
function validateScoreResult(scoreResult) {
  const warnings = [];

  // Check overall score is in range
  if (scoreResult.overallScore < 0 || scoreResult.overallScore > 100) {
    warnings.push('Overall score out of range');
  }

  // Check all criteria scores
  Object.entries(scoreResult.criteriaScores).forEach(([criterion, score]) => {
    if (score < 0 || score > 100) {
      warnings.push(`Criterion ${criterion} score out of range`);
    }
  });

  // Check recommendations reference content
  scoreResult.aiRecommendations.forEach((rec, idx) => {
    if (!rec.text || rec.text.length < 20) {
      warnings.push(`Recommendation ${idx} too short`);
    }

    if (!rec.references || rec.references.length === 0) {
      warnings.push(`Recommendation ${idx} missing references`);
    }
  });

  return {
    valid: warnings.length === 0,
    warnings
  };
}

module.exports = {
  scorePage,
  batchScorePages,
  rescorePage,
  buildScoringPrompt,
  normalizeCriteriaScores,
  validateScoreResult
};
