const puppeteer = require(process.env.NODE_ENV === 'production' ? 'puppeteer-core' : 'puppeteer');
const chromium = require('@sparticuz/chromium');
const axios = require('axios');
const cheerio = require('cheerio');
const { RobotsChecker } = require('../utils/robotsChecker');
const { ContentAnalyzer } = require('./analyzer');
const { ScoreCalculator } = require('./scorer');
const URL = require('url').URL;

class CrawlerEngine {
  constructor() {
    this.robotsChecker = new RobotsChecker();
    this.contentAnalyzer = new ContentAnalyzer();
    this.scoreCalculator = new ScoreCalculator();
    this.browser = null;
    this.userAgent = 'AI-Search-Crawler/1.0 (AI Search Readiness Analysis)';
    this.crawlDelay = parseInt(process.env.CRAWLER_DELAY_MS) || 2000;
    this.timeout = parseInt(process.env.CRAWLER_TIMEOUT_MS) || 30000;
  }

  async initBrowser() {
    if (!this.browser) {
      try {
        // Configure for Vercel serverless environment
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (isProduction) {
          // Get fonts path if available
          const fontsPath = await chromium.font || null;
          
          this.browser = await puppeteer.launch({
            args: [
              ...chromium.args,
              '--hide-scrollbars',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              fontsPath ? `--font-render-hinting=none` : '',
            ].filter(Boolean),
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
          });
        } else {
          this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--single-process',
              '--disable-gpu'
            ]
          });
        }
      } catch (error) {
        console.warn('Puppeteer failed to launch, will use fallback HTTP method:', error.message);
        this.browser = null; // Mark as failed, will use HTTP fallback
      }
    }
    return this.browser;
  }

  async crawlPageHTTP(url) {
    console.log(`Using HTTP fallback for: ${url}`);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: this.timeout,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      
      // Extract structured data
      const structuredData = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          structuredData.push(JSON.parse($(el).text()));
        } catch (e) {
          // Invalid JSON, skip
        }
      });

      // Extract basic page data
      const pageData = {
        url: url,
        title: $('title').text() || '',
        metaDescription: $('meta[name="description"]').attr('content') || '',
        html: response.data,
        structuredData,
        
        ogData: {
          title: $('meta[property="og:title"]').attr('content') || '',
          description: $('meta[property="og:description"]').attr('content') || '',
          image: $('meta[property="og:image"]').attr('content') || '',
          type: $('meta[property="og:type"]').attr('content') || ''
        },

        headings: {
          h1: $('h1').map((i, el) => $(el).text().trim()).get(),
          h2: $('h2').map((i, el) => $(el).text().trim()).get(),
          h3: $('h3').map((i, el) => $(el).text().trim()).get()
        },

        links: {
          internal: $('a[href]').map((i, el) => $(el).attr('href')).get()
            .filter(href => href && href.includes(new URL(url).hostname)),
          external: $('a[href]').map((i, el) => $(el).attr('href')).get()
            .filter(href => href && href.startsWith('http') && !href.includes(new URL(url).hostname))
        },

        images: $('img').map((i, el) => ({
          src: $(el).attr('src') || '',
          alt: $(el).attr('alt') || '',
          hasAlt: Boolean($(el).attr('alt'))
        })).get(),

        textContent: $('body').text() || '',
        wordCount: ($('body').text() || '').split(/\s+/).filter(word => word.length > 0).length,
        statusCode: response.status,
        loadTime: 0, // Not available in HTTP mode
        responseHeaders: response.headers,
        timestamp: new Date().toISOString(),
        fallbackMode: true
      };

      return pageData;
    } catch (error) {
      console.error('HTTP fallback also failed:', error.message);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async analyzeDomain(domain, specificUrl = null) {
    
    try {
      // Normalize domain and determine target URL
      const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const targetUrl = specificUrl || `https://${normalizedDomain}`;
      const baseUrl = `https://${normalizedDomain}`;

      console.log(`Starting analysis for domain: ${normalizedDomain}`);
      if (specificUrl) {
        console.log(`Analyzing specific URL: ${specificUrl}`);
      }

      // Check robots.txt with multi-strategy approach
      const robotsInfo = await this.robotsChecker.checkRobots(normalizedDomain, this.userAgent);
      console.log(`Robots.txt check result:`, {
        exists: robotsInfo.exists,
        canCrawl: robotsInfo.canCrawl,
        canCrawlAsBrowser: robotsInfo.canCrawlAsBrowser,
        bestUserAgent: robotsInfo.bestUserAgent?.substring(0, 50) + '...'
      });
      
      // Determine the best crawling strategy
      let canProceed = false;
      let selectedUserAgent = this.userAgent;
      let crawlStrategy = 'blocked';
      
      if (robotsInfo.canCrawl) {
        // Preferred: Use our identified crawler
        canProceed = true;
        selectedUserAgent = this.userAgent;
        crawlStrategy = 'crawler';
        console.log(`✅ Crawling allowed as identified crawler for ${normalizedDomain}`);
      } else if (robotsInfo.canCrawlAsBrowser) {
        // Fallback: Use browser user agent (legitimate SEO tool strategy)
        canProceed = true;
        selectedUserAgent = robotsInfo.bestUserAgent;
        crawlStrategy = 'browser';
        console.log(`✅ Crawling allowed as browser (${robotsInfo.analysisStrategies.browser.userAgentType}) for ${normalizedDomain}`);
      } else {
        // Completely blocked - create informative blocked result
        console.log(`❌ All crawling blocked for ${normalizedDomain}`);
        
        const failedData = {
          domain: normalizedDomain,
          url: baseUrl,
          overallScore: 0,
          contentScore: 0,
          eatScore: 0,
          technicalScore: 0,
          structuredDataScore: 0,
          analysisData: { 
            robotsInfo,
            error: 'All crawling strategies blocked by robots.txt',
            suggestion: 'This website comprehensively blocks automated access. Manual analysis required.'
          },
          recommendations: [
            {
              category: 'Crawler Access',
              priority: 'high',
              issue: 'Comprehensive robots.txt blocking',
              recommendation: 'This website blocks all automated access including browser user agents. This indicates very strict content protection policies.',
              impact: 'Cannot provide automated analysis - this shows extremely security-conscious site management.',
              implementation: 'To analyze this site:\n1. Contact site owner directly for analysis permission\n2. Use manual browser inspection with developer tools\n3. Check if any public API endpoints are available\n4. Review publicly available meta information only'
            }
          ],
          status: 'blocked',
          errorMessage: 'All crawling strategies blocked by robots.txt'
        };

        return {
          ...failedData,
          blocked: true
        };
      }

      // Use crawl delay from robots.txt if specified
      const crawlDelay = Math.max(robotsInfo.crawlDelay * 1000, this.crawlDelay);
      
      // Update user agent for this analysis
      this.userAgent = selectedUserAgent;

      // Initialize browser (or try to)
      await this.initBrowser();

      // Crawl target page - use fallback if Puppeteer failed
      const pageType = specificUrl ? 'specific page' : 'homepage';
      console.log(`Crawling ${pageType} with user agent: ${selectedUserAgent.substring(0, 50)}...`);
      const pageData = this.browser 
        ? await this.crawlPage(targetUrl, crawlDelay)
        : await this.crawlPageHTTP(targetUrl);
      console.log(`Page data extracted:`, {
        title: pageData.title,
        wordCount: pageData.wordCount,
        hasStructuredData: (pageData.structuredData?.length || 0) > 0,
        statusCode: pageData.statusCode
      });

      // Analyze content
      const analysis = await this.contentAnalyzer.analyzeContent(pageData);
      console.log(`Content analysis complete:`, {
        contentWordCount: analysis.content?.wordCount,
        hasDirectAnswer: analysis.content?.hasDirectAnswer,
        hasStructuredData: analysis.structuredData?.hasStructuredData,
        technicalHTTPS: analysis.technical?.isHTTPS
      });

      // Calculate scores
      const scores = this.scoreCalculator.calculateScores(analysis);
      console.log(`Scores calculated:`, scores);

      // Generate recommendations
      const recommendations = this.scoreCalculator.generateRecommendations(analysis, scores);

      // Prepare result data
      const resultData = {
        domain: normalizedDomain,
        url: targetUrl,
        overallScore: scores.overall,
        contentScore: scores.content,
        eatScore: scores.eat,
        technicalScore: scores.technical,
        structuredDataScore: scores.structuredData,
        analysisData: {
          ...analysis,
          robotsInfo,
          crawlInfo: {
            crawlDate: new Date().toISOString(),
            userAgent: selectedUserAgent,
            originalUserAgent: this.userAgent,
            crawlStrategy,
            crawlDelay,
            robotsRecommendations: robotsInfo.recommendations
          }
        },
        recommendations,
        status: 'completed'
      };

      console.log(`Analysis completed for ${normalizedDomain}, score: ${scores.overall}`);

      return {
        ...resultData
      };

    } catch (error) {
      console.error(`Analysis failed for ${domain}:`, error);

      // Save failed result
      const failedData = {
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        url: `https://${domain}`,
        overallScore: 0,
        contentScore: 0,
        eatScore: 0,
        technicalScore: 0,
        structuredDataScore: 0,
        analysisData: { error: error.message },
        recommendations: [],
        status: 'failed',
        errorMessage: error.message
      };

      throw error;
    } finally {
      // Only close browser if it was successfully created
      if (this.browser) {
        await this.closeBrowser();
      }
    }
  }

  async crawlPage(url, delay = 2000) {
    const page = await this.browser.newPage();
    
    try {
      // Set user agent
      await page.setUserAgent(this.userAgent);

      // Set viewport for mobile-first analysis
      await page.setViewport({ width: 375, height: 667 });

      // Enable request interception to block unnecessary resources
      await page.setRequestInterception(true);
      
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      console.log(`Crawling: ${url}`);

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout
      });

      // Wait for additional delay to be respectful
      await this.sleep(delay);

      // Get page metrics
      const metrics = await page.metrics();

      // Extract page data
      const pageData = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          metaDescription: document.querySelector('meta[name=\"description\"]')?.getAttribute('content') || '',
          html: document.documentElement.outerHTML,
          
          // Structured data
          structuredData: Array.from(document.querySelectorAll('script[type=\"application/ld+json\"]'))
            .map(script => {
              try {
                return JSON.parse(script.textContent);
              } catch (e) {
                return null;
              }
            }).filter(Boolean),

          // OpenGraph data
          ogData: {
            title: document.querySelector('meta[property=\"og:title\"]')?.getAttribute('content') || '',
            description: document.querySelector('meta[property=\"og:description\"]')?.getAttribute('content') || '',
            image: document.querySelector('meta[property=\"og:image\"]')?.getAttribute('content') || '',
            type: document.querySelector('meta[property=\"og:type\"]')?.getAttribute('content') || ''
          },

          // Basic content metrics
          headings: {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim())
          },

          // Links
          links: {
            internal: Array.from(document.querySelectorAll('a[href]'))
              .map(a => a.href)
              .filter(href => href.includes(window.location.hostname)),
            external: Array.from(document.querySelectorAll('a[href]'))
              .map(a => a.href)
              .filter(href => !href.includes(window.location.hostname) && href.startsWith('http'))
          },

          // Images
          images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt || '',
            hasAlt: Boolean(img.alt)
          })),

          // Text content
          textContent: document.body.textContent || '',
          wordCount: (document.body.textContent || '').split(/\s+/).filter(word => word.length > 0).length
        };
      });

      return {
        ...pageData,
        statusCode: response.status(),
        loadTime: metrics.TaskDuration || 0,
        responseHeaders: response.headers(),
        timestamp: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CrawlerEngine };