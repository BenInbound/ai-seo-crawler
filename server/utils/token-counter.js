/**
 * Token Counting Utility using tiktoken
 *
 * Provides accurate token counting for OpenAI GPT models using the official tiktoken library.
 * Based on research.md recommendations for budget enforcement and cost tracking.
 *
 * Used for:
 * - Enforcing token limits per crawl run
 * - Estimating API costs before making requests
 * - Tracking cumulative token usage
 * - Pausing/resuming crawls when limits reached
 */

const { encoding_for_model } = require('tiktoken');

/**
 * Cached encoder instances (expensive to create)
 */
const encoderCache = new Map();

/**
 * Default model for token counting
 */
const DEFAULT_MODEL = 'gpt-4';

/**
 * Get or create a cached encoder for a specific model
 *
 * @param {string} modelName - OpenAI model name (e.g., 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo')
 * @returns {Object} - Tiktoken encoder instance
 */
function getEncoder(modelName = DEFAULT_MODEL) {
  if (encoderCache.has(modelName)) {
    return encoderCache.get(modelName);
  }

  try {
    const encoder = encoding_for_model(modelName);
    encoderCache.set(modelName, encoder);
    return encoder;
  } catch (error) {
    // Fallback to gpt-4 if model not recognized
    console.warn(`Model ${modelName} not recognized, falling back to ${DEFAULT_MODEL}`);
    if (modelName !== DEFAULT_MODEL) {
      return getEncoder(DEFAULT_MODEL);
    }
    throw error;
  }
}

/**
 * Count tokens in a text string
 *
 * @param {string} text - The text to count tokens for
 * @param {string} modelName - OpenAI model name
 * @returns {number} - Token count
 */
function countTokens(text, modelName = DEFAULT_MODEL) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  try {
    const encoder = getEncoder(modelName);
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    console.error('Error counting tokens:', error);
    // Rough fallback estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Count tokens in an array of messages (OpenAI chat format)
 * Accounts for message formatting overhead
 *
 * @param {Array<Object>} messages - Array of {role, content} objects
 * @param {string} modelName - OpenAI model name
 * @returns {number} - Total token count including overhead
 */
function countMessageTokens(messages, modelName = DEFAULT_MODEL) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 0;
  }

  try {
    const encoder = getEncoder(modelName);
    let totalTokens = 0;

    // Overhead per message (varies by model)
    const tokensPerMessage = modelName.includes('gpt-4') ? 3 : 4;
    const tokensPerName = modelName.includes('gpt-4') ? 1 : -1;

    for (const message of messages) {
      totalTokens += tokensPerMessage;

      if (message.role) {
        totalTokens += encoder.encode(message.role).length;
      }

      if (message.content) {
        totalTokens += encoder.encode(message.content).length;
      }

      if (message.name) {
        totalTokens += encoder.encode(message.name).length;
        totalTokens += tokensPerName;
      }
    }

    // Add overhead for response priming
    totalTokens += 3;

    return totalTokens;
  } catch (error) {
    console.error('Error counting message tokens:', error);
    // Fallback: sum content lengths with rough estimate
    return messages.reduce((sum, msg) => {
      const contentLength = msg.content ? msg.content.length : 0;
      return sum + Math.ceil(contentLength / 4) + 10; // +10 for message overhead
    }, 0);
  }
}

/**
 * Estimate the cost of a text in USD based on model pricing
 * Uses approximate pricing as of 2025
 *
 * @param {number} tokenCount - Number of tokens
 * @param {string} modelName - OpenAI model name
 * @param {string} operation - 'input' or 'output' (output tokens cost more)
 * @returns {number} - Estimated cost in USD
 */
function estimateCost(tokenCount, modelName = DEFAULT_MODEL, operation = 'input') {
  const pricing = {
    'gpt-4': {
      input: 0.03 / 1000, // $0.03 per 1K input tokens
      output: 0.06 / 1000 // $0.06 per 1K output tokens
    },
    'gpt-4-turbo': {
      input: 0.01 / 1000, // $0.01 per 1K input tokens
      output: 0.03 / 1000 // $0.03 per 1K output tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000, // $0.0005 per 1K input tokens
      output: 0.0015 / 1000 // $0.0015 per 1K output tokens
    }
  };

  const modelPricing = pricing[modelName] || pricing['gpt-4'];
  const rate = modelPricing[operation] || modelPricing.input;

  return tokenCount * rate;
}

/**
 * Check if adding more tokens would exceed a budget limit
 *
 * @param {number} currentTokens - Current cumulative token count
 * @param {number} additionalTokens - Tokens about to be consumed
 * @param {number} limit - Maximum allowed tokens
 * @returns {boolean} - True if within budget, false if exceeded
 */
function isWithinBudget(currentTokens, additionalTokens, limit) {
  if (!limit || limit <= 0) {
    // No limit set, always within budget
    return true;
  }

  return currentTokens + additionalTokens <= limit;
}

/**
 * Calculate remaining tokens in a budget
 *
 * @param {number} currentTokens - Current cumulative token count
 * @param {number} limit - Maximum allowed tokens
 * @returns {number} - Remaining tokens (0 if exceeded)
 */
function getRemainingTokens(currentTokens, limit) {
  if (!limit || limit <= 0) {
    return Infinity;
  }

  const remaining = limit - currentTokens;
  return Math.max(0, remaining);
}

/**
 * Truncate text to fit within a token limit
 * Useful for ensuring prompts don't exceed context windows
 *
 * @param {string} text - The text to truncate
 * @param {number} maxTokens - Maximum tokens allowed
 * @param {string} modelName - OpenAI model name
 * @returns {string} - Truncated text
 */
function truncateToTokenLimit(text, maxTokens, modelName = DEFAULT_MODEL) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    const encoder = getEncoder(modelName);
    const tokens = encoder.encode(text);

    if (tokens.length <= maxTokens) {
      return text;
    }

    // Truncate tokens and decode back to text
    const truncatedTokens = tokens.slice(0, maxTokens);
    return encoder.decode(truncatedTokens);
  } catch (error) {
    console.error('Error truncating text:', error);
    // Fallback: rough character-based truncation
    const estimatedChars = maxTokens * 4;
    return text.substring(0, estimatedChars);
  }
}

/**
 * Get token statistics for a crawl run
 *
 * @param {Object} stats - Object with token counts
 * @param {number} stats.totalTokens - Total tokens used
 * @param {number} stats.limit - Token limit (null for unlimited)
 * @param {string} modelName - OpenAI model name
 * @returns {Object} - Statistics including cost and percentage
 */
function getTokenStats(stats, modelName = DEFAULT_MODEL) {
  const { totalTokens, limit } = stats;

  const result = {
    totalTokens,
    limit,
    limitedMode: !!limit,
    estimatedCostUSD: estimateCost(totalTokens, modelName, 'input')
  };

  if (limit) {
    result.percentUsed = Math.round((totalTokens / limit) * 100);
    result.remaining = getRemainingTokens(totalTokens, limit);
    result.exceededLimit = totalTokens > limit;
  }

  return result;
}

/**
 * Free encoder instances (for cleanup)
 */
function cleanup() {
  for (const encoder of encoderCache.values()) {
    if (encoder.free) {
      encoder.free();
    }
  }
  encoderCache.clear();
}

module.exports = {
  countTokens,
  countMessageTokens,
  estimateCost,
  isWithinBudget,
  getRemainingTokens,
  truncateToTokenLimit,
  getTokenStats,
  cleanup,
  DEFAULT_MODEL
};
