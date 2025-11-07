/**
 * Rubric Loader
 *
 * Loads and manages AEO scoring rubrics.
 * Supports loading from default rubric or processed PDF principles.
 *
 * Based on FR-051: Process PDFs into persistent scoring rules
 * Based on FR-034: Page-type-aware scoring
 */

const fs = require('fs').promises;
const path = require('path');

// Cache for loaded rubrics
let cachedRubric = null;
let rubricVersion = null;

/**
 * Load default rubric from data directory
 *
 * @returns {Promise<Object>} - Rubric object
 */
async function loadDefaultRubric() {
  const rubricPath = path.join(__dirname, '../../data/aeo-principles/default-rubric.json');

  try {
    const content = await fs.readFile(rubricPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load default rubric: ${error.message}`);
  }
}

/**
 * Load rubric from custom file path
 *
 * @param {string} filePath - Absolute path to rubric file
 * @returns {Promise<Object>} - Rubric object
 */
async function loadRubricFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load rubric from ${filePath}: ${error.message}`);
  }
}

/**
 * Get active rubric (with caching)
 *
 * @param {Object} options - Load options
 * @param {boolean} options.forceReload - Force reload from disk
 * @param {string} options.customPath - Load from custom path
 * @returns {Promise<Object>} - Rubric object
 */
async function getActiveRubric(options = {}) {
  const { forceReload = false, customPath = null } = options;

  // Return cached rubric if available and not forcing reload
  if (cachedRubric && !forceReload && !customPath) {
    return cachedRubric;
  }

  // Load rubric
  let rubric;

  if (customPath) {
    rubric = await loadRubricFromFile(customPath);
  } else {
    rubric = await loadDefaultRubric();
  }

  // Cache it
  if (!customPath) {
    cachedRubric = rubric;
    rubricVersion = rubric.version || '1.0';
  }

  return rubric;
}

/**
 * Get rubric version
 *
 * @returns {Promise<string>} - Rubric version
 */
async function getRubricVersion() {
  if (!cachedRubric) {
    await getActiveRubric();
  }

  return rubricVersion || '1.0';
}

/**
 * Extract criteria for a specific page type
 *
 * @param {string} pageType - Page type (homepage, product, solution, blog, resource, conversion)
 * @param {Object} rubric - Rubric object (optional, will load if not provided)
 * @returns {Promise<Array>} - Array of criteria with emphasis info
 */
async function getCriteriaForPageType(pageType, rubric = null) {
  if (!rubric) {
    rubric = await getActiveRubric();
  }

  // Get page type specific rubric info
  const pageTypeRubric = rubric.pageTypeRubrics?.[pageType] || {};
  const emphasizedSet = new Set(pageTypeRubric.emphasizedCriteria || []);

  // Build array of criteria with emphasis markers
  const criteriaArray = [];

  rubric.categories.forEach(category => {
    category.criteria.forEach(criterion => {
      criteriaArray.push({
        name: criterion.name,
        category: category.name,
        description: criterion.description,
        scoringGuidance: criterion.scoringGuidance,
        bestPractices: criterion.bestPractices || [],
        emphasized: emphasizedSet.has(criterion.name)
      });
    });
  });

  return criteriaArray;
}

/**
 * Get all criteria names
 *
 * @returns {Promise<Array<string>>} - Array of criterion names
 */
async function getAllCriteriaNames() {
  const rubric = await getActiveRubric();
  const names = [];

  rubric.categories.forEach(category => {
    category.criteria.forEach(criterion => {
      names.push(criterion.name);
    });
  });

  return names;
}

/**
 * Validate that a rubric has all required fields
 *
 * @param {Object} rubric - Rubric to validate
 * @returns {Object} - Validation result {valid, errors}
 */
function validateRubric(rubric) {
  const errors = [];

  if (!rubric.categories || !Array.isArray(rubric.categories)) {
    errors.push('Rubric must have categories array');
  }

  if (rubric.categories) {
    rubric.categories.forEach((category, idx) => {
      if (!category.name) {
        errors.push(`Category at index ${idx} missing name`);
      }

      if (!category.criteria || !Array.isArray(category.criteria)) {
        errors.push(`Category ${category.name || idx} missing criteria array`);
      }

      if (category.criteria) {
        category.criteria.forEach((criterion, cIdx) => {
          if (!criterion.name) {
            errors.push(`Criterion at category ${category.name}, index ${cIdx} missing name`);
          }

          if (!criterion.description) {
            errors.push(`Criterion ${criterion.name} missing description`);
          }

          if (!criterion.scoringGuidance) {
            errors.push(`Criterion ${criterion.name} missing scoringGuidance`);
          }
        });
      }
    });
  }

  if (!rubric.pageTypeRubrics) {
    errors.push('Rubric should have pageTypeRubrics for page-type-aware scoring');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Clear cached rubric (force reload next time)
 */
function clearCache() {
  cachedRubric = null;
  rubricVersion = null;
}

/**
 * Get rubric statistics
 *
 * @returns {Promise<Object>} - Statistics about the rubric
 */
async function getRubricStats() {
  const rubric = await getActiveRubric();

  const stats = {
    version: rubric.version,
    documentType: rubric.documentType,
    categoryCount: rubric.categories.length,
    totalCriteria: 0,
    criteriaByCategory: {},
    pageTypes: Object.keys(rubric.pageTypeRubrics || {})
  };

  rubric.categories.forEach(category => {
    stats.totalCriteria += category.criteria.length;
    stats.criteriaByCategory[category.name] = category.criteria.length;
  });

  return stats;
}

module.exports = {
  loadDefaultRubric,
  loadRubricFromFile,
  getActiveRubric,
  getRubricVersion,
  getCriteriaForPageType,
  getAllCriteriaNames,
  validateRubric,
  clearCache,
  getRubricStats
};
