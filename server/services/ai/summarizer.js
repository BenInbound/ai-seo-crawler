/**
 * Content Summarizer
 *
 * AI-powered content summarization to reduce token usage and costs.
 * Based on FR-058: System MUST summarize page content before sending to AI.
 *
 * Purpose:
 * - Reduce token consumption by 60% (SC-005)
 * - Extract key information from page content
 * - Create structured, consistent summaries for AI scoring
 * - Preserve critical elements (headings, FAQs, links, schema)
 *
 * Strategy:
 * - Use GPT-4-turbo for intelligent summarization
 * - Preserve factual accuracy and key entities
 * - Focus on content relevant to AEO scoring criteria
 * - Generate summaries of ~200-500 words depending on page complexity
 */

const { generateCompletion, buildSummarizationSystemPrompt } = require('./client');
const { encode } = require('tiktoken').encoding_for_model('gpt-4');

/**
 * Count tokens in text
 *
 * @param {string} text - Text to count
 * @returns {number} - Token count
 */
function countTokens(text) {
  if (!text) return 0;

  try {
    const tokens = encode(text);
    return tokens.length;
  } catch (error) {
    // Fallback: rough estimation (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Determine if content needs summarization
 *
 * @param {string} text - Content text
 * @param {number} threshold - Token threshold (default 1000)
 * @returns {boolean} - True if summarization needed
 */
function needsSummarization(text, threshold = 1000) {
  const tokens = countTokens(text);
  return tokens > threshold;
}

/**
 * Extract structured information from page snapshot
 *
 * Creates a structured representation of page content without AI,
 * preserving key elements for scoring.
 *
 * @param {Object} snapshot - Page snapshot from database
 * @returns {Object} - Structured extraction
 */
function extractStructuredInfo(snapshot) {
  const extraction = snapshot.extraction || {};

  return {
    title: extraction.title || '',
    metaDescription: extraction.meta_description || '',
    headings: (extraction.headings || []).slice(0, 10), // Top 10 headings
    faqCount: (extraction.faq || []).length,
    faqSample: (extraction.faq || []).slice(0, 3), // First 3 FAQs
    internalLinksCount: (extraction.internal_links || []).length,
    outboundLinksCount: (extraction.outbound_links || []).length,
    schemaTypes: extraction.schema_types || [],
    author: extraction.author || null,
    datePublished: extraction.date_published || null,
    wordCount: snapshot.metrics?.word_count || 0,
    hasCanonical: !!extraction.canonical_url
  };
}

/**
 * Build context string from structured info
 *
 * @param {Object} structuredInfo - Structured info object
 * @returns {string} - Context string
 */
function buildContextString(structuredInfo) {
  const parts = [];

  if (structuredInfo.title) {
    parts.push(`Title: ${structuredInfo.title}`);
  }

  if (structuredInfo.metaDescription) {
    parts.push(`Meta: ${structuredInfo.metaDescription}`);
  }

  if (structuredInfo.headings.length > 0) {
    parts.push(
      `Headings: ${structuredInfo.headings.map(h => `${h.text} (H${h.level})`).join(', ')}`
    );
  }

  if (structuredInfo.faqSample.length > 0) {
    parts.push(
      `FAQs: ${structuredInfo.faqSample.map(f => f.question).join('; ')}`
    );
  }

  if (structuredInfo.schemaTypes.length > 0) {
    parts.push(`Schema: ${structuredInfo.schemaTypes.join(', ')}`);
  }

  parts.push(`Links: ${structuredInfo.internalLinksCount} internal, ${structuredInfo.outboundLinksCount} external`);
  parts.push(`Words: ${structuredInfo.wordCount}`);

  return parts.join('\n');
}

/**
 * Summarize page content using AI
 *
 * @param {string} content - Full page content
 * @param {Object} options - Summarization options
 * @param {number} options.targetLength - Target summary length in words (default 300)
 * @param {string} options.pageType - Page type for context
 * @param {Object} options.structuredInfo - Pre-extracted structured info
 * @returns {Promise<Object>} - Summary result {summary, tokensUsed, originalTokens, reduction}
 */
async function summarizeContent(content, options = {}) {
  const {
    targetLength = 300,
    pageType = 'unknown',
    structuredInfo = null
  } = options;

  // Count original tokens
  const originalTokens = countTokens(content);

  // Build system prompt
  const systemPrompt = buildSummarizationSystemPrompt(targetLength);

  // Build user prompt with structured context if available
  let userPrompt = `Page Type: ${pageType}\n\n`;

  if (structuredInfo) {
    userPrompt += `Structured Context:\n${buildContextString(structuredInfo)}\n\n`;
  }

  userPrompt += `Full Content to Summarize:\n${content.substring(0, 10000)}`; // Limit to ~10k chars

  try {
    const response = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'gpt-4-turbo',
      maxTokens: Math.min(800, targetLength * 2), // Rough token estimate
      temperature: 0.3 // Lower for more consistent summaries
    });

    const summary = response.content;
    const summaryTokens = countTokens(summary);
    const reduction = ((originalTokens - summaryTokens) / originalTokens) * 100;

    return {
      summary,
      tokensUsed: response.usage.totalTokens,
      originalTokens,
      summaryTokens,
      reductionPercent: Math.round(reduction),
      model: response.model
    };
  } catch (error) {
    throw new Error(`Content summarization failed: ${error.message}`);
  }
}

/**
 * Prepare content for scoring
 *
 * Main entry point: decides whether to summarize or use structured extraction
 *
 * @param {Object} snapshot - Page snapshot from database
 * @param {Object} options - Preparation options
 * @param {boolean} options.forceSummarize - Force AI summarization even if short
 * @param {number} options.tokenThreshold - Threshold for summarization (default 1000)
 * @returns {Promise<Object>} - Prepared content {content, method, tokensUsed, metadata}
 */
async function prepareContentForScoring(snapshot, options = {}) {
  const {
    forceSummarize = false,
    tokenThreshold = 1000
  } = options;

  // Extract structured info (always done, no tokens used)
  const structuredInfo = extractStructuredInfo(snapshot);

  // Get cleaned text
  const cleanedText = snapshot.cleaned_text || '';

  // Determine page type
  const pageType = snapshot.extraction?.page_type || 'unknown';

  // Check if summarization is needed
  const shouldSummarize = forceSummarize || needsSummarization(cleanedText, tokenThreshold);

  if (!shouldSummarize) {
    // Content is short enough, use as-is with structured info
    const contextStr = buildContextString(structuredInfo);
    const combinedContent = `${contextStr}\n\nMain Content:\n${cleanedText}`;

    return {
      content: combinedContent,
      method: 'structured-only',
      tokensUsed: 0,
      tokenCount: countTokens(combinedContent),
      metadata: {
        structuredInfo,
        originalLength: cleanedText.length
      }
    };
  }

  // Content is long, summarize it
  const summaryResult = await summarizeContent(cleanedText, {
    targetLength: 300,
    pageType,
    structuredInfo
  });

  // Combine structured info with summary
  const contextStr = buildContextString(structuredInfo);
  const combinedContent = `${contextStr}\n\nContent Summary:\n${summaryResult.summary}`;

  return {
    content: combinedContent,
    method: 'ai-summarized',
    tokensUsed: summaryResult.tokensUsed,
    tokenCount: countTokens(combinedContent),
    metadata: {
      structuredInfo,
      originalTokens: summaryResult.originalTokens,
      summaryTokens: summaryResult.summaryTokens,
      reductionPercent: summaryResult.reductionPercent
    }
  };
}

/**
 * Batch prepare multiple snapshots
 *
 * @param {Array} snapshots - Array of snapshots
 * @param {Object} options - Preparation options
 * @returns {Promise<Array>} - Array of prepared content objects
 */
async function batchPrepareContent(snapshots, options = {}) {
  const results = [];

  for (const snapshot of snapshots) {
    try {
      const prepared = await prepareContentForScoring(snapshot, options);
      results.push({
        snapshotId: snapshot.id,
        pageId: snapshot.page_id,
        ...prepared
      });
    } catch (error) {
      console.error(`Failed to prepare snapshot ${snapshot.id}:`, error.message);
      results.push({
        snapshotId: snapshot.id,
        pageId: snapshot.page_id,
        error: error.message,
        method: 'error'
      });
    }
  }

  return results;
}

/**
 * Calculate estimated token savings
 *
 * @param {Object} preparationResult - Result from prepareContentForScoring
 * @returns {Object} - Savings calculation
 */
function calculateTokenSavings(preparationResult) {
  if (preparationResult.method === 'structured-only') {
    return {
      savingsPercent: 0,
      savingsTokens: 0,
      note: 'Content was short enough to use without summarization'
    };
  }

  if (preparationResult.method === 'ai-summarized') {
    const { originalTokens, summaryTokens, reductionPercent } = preparationResult.metadata;

    return {
      savingsPercent: reductionPercent,
      savingsTokens: originalTokens - summaryTokens,
      originalTokens,
      finalTokens: summaryTokens,
      note: `Reduced content by ${reductionPercent}% through AI summarization`
    };
  }

  return {
    savingsPercent: 0,
    savingsTokens: 0,
    note: 'Unknown method'
  };
}

/**
 * Smart content chunking for very long pages
 *
 * Splits content into logical chunks for processing
 *
 * @param {string} content - Content to chunk
 * @param {number} maxTokensPerChunk - Max tokens per chunk (default 2000)
 * @returns {Array<string>} - Array of content chunks
 */
function chunkContent(content, maxTokensPerChunk = 2000) {
  const chunks = [];

  // Split by paragraphs
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);

    if (currentTokens + paragraphTokens > maxTokensPerChunk && currentChunk) {
      // Save current chunk and start new one
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentTokens = paragraphTokens;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

module.exports = {
  countTokens,
  needsSummarization,
  extractStructuredInfo,
  buildContextString,
  summarizeContent,
  prepareContentForScoring,
  batchPrepareContent,
  calculateTokenSavings,
  chunkContent
};
