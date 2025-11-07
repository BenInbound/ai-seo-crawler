/**
 * OpenAI API Client
 *
 * Centralized OpenAI API client setup for the AEO platform.
 * Provides access to GPT-4 for AI recommendations and text-embedding-3-small for embeddings.
 *
 * Based on research.md: Uses official openai SDK with streaming support and automatic retries.
 *
 * Environment Variables:
 * - OPENAI_API_KEY (required) - OpenAI API key
 * - OPENAI_MODEL (optional) - Default model, defaults to gpt-4-turbo
 * - OPENAI_MAX_TOKENS (optional) - Default max tokens, defaults to 2000
 * - OPENAI_TEMPERATURE (optional) - Default temperature, defaults to 0.7
 */

const OpenAI = require('openai');

// Configuration
const config = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  embeddingModel: 'text-embedding-3-small'
};

// Initialize OpenAI client
let openaiClient = null;

/**
 * Get or create OpenAI client instance
 *
 * @returns {OpenAI} - OpenAI client instance
 * @throws {Error} - If OPENAI_API_KEY is not configured
 */
function getClient() {
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.apiKey
    });
  }

  return openaiClient;
}

/**
 * Generate a chat completion (non-streaming)
 *
 * @param {Object} options - Completion options
 * @param {Array} options.messages - Array of message objects {role, content}
 * @param {string} options.model - Model to use (defaults to config.model)
 * @param {number} options.maxTokens - Max tokens (defaults to config.maxTokens)
 * @param {number} options.temperature - Temperature (defaults to config.temperature)
 * @param {Object} options.responseFormat - Response format (e.g., {type: 'json_object'})
 * @returns {Promise<Object>} - Completion response with {content, usage}
 */
async function generateCompletion(options) {
  const client = getClient();

  const {
    messages,
    model = config.model,
    maxTokens = config.maxTokens,
    temperature = config.temperature,
    responseFormat = null
  } = options;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages array is required and must not be empty');
  }

  const requestParams = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature
  };

  // Add response format if specified (for JSON mode)
  if (responseFormat) {
    requestParams.response_format = responseFormat;
  }

  try {
    const completion = await client.chat.completions.create(requestParams);

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      model: completion.model,
      finishReason: completion.choices[0]?.finish_reason
    };
  } catch (error) {
    // Enhance error with context
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Generate a streaming chat completion
 *
 * @param {Object} options - Completion options
 * @param {Array} options.messages - Array of message objects {role, content}
 * @param {Function} options.onChunk - Callback for each chunk (chunk) => void
 * @param {string} options.model - Model to use (defaults to config.model)
 * @param {number} options.maxTokens - Max tokens (defaults to config.maxTokens)
 * @param {number} options.temperature - Temperature (defaults to config.temperature)
 * @returns {Promise<Object>} - Final result with {content, usage}
 */
async function generateStreamingCompletion(options) {
  const client = getClient();

  const {
    messages,
    onChunk,
    model = config.model,
    maxTokens = config.maxTokens,
    temperature = config.temperature
  } = options;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages array is required and must not be empty');
  }

  if (typeof onChunk !== 'function') {
    throw new Error('onChunk callback is required for streaming');
  }

  try {
    const stream = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';

      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }

    // Note: Streaming doesn't return usage info in all cases
    return {
      content: fullContent,
      usage: {
        promptTokens: 0, // Not available in streaming
        completionTokens: 0,
        totalTokens: 0
      }
    };
  } catch (error) {
    throw new Error(`OpenAI streaming error: ${error.message}`);
  }
}

/**
 * Generate embeddings for text
 *
 * @param {string|Array<string>} input - Text or array of texts to embed
 * @param {string} model - Embedding model (defaults to text-embedding-3-small)
 * @returns {Promise<Object>} - Embeddings result with {embeddings, usage}
 */
async function generateEmbeddings(input, model = config.embeddingModel) {
  const client = getClient();

  if (!input || (Array.isArray(input) && input.length === 0)) {
    throw new Error('input is required for embeddings');
  }

  try {
    const response = await client.embeddings.create({
      model,
      input
    });

    return {
      embeddings: response.data.map(item => item.embedding),
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      model: response.model
    };
  } catch (error) {
    throw new Error(`OpenAI embeddings error: ${error.message}`);
  }
}

/**
 * Parse JSON response safely
 *
 * Helper function to parse JSON responses from GPT (handles markdown code blocks)
 *
 * @param {string} content - Response content
 * @returns {Object} - Parsed JSON object
 * @throws {Error} - If JSON parsing fails
 */
function parseJsonResponse(content) {
  // Remove markdown code blocks if present
  let jsonStr = content.trim();

  // Remove ```json and ``` markers
  jsonStr = jsonStr.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/, '');

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }
}

/**
 * Build a system prompt for scoring
 *
 * @param {string} pageType - Type of page being scored
 * @param {string} rubricVersion - Version of rubric being used
 * @param {Object} rubricRules - Rubric rules/criteria
 * @returns {string} - System prompt
 */
function buildScoringSystemPrompt(pageType, rubricVersion, rubricRules) {
  return `You are an Answer Engine Optimization (AEO) expert evaluating web pages for their readiness to appear in AI-powered search results like Google AI Overviews.

Page Type: ${pageType}
Rubric Version: ${rubricVersion}

Your task is to:
1. Analyze the page content against the provided rubric criteria
2. Score each criterion from 0-100
3. Provide brief, specific explanations for each score
4. Generate actionable, human-sounding recommendations that reference actual page content

Scoring Guidelines:
- 0-40: Poor - Major improvements needed
- 41-60: Fair - Significant room for improvement
- 61-80: Good - Minor improvements recommended
- 81-100: Excellent - Well optimized

Rubric Criteria:
${JSON.stringify(rubricRules, null, 2)}

Respond in valid JSON format matching the expected schema.`;
}

/**
 * Build a system prompt for content summarization
 *
 * @param {number} targetLength - Target summary length in words
 * @returns {string} - System prompt
 */
function buildSummarizationSystemPrompt(targetLength = 200) {
  return `You are a content summarization expert. Your task is to create concise, accurate summaries of web page content.

Guidelines:
- Preserve key facts, entities, and concepts
- Maintain technical accuracy
- Focus on main topics and themes
- Remove boilerplate, navigation, ads
- Target length: ~${targetLength} words
- Use clear, professional language

Output only the summary text, no additional commentary.`;
}

/**
 * Health check for OpenAI API
 *
 * @returns {Promise<Object>} - Health status {ok, error}
 */
async function healthCheck() {
  try {
    const client = getClient();

    // Make a minimal API call to verify connectivity
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5
    });

    return {
      ok: true,
      model: response.model,
      responseTime: Date.now()
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

module.exports = {
  getClient,
  generateCompletion,
  generateStreamingCompletion,
  generateEmbeddings,
  parseJsonResponse,
  buildScoringSystemPrompt,
  buildSummarizationSystemPrompt,
  healthCheck,
  config
};
