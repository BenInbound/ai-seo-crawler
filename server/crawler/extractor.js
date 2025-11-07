/**
 * Content Extractor
 *
 * Extracts structured content from HTML pages for storage and analysis.
 * Based on plan.md crawler infrastructure for User Story 2.
 *
 * Extraction includes:
 * - Title, meta description, canonical URL
 * - Headings hierarchy (h1-h6)
 * - Main body content (cleaned text)
 * - FAQ sections (question/answer pairs)
 * - Internal and outbound links
 * - Structured data (JSON-LD, schema types)
 * - Author and publication date
 */

const cheerio = require('cheerio');

/**
 * Extract all structured content from HTML
 *
 * @param {string} html - Raw HTML content
 * @param {string} pageUrl - URL of the page (for link resolution)
 * @returns {Object} - Extracted content matching PageSnapshot.extraction structure
 */
function extractContent(html, pageUrl) {
  const $ = cheerio.load(html);
  const baseUrl = new URL(pageUrl);

  return {
    title: extractTitle($),
    meta_description: extractMetaDescription($),
    canonical_url: extractCanonicalUrl($, pageUrl),
    headings: extractHeadings($),
    body: extractBodyText($),
    faq: extractFAQ($),
    internal_links: extractLinks($, baseUrl, true),
    outbound_links: extractLinks($, baseUrl, false),
    schema_types: extractSchemaTypes($),
    author: extractAuthor($),
    date_published: extractDatePublished($)
  };
}

/**
 * Extract page title
 */
function extractTitle($) {
  // Try OG title first, then title tag
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const titleTag = $('title').text();

  return (ogTitle || titleTag || '').trim();
}

/**
 * Extract meta description
 */
function extractMetaDescription($) {
  // Try OG description, then meta description, then first paragraph
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const metaDesc = $('meta[name="description"]').attr('content');

  return (ogDesc || metaDesc || '').trim();
}

/**
 * Extract canonical URL
 */
function extractCanonicalUrl($, fallbackUrl) {
  const canonical = $('link[rel="canonical"]').attr('href');
  const ogUrl = $('meta[property="og:url"]').attr('content');

  return canonical || ogUrl || fallbackUrl;
}

/**
 * Extract headings with hierarchy
 */
function extractHeadings($) {
  const headings = [];

  $('h1, h2, h3, h4, h5, h6').each((i, el) => {
    const $el = $(el);
    const level = parseInt(el.name.substring(1));
    const text = $el.text().trim();

    if (text) {
      headings.push({ level, text });
    }
  });

  return headings;
}

/**
 * Extract main body text (cleaned)
 */
function extractBodyText($) {
  // Remove script, style, nav, footer, header
  const $clone = $.load($.html());
  $clone('script, style, nav, footer, header, aside, [role="navigation"]').remove();

  // Try to find main content area
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '#content',
    '#main-content',
    '.content',
    '.main-content',
    'body'
  ];

  for (const selector of mainSelectors) {
    const $main = $clone(selector);
    if ($main.length > 0) {
      return $main.text().replace(/\s+/g, ' ').trim();
    }
  }

  return '';
}

/**
 * Extract FAQ sections (structured Q&A)
 */
function extractFAQ($) {
  const faqs = [];

  // Look for FAQ schema
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).text());

      if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
        data.mainEntity.forEach(item => {
          if (item['@type'] === 'Question') {
            faqs.push({
              question: item.name || '',
              answer:
                item.acceptedAnswer?.text || item.acceptedAnswer?.['@type'] === 'Answer'
                  ? item.acceptedAnswer.text
                  : ''
            });
          }
        });
      }
    } catch (e) {
      // Invalid JSON or structure, skip
    }
  });

  // Also look for common FAQ HTML patterns
  $('.faq, [class*="faq"], [id*="faq"]').each((i, el) => {
    const $section = $(el);

    // Pattern 1: dt/dd pairs
    $section.find('dt, dd').each((idx, elem) => {
      if (elem.name === 'dt') {
        const question = $(elem).text().trim();
        const answer = $(elem).next('dd').text().trim();
        if (question && answer) {
          faqs.push({ question, answer });
        }
      }
    });

    // Pattern 2: Question/Answer divs
    $section.find('[class*="question"]').each((idx, qEl) => {
      const question = $(qEl).text().trim();
      const answer = $(qEl).next('[class*="answer"]').text().trim();
      if (question && answer) {
        faqs.push({ question, answer });
      }
    });
  });

  return faqs;
}

/**
 * Extract links (internal or outbound)
 */
function extractLinks($, baseUrl, internal = true) {
  const links = [];
  const seen = new Set();

  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    const anchor = $(el).text().trim();

    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      return;
    }

    try {
      const linkUrl = new URL(href, baseUrl);
      const isInternal = linkUrl.hostname === baseUrl.hostname;

      if ((internal && isInternal) || (!internal && !isInternal)) {
        const urlStr = linkUrl.toString();
        if (!seen.has(urlStr)) {
          seen.add(urlStr);
          links.push({ url: urlStr, anchor });
        }
      }
    } catch (e) {
      // Invalid URL, skip
    }
  });

  return links;
}

/**
 * Extract schema types from structured data
 */
function extractSchemaTypes($) {
  const types = new Set();

  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).text());

      const extractTypes = obj => {
        if (obj && typeof obj === 'object') {
          if (obj['@type']) {
            if (Array.isArray(obj['@type'])) {
              obj['@type'].forEach(t => types.add(t));
            } else {
              types.add(obj['@type']);
            }
          }

          // Recursively check nested objects
          Object.values(obj).forEach(value => {
            if (typeof value === 'object') {
              extractTypes(value);
            }
          });
        }
      };

      if (Array.isArray(data)) {
        data.forEach(extractTypes);
      } else {
        extractTypes(data);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  return Array.from(types);
}

/**
 * Extract author information
 */
function extractAuthor($) {
  // Try various patterns
  const patterns = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[rel="author"]',
    '.author',
    '[class*="author"]',
    '[itemprop="author"]'
  ];

  for (const pattern of patterns) {
    const $el = $(pattern).first();
    if ($el.length > 0) {
      const author = $el.attr('content') || $el.attr('href') || $el.text().trim();
      if (author) {
        return author;
      }
    }
  }

  // Try JSON-LD
  let authorFromSchema = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data.author) {
        authorFromSchema = typeof data.author === 'string' ? data.author : data.author.name;
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  return authorFromSchema || null;
}

/**
 * Extract publication date
 */
function extractDatePublished($) {
  // Try various meta tags
  const patterns = [
    'meta[property="article:published_time"]',
    'meta[name="publication_date"]',
    'meta[name="date"]',
    'time[datetime]',
    '[itemprop="datePublished"]'
  ];

  for (const pattern of patterns) {
    const $el = $(pattern).first();
    if ($el.length > 0) {
      const date = $el.attr('content') || $el.attr('datetime');
      if (date) {
        return date;
      }
    }
  }

  // Try JSON-LD
  let dateFromSchema = null;
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data.datePublished) {
        dateFromSchema = data.datePublished;
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  return dateFromSchema || null;
}

/**
 * Calculate metrics from HTML and extracted content
 */
function calculateMetrics(html, extractedContent, loadTimeMs, renderMethod = 'static') {
  const wordCount = extractedContent.body
    ? extractedContent.body.split(/\s+/).filter(w => w.length > 0).length
    : 0;

  return {
    load_time_ms: loadTimeMs,
    content_length: html.length,
    word_count: wordCount,
    render_method: renderMethod
  };
}

module.exports = {
  extractContent,
  calculateMetrics
};
