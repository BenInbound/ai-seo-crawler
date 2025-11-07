/**
 * Unit Tests for Page-Type Detection (T085)
 *
 * Tests the ContentAnalyzer.detectPageType() method without requiring
 * server, database, or external services.
 */

const cheerio = require('cheerio');
const { ContentAnalyzer } = require('../../../server/crawler/analyzer');

describe('T085: Page-Type Detection Unit Tests', () => {
  let analyzer;

  beforeAll(() => {
    analyzer = new ContentAnalyzer();
  });

  describe('Homepage Detection', () => {
    test('Should detect root URL as homepage', () => {
      const html = '<html><head><title>Welcome</title></head><body><h1>Home</h1></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('homepage');
    });

    test('Should detect / path as homepage', () => {
      const html = '<html><head><title>Welcome</title></head><body></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('homepage');
    });
  });

  describe('Blog Detection', () => {
    test('Should detect /blog/ URL as blog', () => {
      const html = '<html><head><title>Blog Post</title></head><body><article><h1>My Post</h1></article></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/blog/my-post' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('blog');
    });

    test('Should detect article with date as blog', () => {
      const html = `
        <html>
          <head>
            <title>How to Optimize SEO</title>
            <meta property="article:published_time" content="2025-01-15">
          </head>
          <body>
            <article>
              <h1>How to Optimize SEO</h1>
              <time datetime="2025-01-15">January 15, 2025</time>
              <div class="author">By John Doe</div>
            </article>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/blog/seo-guide' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('blog');
    });
  });

  describe('Product Detection', () => {
    test('Should detect /product/ URL as product', () => {
      const html = '<html><head><title>Widget Pro</title></head><body><h1>Product</h1></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/product/widget-pro' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('product');
    });

    test('Should detect product schema as product', () => {
      const html = `
        <html>
          <head><title>Widget Pro - $99.99</title></head>
          <body>
            <div itemtype="http://schema.org/Product" itemscope>
              <h1 itemprop="name">Widget Pro</h1>
              <span itemprop="price">$99.99</span>
              <button>Add to Cart</button>
            </div>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/product/widget-pro' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('product');
    });
  });

  describe('Solution Detection', () => {
    test('Should detect /solution/ URL as solution', () => {
      const html = '<html><head><title>Enterprise Solutions</title></head><body><h1>Solutions</h1></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/solution/enterprise' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('solution');
    });
  });

  describe('Resource Detection', () => {
    test('Should detect /resource/ URL as resource', () => {
      const html = '<html><head><title>Whitepaper Download</title></head><body></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/resource/whitepaper.pdf' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('resource');
    });

    test('Should fall back to resource for ambiguous pages', () => {
      const html = '<html><head><title>About Us</title></head><body><h1>About</h1></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/about' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(['resource', 'homepage', 'conversion']).toContain(detectedType);
    });
  });

  describe('Conversion Detection', () => {
    test('Should detect /signup/ URL as conversion', () => {
      const html = `
        <html>
          <head><title>Sign Up</title></head>
          <body>
            <h1>Start Your Free Trial</h1>
            <form>
              <input type="email" placeholder="Email">
              <button type="submit">Sign Up</button>
            </form>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/signup/' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('conversion');
    });
  });

  describe('Edge Cases', () => {
    test('Should handle URLs with blog pattern', () => {
      const html = '<html><head><title>Post</title></head><body></body></html>';
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/blog/my-post' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('blog');
    });

    test('Should prioritize URL patterns over content indicators', () => {
      const html = `
        <html>
          <head><title>Blog Post</title></head>
          <body>
            <div itemtype="http://schema.org/Product" itemscope>
              <span itemprop="price">$99.99</span>
            </div>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);
      const pageData = { url: 'https://example.com/blog/product-review' };

      const detectedType = analyzer.detectPageType($, pageData);

      expect(detectedType).toBe('blog');
    });
  });
});
