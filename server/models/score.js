/**
 * PageScore Model
 *
 * Evaluation of a page snapshot against the AEO rubric.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - page_id (UUID, FK → pages.id, NOT NULL)
 * - snapshot_id (UUID, FK → page_snapshots.id, NOT NULL)
 * - rubric_version (TEXT, NOT NULL) - Version identifier for scoring rules
 * - page_type (TEXT, NOT NULL) - Type-specific rubric applied
 * - overall_score (INTEGER, NOT NULL) - 0-100 overall score
 * - criteria_scores (JSONB, NOT NULL) - Individual criterion scores (0-100)
 * - criteria_explanations (JSONB, NOT NULL) - Short explanation per criterion
 * - ai_recommendations (JSONB) - Array of recommendation objects
 * - ai_cache_key (TEXT) - Content hash + rubric version for caching
 * - ai_tokens_used (INTEGER) - Token count for this evaluation
 * - scored_at (TIMESTAMPTZ, DEFAULT NOW())
 *
 * Criteria scores fields:
 * - direct_answer, question_coverage, eeat_signals, outbound_links,
 *   schema_markup, internal_linking, readability, performance,
 *   indexing, accessibility
 *
 * AI recommendations structure:
 * - category (TEXT) - Which criterion this addresses
 * - text (TEXT) - Human-sounding recommendation
 * - references (ARRAY) - Specific content elements referenced
 *
 * RLS Policy:
 * - Users can SELECT scores for pages they have access to
 * - System (service role) can INSERT/UPDATE
 */

/**
 * Get Supabase client (will be imported from database service)
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Valid page types for scoring
 */
const VALID_PAGE_TYPES = ['homepage', 'product', 'solution', 'blog', 'resource', 'conversion'];

/**
 * Valid criteria names
 */
const VALID_CRITERIA = [
  'direct_answer',
  'question_coverage',
  'eeat_signals',
  'outbound_links',
  'schema_markup',
  'internal_linking',
  'readability',
  'performance',
  'indexing',
  'accessibility'
];

/**
 * Default criteria scores structure (all set to 0)
 */
const DEFAULT_CRITERIA_SCORES = VALID_CRITERIA.reduce((acc, criterion) => {
  acc[criterion] = 0;
  return acc;
}, {});

/**
 * Default criteria explanations structure
 */
const DEFAULT_CRITERIA_EXPLANATIONS = VALID_CRITERIA.reduce((acc, criterion) => {
  acc[criterion] = '';
  return acc;
}, {});

/**
 * Generate cache key for AI results
 *
 * @param {string} contentHash - Hash of page content
 * @param {string} rubricVersion - Rubric version identifier
 * @returns {string} - Cache key
 */
function generateCacheKey(contentHash, rubricVersion) {
  return `${contentHash}_${rubricVersion}`;
}

/**
 * Calculate overall score as simple average of criteria scores
 *
 * @param {Object} criteriaScores - Object with criterion scores
 * @returns {number} - Average score (0-100)
 */
function calculateOverallScore(criteriaScores) {
  const scores = Object.values(criteriaScores).filter(score => typeof score === 'number');

  if (scores.length === 0) {
    return 0;
  }

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

/**
 * Validate criteria scores
 *
 * @param {Object} criteriaScores - Criteria scores object to validate
 * @returns {Object} - Validation result { valid: boolean, errors: Array<string> }
 */
function validateCriteriaScores(criteriaScores) {
  const errors = [];

  if (typeof criteriaScores !== 'object' || criteriaScores === null) {
    errors.push('criteria_scores must be an object');
    return { valid: false, errors };
  }

  // Validate each criterion
  Object.entries(criteriaScores).forEach(([key, value]) => {
    if (!VALID_CRITERIA.includes(key)) {
      errors.push(`Invalid criterion: ${key}`);
    }

    if (typeof value !== 'number') {
      errors.push(`${key} must be a number`);
    } else if (value < 0 || value > 100) {
      errors.push(`${key} must be between 0 and 100`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate AI recommendations
 *
 * @param {Array} recommendations - Recommendations array to validate
 * @returns {Object} - Validation result { valid: boolean, errors: Array<string> }
 */
function validateRecommendations(recommendations) {
  const errors = [];

  if (!Array.isArray(recommendations)) {
    errors.push('ai_recommendations must be an array');
    return { valid: false, errors };
  }

  recommendations.forEach((rec, index) => {
    if (typeof rec !== 'object' || rec === null) {
      errors.push(`Recommendation at index ${index} must be an object`);
      return;
    }

    if (!rec.category || typeof rec.category !== 'string') {
      errors.push(`Recommendation at index ${index} must have a category (string)`);
    }

    if (!rec.text || typeof rec.text !== 'string') {
      errors.push(`Recommendation at index ${index} must have text (string)`);
    }

    if (rec.references && !Array.isArray(rec.references)) {
      errors.push(`Recommendation at index ${index} references must be an array`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new page score
 *
 * @param {Object} data - Score data
 * @param {string} data.page_id - Page UUID
 * @param {string} data.snapshot_id - Snapshot UUID
 * @param {string} data.rubric_version - Rubric version identifier
 * @param {string} data.page_type - Page type
 * @param {Object} data.criteria_scores - Individual criterion scores (0-100)
 * @param {Object} data.criteria_explanations - Short explanations per criterion
 * @param {Array} data.ai_recommendations - Optional AI recommendations
 * @param {string} data.ai_cache_key - Optional cache key
 * @param {number} data.ai_tokens_used - Optional token count
 * @returns {Promise<Object>} - Created score
 */
async function create(data) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validation
  if (!data.page_id) {
    throw new Error('page_id is required');
  }

  if (!data.snapshot_id) {
    throw new Error('snapshot_id is required');
  }

  if (!data.rubric_version) {
    throw new Error('rubric_version is required');
  }

  if (!data.page_type) {
    throw new Error('page_type is required');
  }

  if (!VALID_PAGE_TYPES.includes(data.page_type)) {
    throw new Error(`page_type must be one of: ${VALID_PAGE_TYPES.join(', ')}`);
  }

  // Merge with defaults and validate criteria scores
  const criteriaScores = { ...DEFAULT_CRITERIA_SCORES, ...(data.criteria_scores || {}) };
  const criteriaValidation = validateCriteriaScores(criteriaScores);

  if (!criteriaValidation.valid) {
    throw new Error(`Invalid criteria_scores: ${criteriaValidation.errors.join(', ')}`);
  }

  // Merge criteria explanations with defaults
  const criteriaExplanations = {
    ...DEFAULT_CRITERIA_EXPLANATIONS,
    ...(data.criteria_explanations || {})
  };

  // Validate recommendations if provided
  if (data.ai_recommendations) {
    const recommendationsValidation = validateRecommendations(data.ai_recommendations);

    if (!recommendationsValidation.valid) {
      throw new Error(
        `Invalid ai_recommendations: ${recommendationsValidation.errors.join(', ')}`
      );
    }
  }

  // Calculate overall score (simple average)
  const overallScore = calculateOverallScore(criteriaScores);

  const score = {
    page_id: data.page_id,
    snapshot_id: data.snapshot_id,
    rubric_version: data.rubric_version,
    page_type: data.page_type,
    overall_score: overallScore,
    criteria_scores: criteriaScores,
    criteria_explanations: criteriaExplanations,
    ai_recommendations: data.ai_recommendations || [],
    ai_cache_key: data.ai_cache_key || null,
    ai_tokens_used: data.ai_tokens_used || 0,
    scored_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from('page_scores')
    .insert([score])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return result;
}

/**
 * Get score by ID
 *
 * @param {string} id - Score UUID
 * @returns {Promise<Object|null>} - Score or null if not found
 */
async function getById(id) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.from('page_scores').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * List scores for a page
 *
 * @param {string} pageId - Page UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} - List of scores ordered by scored_at desc
 */
async function listByPage(pageId, options = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('page_scores')
    .select('*')
    .eq('page_id', pageId)
    .order('scored_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get latest score for a page
 *
 * @param {string} pageId - Page UUID
 * @returns {Promise<Object|null>} - Latest score or null
 */
async function getLatestByPage(pageId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('page_scores')
    .select('*')
    .eq('page_id', pageId)
    .order('scored_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Get score by snapshot ID
 *
 * @param {string} snapshotId - Snapshot UUID
 * @returns {Promise<Object|null>} - Score or null if not found
 */
async function getBySnapshot(snapshotId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('page_scores')
    .select('*')
    .eq('snapshot_id', snapshotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Find score by cache key (for AI result caching)
 *
 * @param {string} cacheKey - Cache key to lookup
 * @returns {Promise<Object|null>} - Score or null if not found
 */
async function findByCacheKey(cacheKey) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('page_scores')
    .select('*')
    .eq('ai_cache_key', cacheKey)
    .order('scored_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * List scores for a project with filtering
 *
 * @param {string} projectId - Project UUID
 * @param {Object} options - Query options
 * @param {number} options.minScore - Minimum overall score filter
 * @param {number} options.maxScore - Maximum overall score filter
 * @param {string} options.pageType - Filter by page type
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} - List of scores with page info
 */
async function listByProject(projectId, options = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Join with pages table to get project context
  let query = supabase
    .from('page_scores')
    .select(
      `
      *,
      pages!inner(id, url, page_type, project_id)
    `
    )
    .eq('pages.project_id', projectId)
    .order('scored_at', { ascending: false });

  if (options.minScore !== undefined) {
    query = query.gte('overall_score', options.minScore);
  }

  if (options.maxScore !== undefined) {
    query = query.lte('overall_score', options.maxScore);
  }

  if (options.pageType) {
    query = query.eq('page_type', options.pageType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get score statistics for a project
 *
 * @param {string} projectId - Project UUID
 * @returns {Promise<Object>} - Statistics (avg, min, max, count by page type)
 */
async function getStatsByProject(projectId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Get all latest scores for the project
  const scores = await listByProject(projectId, { limit: 10000 });

  // Calculate statistics
  const stats = {
    total: scores.length,
    average: 0,
    min: 100,
    max: 0,
    by_page_type: {}
  };

  if (scores.length === 0) {
    return stats;
  }

  let sum = 0;

  scores.forEach(score => {
    sum += score.overall_score;
    stats.min = Math.min(stats.min, score.overall_score);
    stats.max = Math.max(stats.max, score.overall_score);

    // Count by page type
    const pageType = score.page_type;
    if (!stats.by_page_type[pageType]) {
      stats.by_page_type[pageType] = {
        count: 0,
        average: 0,
        total: 0
      };
    }

    stats.by_page_type[pageType].count++;
    stats.by_page_type[pageType].total += score.overall_score;
  });

  stats.average = Math.round(sum / scores.length);

  // Calculate averages by page type
  Object.keys(stats.by_page_type).forEach(pageType => {
    const typeStats = stats.by_page_type[pageType];
    typeStats.average = Math.round(typeStats.total / typeStats.count);
    delete typeStats.total; // Remove intermediate calculation
  });

  return stats;
}

/**
 * Update score (for rescoring scenarios)
 *
 * @param {string} id - Score UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated score
 */
async function update(id, updates) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validate criteria scores if provided
  if (updates.criteria_scores) {
    const validation = validateCriteriaScores(updates.criteria_scores);

    if (!validation.valid) {
      throw new Error(`Invalid criteria_scores: ${validation.errors.join(', ')}`);
    }

    // Recalculate overall score
    updates.overall_score = calculateOverallScore(updates.criteria_scores);
  }

  // Validate recommendations if provided
  if (updates.ai_recommendations) {
    const validation = validateRecommendations(updates.ai_recommendations);

    if (!validation.valid) {
      throw new Error(`Invalid ai_recommendations: ${validation.errors.join(', ')}`);
    }
  }

  // Validate page type if provided
  if (updates.page_type && !VALID_PAGE_TYPES.includes(updates.page_type)) {
    throw new Error(`page_type must be one of: ${VALID_PAGE_TYPES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('page_scores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete score
 *
 * @param {string} id - Score UUID
 * @returns {Promise<void>}
 */
async function deleteById(id) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { error } = await supabase.from('page_scores').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

/**
 * Compare scores between two snapshots
 *
 * @param {string} snapshotId1 - First snapshot UUID (older)
 * @param {string} snapshotId2 - Second snapshot UUID (newer)
 * @returns {Promise<Object>} - Comparison result with deltas
 */
async function compareSnapshots(snapshotId1, snapshotId2) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const score1 = await getBySnapshot(snapshotId1);
  const score2 = await getBySnapshot(snapshotId2);

  if (!score1 || !score2) {
    throw new Error('One or both snapshots do not have scores');
  }

  const comparison = {
    overall_score_delta: score2.overall_score - score1.overall_score,
    criteria_deltas: {},
    improved_criteria: [],
    declined_criteria: []
  };

  // Calculate deltas for each criterion
  VALID_CRITERIA.forEach(criterion => {
    const delta = score2.criteria_scores[criterion] - score1.criteria_scores[criterion];
    comparison.criteria_deltas[criterion] = delta;

    if (delta > 0) {
      comparison.improved_criteria.push({ criterion, delta });
    } else if (delta < 0) {
      comparison.declined_criteria.push({ criterion, delta });
    }
  });

  // Sort by absolute delta
  comparison.improved_criteria.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  comparison.declined_criteria.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return comparison;
}

module.exports = {
  setSupabaseClient,
  VALID_PAGE_TYPES,
  VALID_CRITERIA,
  DEFAULT_CRITERIA_SCORES,
  DEFAULT_CRITERIA_EXPLANATIONS,
  generateCacheKey,
  calculateOverallScore,
  validateCriteriaScores,
  validateRecommendations,
  create,
  getById,
  listByPage,
  getLatestByPage,
  getBySnapshot,
  findByCacheKey,
  listByProject,
  getStatsByProject,
  update,
  deleteById,
  compareSnapshots
};
