/**
 * PDF Processor for AEO Guides
 *
 * One-time processor to extract and distill AEO principles from PDF guides.
 * Based on research.md: Uses pdf-parse for lightweight text extraction.
 *
 * Purpose:
 * - Process AEO principle PDFs during system initialization
 * - Extract scoring criteria and best practices
 * - Store distilled rules in database or config for scoring engine
 *
 * Usage:
 * - Run once during deployment or on-demand via admin endpoint
 * - PDFs should be placed in a known location (e.g., server/data/aeo-guides/)
 * - Output can be stored in database, config file, or returned for manual review
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const { generateCompletion } = require('./client');

/**
 * Extract text from PDF file
 *
 * @param {string} pdfPath - Absolute path to PDF file
 * @returns {Promise<Object>} - Extracted data {text, pages, info}
 */
async function extractTextFromPdf(pdfPath) {
  try {
    // Read PDF file as buffer
    const dataBuffer = await fs.readFile(pdfPath);

    // Parse PDF
    const data = await pdfParse(dataBuffer);

    return {
      text: data.text,
      pages: data.numpages,
      info: data.info,
      metadata: data.metadata
    };
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Distill AEO principles from extracted text using AI
 *
 * @param {string} pdfText - Raw text extracted from PDF
 * @param {Object} options - Processing options
 * @param {string} options.documentType - Type of document (e.g., 'google-aeo-guide', 'scoring-rubric')
 * @returns {Promise<Object>} - Distilled principles
 */
async function distillPrinciples(pdfText, options = {}) {
  const { documentType = 'aeo-guide' } = options;

  // Construct prompt for AI to distill principles
  const systemPrompt = `You are an expert at analyzing Answer Engine Optimization (AEO) documentation and extracting structured scoring criteria.

Your task:
1. Read the provided AEO guide text
2. Extract key scoring criteria and best practices
3. Organize criteria into categories (content quality, E-A-T signals, technical SEO, structured data, etc.)
4. For each criterion, provide:
   - Name (short identifier)
   - Description (what to look for)
   - Scoring guidance (how to evaluate 0-100)
   - Best practices (recommendations)

Return the result as valid JSON with this structure:
{
  "documentType": "${documentType}",
  "categories": [
    {
      "name": "Content Quality",
      "criteria": [
        {
          "name": "direct_answer",
          "description": "Page provides clear, direct answer in opening paragraph",
          "scoringGuidance": "0-40: No clear answer. 41-60: Answer present but buried. 61-80: Clear answer near top. 81-100: Immediate, comprehensive answer.",
          "bestPractices": ["Place answer in first 2-3 sentences", "Use clear, concise language", "Match search intent"]
        }
      ]
    }
  ],
  "version": "1.0"
}`;

  const userPrompt = `Extract and distill AEO scoring criteria from this document:

${pdfText.substring(0, 15000)}`; // Limit to ~15k chars to stay within token limits

  try {
    const response = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-4-turbo',
      maxTokens: 3000,
      temperature: 0.3, // Lower temperature for more consistent extraction
      responseFormat: { type: 'json_object' }
    });

    // Parse JSON response
    const principles = JSON.parse(response.content);

    return {
      principles,
      usage: response.usage,
      processingDate: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to distill principles: ${error.message}`);
  }
}

/**
 * Process a single AEO guide PDF
 *
 * @param {string} pdfPath - Path to PDF file
 * @param {Object} options - Processing options
 * @param {string} options.documentType - Type of document
 * @param {boolean} options.saveToFile - Whether to save output to JSON file
 * @param {string} options.outputDir - Directory to save output (if saveToFile is true)
 * @returns {Promise<Object>} - Processing result
 */
async function processAeoGuide(pdfPath, options = {}) {
  const {
    documentType = 'aeo-guide',
    saveToFile = false,
    outputDir = path.join(__dirname, '../../data/aeo-principles')
  } = options;

  console.log(`[PDF Processor] Starting processing of: ${pdfPath}`);

  // Step 1: Extract text from PDF
  console.log('[PDF Processor] Extracting text from PDF...');
  const extraction = await extractTextFromPdf(pdfPath);

  console.log(
    `[PDF Processor] Extracted ${extraction.pages} pages, ${extraction.text.length} characters`
  );

  // Step 2: Distill principles using AI
  console.log('[PDF Processor] Distilling principles with AI...');
  const distillation = await distillPrinciples(extraction.text, { documentType });

  console.log(
    `[PDF Processor] Distilled ${distillation.principles.categories?.length || 0} categories`
  );

  // Step 3: Save to file if requested
  if (saveToFile) {
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(
      outputDir,
      `${documentType}-${Date.now()}.json`
    );

    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          source: pdfPath,
          extraction: {
            pages: extraction.pages,
            textLength: extraction.text.length
          },
          distillation: distillation.principles,
          aiUsage: distillation.usage,
          processedAt: distillation.processingDate
        },
        null,
        2
      )
    );

    console.log(`[PDF Processor] Saved distilled principles to: ${outputPath}`);
  }

  return {
    source: pdfPath,
    extraction: {
      pages: extraction.pages,
      textLength: extraction.text.length,
      info: extraction.info
    },
    principles: distillation.principles,
    aiUsage: distillation.usage,
    processedAt: distillation.processingDate
  };
}

/**
 * Process multiple AEO guide PDFs
 *
 * @param {Array<string>} pdfPaths - Array of PDF file paths
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Array of processing results
 */
async function processMultipleGuides(pdfPaths, options = {}) {
  const results = [];

  for (const pdfPath of pdfPaths) {
    try {
      const result = await processAeoGuide(pdfPath, options);
      results.push(result);
    } catch (error) {
      console.error(`[PDF Processor] Failed to process ${pdfPath}:`, error.message);
      results.push({
        source: pdfPath,
        error: error.message,
        processedAt: new Date().toISOString()
      });
    }
  }

  return results;
}

/**
 * Load processed principles from JSON file
 *
 * @param {string} filePath - Path to processed principles JSON file
 * @returns {Promise<Object>} - Loaded principles
 */
async function loadPrinciplesFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load principles from file: ${error.message}`);
  }
}

/**
 * Validate principles structure
 *
 * @param {Object} principles - Principles object to validate
 * @returns {Object} - Validation result {valid, errors}
 */
function validatePrinciples(principles) {
  const errors = [];

  if (!principles.categories || !Array.isArray(principles.categories)) {
    errors.push('principles.categories must be an array');
  }

  if (principles.categories) {
    principles.categories.forEach((category, idx) => {
      if (!category.name) {
        errors.push(`Category at index ${idx} missing name`);
      }

      if (!category.criteria || !Array.isArray(category.criteria)) {
        errors.push(`Category at index ${idx} missing criteria array`);
      }

      if (category.criteria) {
        category.criteria.forEach((criterion, cIdx) => {
          if (!criterion.name) {
            errors.push(`Criterion at category ${idx}, index ${cIdx} missing name`);
          }

          if (!criterion.description) {
            errors.push(`Criterion at category ${idx}, index ${cIdx} missing description`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Merge multiple principle sets
 *
 * Combines principles from multiple sources, removing duplicates
 *
 * @param {Array<Object>} principleSets - Array of principle objects
 * @returns {Object} - Merged principles
 */
function mergePrinciples(principleSets) {
  const merged = {
    documentType: 'merged',
    categories: [],
    version: '1.0',
    sources: []
  };

  const categoryMap = new Map();

  principleSets.forEach(set => {
    merged.sources.push(set.documentType || 'unknown');

    if (set.principles) {
      const principles = set.principles;

      if (principles.categories) {
        principles.categories.forEach(category => {
          if (!categoryMap.has(category.name)) {
            categoryMap.set(category.name, {
              name: category.name,
              criteria: []
            });
          }

          const existingCategory = categoryMap.get(category.name);

          // Add unique criteria
          category.criteria.forEach(criterion => {
            const exists = existingCategory.criteria.some(c => c.name === criterion.name);

            if (!exists) {
              existingCategory.criteria.push(criterion);
            }
          });
        });
      }
    }
  });

  merged.categories = Array.from(categoryMap.values());

  return merged;
}

module.exports = {
  extractTextFromPdf,
  distillPrinciples,
  processAeoGuide,
  processMultipleGuides,
  loadPrinciplesFromFile,
  validatePrinciples,
  mergePrinciples
};
