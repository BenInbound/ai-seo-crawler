const puppeteer = require('puppeteer');
const { RobotsChecker } = require('../utils/robotsChecker');
const { ContentAnalyzer } = require('./analyzer');
const { ScoreCalculator } = require('./scorer');
const { saveCrawlResult } = require('../models/database');
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
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async analyzeDomain(domain) {
    let crawlResultId = null;
    
    try {
      // Normalize domain
      const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const baseUrl = `https://${normalizedDomain}`;

      console.log(`Starting analysis for domain: ${normalizedDomain}`);

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

        crawlResultId = await saveCrawlResult(failedData);
        
        return {
          id: crawlResultId,
          ...failedData,
          blocked: true
        };
      }

      // Use crawl delay from robots.txt if specified
      const crawlDelay = Math.max(robotsInfo.crawlDelay * 1000, this.crawlDelay);
      
      // Update user agent for this analysis
      this.userAgent = selectedUserAgent;

      // Initialize browser
      await this.initBrowser();

      // Crawl homepage
      console.log(`Crawling homepage with user agent: ${selectedUserAgent.substring(0, 50)}...`);
      const homepageData = await this.crawlPage(baseUrl, crawlDelay);
      console.log(`Page data extracted:`, {
        title: homepageData.title,
        wordCount: homepageData.wordCount,
        hasStructuredData: (homepageData.structuredData?.length || 0) > 0,
        statusCode: homepageData.statusCode
      });

      // Analyze content
      const analysis = await this.contentAnalyzer.analyzeContent(homepageData);
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
        url: baseUrl,
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

      // Save to database
      crawlResultId = await saveCrawlResult(resultData);

      console.log(`Analysis completed for ${normalizedDomain}, score: ${scores.overall}`);

      return {
        id: crawlResultId,
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

      crawlResultId = await saveCrawlResult(failedData);

      throw error;
    } finally {
      await this.closeBrowser();
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