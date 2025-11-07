const cheerio = require('cheerio');

class ContentAnalyzer {
  constructor() {
    this.aiOverviewKeywords = [
      'how to', 'what is', 'best way', 'steps to', 'guide', 'tutorial',
      'comparison', 'vs', 'versus', 'benefits', 'advantages', 'pros and cons',
      'top', 'best', 'worst', 'list', 'review', 'rating'
    ];
  }

  async analyzeContent(pageData) {
    const $ = cheerio.load(pageData.html);

    // Detect page type for context-aware analysis
    const pageType = this.detectPageType($, pageData);

    return {
      pageType,
      content: this.analyzeContentQuality($, pageData, pageType),
      eat: this.analyzeEAT($, pageData, pageType),
      technical: this.analyzeTechnical($, pageData),
      structuredData: this.analyzeStructuredData(pageData),
      aiReadiness: this.analyzeAIReadiness($, pageData, pageType)
    };
  }

  analyzeContentQuality($, pageData, pageType = 'page') {
    const textContent = pageData.textContent || '';
    const wordCount = pageData.wordCount || 0;
    
    // Check if first paragraph answers questions directly
    const firstParagraph = $('p').first().text().trim();
    const hasDirectAnswer = this.hasDirectAnswer(firstParagraph);

    // Analyze content format
    const contentFormat = this.identifyContentFormat($, textContent);

    // Check for factual content markers
    const hasDataBackup = this.hasFactualBackup(textContent);

    // Analyze heading structure
    const headingAnalysis = this.analyzeHeadings(pageData.headings);

    // Check for FAQ patterns
    const faqAnalysis = this.analyzeFAQ($);

    // Content freshness indicators
    const freshnessIndicators = this.analyzeFreshness($);

    return {
      wordCount,
      hasDirectAnswer,
      contentFormat,
      hasDataBackup,
      headingAnalysis,
      faqAnalysis,
      freshnessIndicators,
      readabilityScore: this.calculateReadabilityScore(textContent),
      questionAnsweringScore: this.calculateQuestionAnsweringScore($, textContent)
    };
  }

  analyzeEAT($, pageData, pageType = 'page') {
    // Author information detection (only relevant for blog/article pages)
    const authorInfo = this.detectAuthorInfo($);
    
    // Contact information
    const contactInfo = this.detectContactInfo($);
    
    // External citations and references
    const citations = this.detectCitations($, pageData);
    
    // Content freshness (mainly for blog/news content)
    const publishDate = this.extractPublishDate($);
    const lastUpdated = this.extractUpdateDate($);
    
    // Expertise indicators
    const expertiseIndicators = this.detectExpertiseIndicators($);

    // Trust signals
    const trustSignals = this.detectTrustSignals($);

    // Page-specific trust factors
    const pageSpecificFactors = this.analyzePageSpecificTrust($, pageType);

    return {
      pageType,
      authorInfo,
      contactInfo,
      citations,
      publishDate,
      lastUpdated,
      expertiseIndicators,
      trustSignals,
      pageSpecificFactors
    };
  }

  analyzeTechnical($, pageData) {
    // Mobile optimization
    const mobileOptimization = this.analyzeMobileOptimization($);
    
    // Page speed factors
    const speedFactors = this.analyzeSpeedFactors(pageData);
    
    // HTTPS check
    const isHTTPS = pageData.url?.startsWith('https://') || false;
    
    // Meta tags analysis
    const metaAnalysis = this.analyzeMetaTags($, pageData);
    
    // Internal linking
    const internalLinking = this.analyzeInternalLinking(pageData.links);
    
    // Image optimization
    const imageOptimization = this.analyzeImageOptimization(pageData.images);

    return {
      mobileOptimization,
      speedFactors,
      isHTTPS,
      metaAnalysis,
      internalLinking,
      imageOptimization,
      hasRobotsMeta: this.hasRobotsMetaTag($),
      canonicalURL: this.getCanonicalURL($)
    };
  }

  analyzeStructuredData(pageData) {
    const structuredData = pageData.structuredData || [];
    
    // Identify schema types
    const schemaTypes = this.identifySchemaTypes(structuredData);
    
    // FAQ schema analysis
    const faqSchema = this.analyzeFAQSchema(structuredData);
    
    // HowTo schema analysis
    const howToSchema = this.analyzeHowToSchema(structuredData);
    
    // Article schema analysis
    const articleSchema = this.analyzeArticleSchema(structuredData);
    
    // Breadcrumb schema
    const breadcrumbSchema = this.analyzeBreadcrumbSchema(structuredData);

    return {
      hasStructuredData: structuredData.length > 0,
      schemaTypes,
      faqSchema,
      howToSchema,
      articleSchema,
      breadcrumbSchema,
      totalSchemaCount: structuredData.length
    };
  }

  analyzeAIReadiness($, pageData, pageType = 'page') {
    const textContent = pageData.textContent || '';
    
    // Check for AI Overview optimization patterns
    const aiOverviewOptimization = this.checkAIOverviewOptimization(textContent);
    
    // Listicle detection
    const isListicle = this.detectListicle($, textContent);
    
    // Comparison content detection
    const hasComparisons = this.detectComparisons(textContent);
    
    // Answer density (how many questions are answered)
    const answerDensity = this.calculateAnswerDensity(textContent);
    
    // Featured snippet optimization
    const featuredSnippetOptimization = this.analyzeFeaturedSnippetOptimization($);

    return {
      aiOverviewOptimization,
      isListicle,
      hasComparisons,
      answerDensity,
      featuredSnippetOptimization,
      conversationalTone: this.detectConversationalTone(textContent)
    };
  }

  // Page Type Detection
  // Returns one of 6 standard page types: homepage, product, solution, blog, resource, conversion
  // Based on FR-034 (page-type-aware scoring)
  detectPageType($, pageData) {
    const url = pageData.url || '';
    const title = (pageData.title || '').toLowerCase();
    const textContent = (pageData.textContent || '').toLowerCase();

    // Check if it's homepage (root or minimal path)
    const urlPath = new URL(url).pathname;
    if (urlPath === '/' || urlPath.length <= 3) {
      return 'homepage';
    }

    // URL-based detection patterns
    const urlPatterns = {
      blog: ['/blog/', '/blogg/', '/article/', '/post/', '/news/'],
      product: ['/product/', '/produkt/', '/shop/', '/buy/', '/item/'],
      solution: ['/solution/', '/løsning/', '/service/', '/tjeneste/', '/feature/'],
      resource: ['/resource/', '/guide/', '/tutorial/', '/documentation/', '/docs/', '/help/', '/support/', '/faq/'],
      conversion: ['/pricing/', '/price/', '/contact/', '/kontakt/', '/signup/', '/register/', '/demo/', '/trial/', '/get-started/']
    };

    for (const [type, patterns] of Object.entries(urlPatterns)) {
      if (patterns.some(pattern => url.includes(pattern))) {
        return type;
      }
    }

    // Content-based detection with priority order

    // 1. Blog/Article indicators (highest priority for content pages)
    const hasBlogIndicators = [
      this.detectAuthorInfo($).hasAuthor,
      this.extractPublishDate($) !== null,
      /\b(publisert|published|forfatter|author|av\s+[A-Z]|written by|posted by)/i.test(textContent),
      $('[class*="author"], [class*="byline"], [class*="date"], [class*="publish"]').length > 0,
      $('article').length > 0
    ].filter(Boolean).length >= 2;

    if (hasBlogIndicators) {
      return 'blog';
    }

    // 2. Conversion page indicators (forms, CTAs, pricing)
    const hasConversionIndicators = [
      $('form[class*="contact"], form[class*="signup"], form[class*="register"]').length > 0,
      /\b(get started|sign up|free trial|request demo|contact us|book a demo|start free|subscribe)\b/i.test(textContent),
      $('.price, .pricing, [class*="price"], [class*="plan"]').length > 0,
      $('[class*="cta"], [class*="call-to-action"]').length > 0,
      /\b(kontakt oss|få tilbud|bestill|order now|buy now|purchase)\b/i.test(textContent)
    ].filter(Boolean).length >= 2;

    if (hasConversionIndicators) {
      return 'conversion';
    }

    // 3. Product page indicators
    const hasProductIndicators = [
      /\b(produkt|product|buy|kjøp|price|pris|add to cart|legg i handlekurv|specifications|specs)\b/i.test(textContent),
      $('.price, .pricing, [class*="price"]').length > 0,
      $('[class*="product"], [class*="item"]').length > 0,
      /\b(features|benefits|fordeler|technical details|dimensions)\b/i.test(textContent),
      $('button[class*="buy"], button[class*="cart"], button[class*="purchase"]').length > 0
    ].filter(Boolean).length >= 2;

    if (hasProductIndicators) {
      return 'product';
    }

    // 4. Solution page indicators
    const hasSolutionIndicators = [
      /\b(solution|løsning|service|tjeneste|how we|hvordan vi|our approach|vår tilnærming)\b/i.test(textContent),
      /\b(problem|utfordring|challenge|need|behov|pain point)\b/i.test(textContent),
      /\b(benefit|fordel|advantage|result|resultat|outcome)\b/i.test(textContent),
      title.includes('solution') || title.includes('løsning') || title.includes('service')
    ].filter(Boolean).length >= 2;

    if (hasSolutionIndicators) {
      return 'solution';
    }

    // 5. Resource page indicators (guides, tutorials, documentation)
    const hasResourceIndicators = [
      /\b(guide|veiledning|tutorial|how to|hvordan|documentation|docs|learn|lær|reference)\b/i.test(textContent),
      /\b(step|steg|instruction|instruction|tips|best practices|examples|eksempler)\b/i.test(textContent),
      $('h2, h3, h4').filter((i, el) => /\?/.test($(el).text())).length >= 3, // FAQ-style
      this.analyzeFAQ($).hasFAQSection,
      /\b(download|last ned|pdf|template|mal|worksheet|checklist)\b/i.test(textContent)
    ].filter(Boolean).length >= 2;

    if (hasResourceIndicators) {
      return 'resource';
    }

    // 6. Homepage indicators (fallback before default)
    const hasHomepageIndicators = [
      /\b(velkommen|welcome|hjem|home|hovedside)\b/i.test(textContent),
      $('nav, [role="navigation"]').length > 0,
      $('.hero, [class*="hero"], [class*="banner"]').length > 0,
      $('header').length > 0 && $('footer').length > 0,
      $('section').length >= 3 // Multiple sections indicate landing page
    ].filter(Boolean).length >= 3;

    if (hasHomepageIndicators) {
      return 'homepage';
    }

    // Default fallback: classify as resource (most generic type)
    return 'resource';
  }

  // Helper methods
  hasDirectAnswer(firstParagraph) {
    const questionWords = ['how', 'what', 'why', 'when', 'where', 'who'];
    const answerPatterns = [
      /^(To|In order to|The best way to)/i,
      /^([A-Z][^.!?]*\s+(is|are|means|refers to))/,
      /^(Here's how|Follow these steps|The answer is)/i
    ];

    return answerPatterns.some(pattern => pattern.test(firstParagraph)) ||
           (firstParagraph.length > 50 && firstParagraph.includes('answer'));
  }

  identifyContentFormat($, textContent) {
    const listItems = $('ol li, ul li').length;
    const hasSteps = /step \d+|first,|second,|third,|next,|finally,/gi.test(textContent);
    const hasBulletPoints = listItems > 3;
    
    if (hasSteps && hasBulletPoints) return 'step-by-step guide';
    if (listItems > 5) return 'listicle';
    if (/vs\.|versus|compared to|comparison/gi.test(textContent)) return 'comparison';
    if (/review|rating|score|pros and cons/gi.test(textContent)) return 'review';
    return 'article';
  }

  hasFactualBackup(textContent) {
    const factualIndicators = [
      /according to/gi,
      /study shows/gi,
      /research indicates/gi,
      /data from/gi,
      /statistics/gi,
      /\d+%/g,
      /survey/gi
    ];

    return factualIndicators.some(pattern => pattern.test(textContent));
  }

  analyzeHeadings(headings) {
    const h1Count = headings.h1?.length || 0;
    const h2Count = headings.h2?.length || 0;
    const h3Count = headings.h3?.length || 0;

    return {
      hasH1: h1Count > 0,
      h1Count,
      h2Count,
      h3Count,
      properHierarchy: h1Count === 1 && h2Count > 0,
      questionHeadings: this.countQuestionHeadings(headings)
    };
  }

  countQuestionHeadings(headings) {
    const allHeadings = [
      ...(headings.h1 || []),
      ...(headings.h2 || []),
      ...(headings.h3 || [])
    ];

    return allHeadings.filter(heading => 
      /^(how|what|why|when|where|who|which)/i.test(heading.trim()) ||
      heading.includes('?')
    ).length;
  }

  analyzeFAQ($) {
    const faqElements = $(
      '[class*="faq"], [id*="faq"], [class*="question"], [id*="question"]'
    ).length;
    
    const questionElements = $('h2, h3, h4').filter((i, el) => {
      const text = $(el).text();
      return /^(how|what|why|when|where|who|which)/i.test(text) || text.includes('?');
    }).length;

    return {
      hasFAQSection: faqElements > 0,
      questionCount: questionElements,
      faqElementCount: faqElements
    };
  }

  analyzeFreshness($) {
    const publishedDate = this.extractPublishDate($);
    const updatedDate = this.extractUpdateDate($);
    const currentYear = new Date().getFullYear().toString();
    
    return {
      hasPublishDate: !!publishedDate,
      hasUpdateDate: !!updatedDate,
      publishedDate,
      updatedDate,
      mentionsCurrentYear: $('body').text().includes(currentYear)
    };
  }

  calculateReadabilityScore(text) {
    if (!text || text.length === 0) return 0;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    
    // Simple readability score (lower is better, scale 0-100)
    if (avgWordsPerSentence < 15) return 85;
    if (avgWordsPerSentence < 20) return 75;
    if (avgWordsPerSentence < 25) return 65;
    return 45;
  }

  calculateQuestionAnsweringScore($, text) {
    const questions = (text.match(/\?/g) || []).length;
    const answers = $('p').length; // Simplistic measure
    
    if (questions === 0) return text.length > 500 ? 70 : 40;
    
    const answerRatio = answers / questions;
    return Math.min(100, answerRatio * 80);
  }

  detectAuthorInfo($) {
    const authorSelectors = [
      '[rel="author"]',
      '.author',
      '.byline',
      '[class*="author"]',
      '[id*="author"]',
      '.post-author',
      '.article-author',
      '.writer',
      '[class*="writer"]',
      '.posted-by',
      '.written-by'
    ];

    // Enhanced author detection with text patterns
    const authorTextPatterns = [
      /\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,        // "By John Doe"
      /\bav\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,        // "Av John Doe" (Norwegian)
      /\bforfatter:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, // "Forfatter: John Doe"
      /\bskrevet\s+av\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, // "Skrevet av John Doe"
      /\bauthor:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,  // "Author: John Doe"
      /\bwritten\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i // "Written by John Doe"
    ];

    const hasAuthor = authorSelectors.some(selector => $(selector).length > 0);
    const authorBio = $('.author-bio, .author-description, [class*="author-bio"]').length > 0;

    // Check for author in text content
    const bodyText = $('body').text();
    const textAuthorMatch = authorTextPatterns.some(pattern => pattern.test(bodyText));

    return {
      hasAuthor: hasAuthor || textAuthorMatch,
      hasAuthorBio: authorBio,
      authorElements: authorSelectors.filter(selector => $(selector).length > 0),
      detectedFromText: textAuthorMatch
    };
  }


  detectContactInfo($) {
    const contactPatterns = [
      /contact/i,
      /email/i,
      /phone/i,
      /address/i,
      /@[\w\.-]+\.\w+/,
      /\+?\d{1,4}[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/
    ];

    const text = $('body').text();
    const hasContact = contactPatterns.some(pattern => pattern.test(text));
    const hasContactPage = $('a[href*="contact"]').length > 0;

    return {
      hasContact,
      hasContactPage
    };
  }

  detectCitations($, pageData) {
    const externalLinks = pageData.links?.external || [];
    const authorityDomains = [
      'wikipedia.org', 'gov', 'edu', 'nih.gov', 'cdc.gov',
      'who.int', 'nature.com', 'science.org'
    ];

    const authorityCitations = externalLinks.filter(link =>
      authorityDomains.some(domain => link.includes(domain))
    );

    return {
      externalLinkCount: externalLinks.length,
      authorityCitations: authorityCitations.length,
      hasReferences: $('[class*="reference"], [class*="citation"]').length > 0
    };
  }

  extractPublishDate($) {
    const dateSelectors = [
      // Standard HTML5 and schema markup
      'time[datetime]',
      '[datetime]',
      '[property="article:published_time"]',
      '[name="article:published_time"]',
      '[property="datePublished"]',
      
      // English selectors
      '.published',
      '.date',
      '.post-date',
      '.entry-date',
      '.publish-date',
      '[class*="publish"]',
      '[class*="date"]',
      '[id*="date"]',
      
      // Norwegian selectors
      '.dato',
      '.publisert',
      '.opprettet',
      '.blogg-dato',
      '.artikkel-dato',
      '[class*="dato"]',
      '[class*="publiser"]',
      '[id*="dato"]',
      
      // Common blog/CMS patterns
      '.byline .date',
      '.meta .date',
      '.post-meta .date',
      '.article-meta .date',
      'header .date',
      '.entry-meta time',
      '.post-info .date'
    ];

    // First try structured selectors
    for (const selector of dateSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const dateValue = element.attr('datetime') || 
                         element.attr('content') || 
                         element.text().trim();
        if (dateValue && dateValue.length > 4) {
          return dateValue;
        }
      }
    }

    // Fallback: search for date patterns in text
    const datePatterns = [
      // Norwegian date patterns
      /(\d{1,2})\.\s?(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s?(\d{4})/i,
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
      // English patterns
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
      // ISO patterns
      /\d{4}-\d{2}-\d{2}/,
      // General patterns
      /\d{1,2}\/\d{1,2}\/\d{4}/
    ];

    const bodyText = $('body').text();
    for (const pattern of datePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  extractUpdateDate($) {
    const updateSelectors = [
      // Standard schema markup
      '[property="article:modified_time"]',
      '[name="article:modified_time"]',
      '[property="dateModified"]',
      'time[datetime][class*="updated"]',
      'time[datetime][class*="modified"]',
      
      // English selectors
      '[class*="updated"]',
      '[class*="modified"]',
      '[class*="last-modified"]',
      '.last-updated',
      '.modified-date',
      '.update-date',
      
      // Norwegian selectors
      '[class*="oppdatert"]',
      '[class*="endret"]',
      '[class*="sist-endret"]',
      '.oppdatert',
      '.endret',
      '.sist-endret',
      '.sist-oppdatert',
      
      // Common patterns
      '.meta .updated',
      '.post-meta .updated',
      '.article-meta .updated'
    ];

    for (const selector of updateSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const dateValue = element.attr('datetime') || 
                         element.attr('content') || 
                         element.text().trim();
        if (dateValue && dateValue.length > 4) {
          return dateValue;
        }
      }
    }

    // Look for update text patterns
    const updatePatterns = [
      /oppdatert[:\s]*(\d{1,2})\.\s?(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s?(\d{4})/i,
      /sist endret[:\s]*(\d{1,2})\.\s?(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s?(\d{4})/i,
      /updated[:\s]*(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
      /last modified[:\s]*(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i
    ];

    const bodyText = $('body').text();
    for (const pattern of updatePatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  detectExpertiseIndicators($) {
    const expertiseKeywords = [
      'certified', 'expert', 'specialist', 'professional',
      'years of experience', 'degree', 'qualification'
    ];

    const text = $('body').text().toLowerCase();
    const matchedIndicators = expertiseKeywords.filter(keyword =>
      text.includes(keyword)
    );

    return {
      count: matchedIndicators.length,
      indicators: matchedIndicators
    };
  }

  detectTrustSignals($) {
    const trustSignals = [];

    if ($('[src*="ssl"], [href*="https"]').length > 0) trustSignals.push('SSL certificate');
    if ($('.testimonial, [class*="review"]').length > 0) trustSignals.push('testimonials');
    if ($('[class*="award"], [class*="certification"]').length > 0) trustSignals.push('certifications');
    if ($('footer').text().toLowerCase().includes('privacy')) trustSignals.push('privacy policy');

    return trustSignals;
  }

  analyzePageSpecificTrust($, pageType) {
    const factors = {
      type: pageType,
      score: 0,
      factors: []
    };

    switch (pageType) {
      case 'homepage':
        // Homepage should show company info, navigation, clear value prop
        if ($('nav, [role="navigation"]').length > 0) {
          factors.factors.push('clear navigation');
          factors.score += 20;
        }
        if ($('.hero, [class*="hero"], [class*="value"]').length > 0) {
          factors.factors.push('value proposition');
          factors.score += 15;
        }
        if ($('footer').text().length > 100) {
          factors.factors.push('comprehensive footer');
          factors.score += 10;
        }
        break;

      case 'about':
        // About pages should have team info, company history, mission
        const aboutText = $('body').text().toLowerCase();
        if (/\b(team|ansatte|grunnlagt|founded|historie|history)\b/.test(aboutText)) {
          factors.factors.push('company background');
          factors.score += 25;
        }
        if (/\b(mission|visjon|vision|values|verdier)\b/.test(aboutText)) {
          factors.factors.push('mission/vision');
          factors.score += 20;
        }
        if ($('img[alt*="team"], img[alt*="person"], .team').length > 0) {
          factors.factors.push('team photos');
          factors.score += 15;
        }
        break;

      case 'contact':
        // Contact pages should have multiple contact methods, location, hours
        const contactText = $('body').text();
        if (/\+?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/.test(contactText)) {
          factors.factors.push('phone number');
          factors.score += 20;
        }
        if (/@[\w\.-]+\.\w+/.test(contactText)) {
          factors.factors.push('email address');
          factors.score += 15;
        }
        if ($('form').length > 0) {
          factors.factors.push('contact form');
          factors.score += 20;
        }
        if (/\b(addresse|address|location|lokasjon)\b/i.test(contactText)) {
          factors.factors.push('physical address');
          factors.score += 15;
        }
        break;

      case 'service':
        // Service pages should have clear benefits, pricing, social proof
        if ($('.price, .pricing, [class*="price"]').length > 0) {
          factors.factors.push('pricing information');
          factors.score += 20;
        }
        if ($('.testimonial, [class*="review"], [class*="testimonial"]').length > 0) {
          factors.factors.push('customer testimonials');
          factors.score += 25;
        }
        if (/\b(garantie|guarantee|refund|pengene tilbake)\b/i.test($('body').text())) {
          factors.factors.push('guarantee/refund policy');
          factors.score += 15;
        }
        break;

      case 'blog':
        // Blog pages need author, date, category, related content
        // These are handled in regular E-A-T analysis
        factors.score = 100; // Full score since blog-specific factors are handled elsewhere
        factors.factors.push('editorial content');
        break;

      case 'faq':
        // FAQ pages should have comprehensive Q&A, search, categories
        const questionCount = $('h2, h3, h4').filter((i, el) => /\?/.test($(el).text())).length;
        if (questionCount >= 5) {
          factors.factors.push(`${questionCount} questions answered`);
          factors.score += Math.min(40, questionCount * 5);
        }
        if ($('[type="search"], .search').length > 0) {
          factors.factors.push('search functionality');
          factors.score += 20;
        }
        break;

      default:
        // Generic page - basic trust signals
        factors.score = 50;
        factors.factors.push('standard page');
    }

    return factors;
  }

  analyzeMobileOptimization($) {
    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const hasViewport = viewport.includes('width=device-width');
    const responsiveImages = $('img[srcset]').length;
    const totalImages = $('img').length;

    return {
      hasViewportMeta: hasViewport,
      responsiveImageRatio: totalImages > 0 ? responsiveImages / totalImages : 0,
      hasMobileCSS: $('link[media*="screen"]').length > 0
    };
  }

  analyzeSpeedFactors(pageData) {
    return {
      loadTime: pageData.loadTime || 0,
      imageCount: pageData.images?.length || 0,
      hasLazyLoading: false // Would need more sophisticated detection
    };
  }

  analyzeMetaTags($, pageData) {
    return {
      hasMetaDescription: !!pageData.metaDescription,
      metaDescriptionLength: pageData.metaDescription?.length || 0,
      hasOGTags: !!pageData.ogData?.title,
      titleLength: pageData.title?.length || 0
    };
  }

  analyzeInternalLinking(links) {
    const internal = links?.internal || [];
    return {
      internalLinkCount: internal.length,
      hasNavigation: internal.length > 5
    };
  }

  analyzeImageOptimization(images) {
    if (!images || images.length === 0) {
      return { imagesWithAlt: 100, totalImages: 0 };
    }

    const imagesWithAlt = images.filter(img => img.hasAlt).length;
    return {
      imagesWithAlt: (imagesWithAlt / images.length) * 100,
      totalImages: images.length
    };
  }

  hasRobotsMetaTag($) {
    return $('meta[name="robots"]').length > 0;
  }

  getCanonicalURL($) {
    return $('link[rel="canonical"]').attr('href') || null;
  }

  identifySchemaTypes(structuredData) {
    const types = [];
    
    structuredData.forEach(data => {
      if (data['@type']) {
        types.push(data['@type']);
      }
    });

    return [...new Set(types)];
  }

  analyzeFAQSchema(structuredData) {
    const faqSchema = structuredData.find(data => 
      data['@type'] === 'FAQPage' || 
      (Array.isArray(data['@type']) && data['@type'].includes('FAQPage'))
    );

    return {
      hasFAQSchema: !!faqSchema,
      questionCount: faqSchema?.mainEntity?.length || 0
    };
  }

  analyzeHowToSchema(structuredData) {
    const howToSchema = structuredData.find(data => data['@type'] === 'HowTo');
    
    return {
      hasHowToSchema: !!howToSchema,
      stepCount: howToSchema?.step?.length || 0
    };
  }

  analyzeArticleSchema(structuredData) {
    const articleSchema = structuredData.find(data => 
      ['Article', 'BlogPosting', 'NewsArticle'].includes(data['@type'])
    );

    return {
      hasArticleSchema: !!articleSchema,
      hasAuthor: !!(articleSchema?.author),
      hasDatePublished: !!(articleSchema?.datePublished)
    };
  }

  analyzeBreadcrumbSchema(structuredData) {
    const breadcrumbSchema = structuredData.find(data => 
      data['@type'] === 'BreadcrumbList'
    );

    return {
      hasBreadcrumbSchema: !!breadcrumbSchema,
      itemCount: breadcrumbSchema?.itemListElement?.length || 0
    };
  }

  checkAIOverviewOptimization(text) {
    const aiOptimizedPatterns = this.aiOverviewKeywords.filter(keyword =>
      text.toLowerCase().includes(keyword)
    );

    return {
      matchedKeywords: aiOptimizedPatterns,
      score: Math.min(100, (aiOptimizedPatterns.length / this.aiOverviewKeywords.length) * 100)
    };
  }

  detectListicle($, text) {
    const numberedLists = $('ol li').length;
    const bulletLists = $('ul li').length;
    const hasNumbers = /\d+\./g.test(text);
    
    return {
      isListicle: numberedLists > 3 || bulletLists > 5,
      listItemCount: numberedLists + bulletLists,
      hasNumberedPoints: hasNumbers
    };
  }

  detectComparisons(text) {
    const comparisonWords = ['vs', 'versus', 'compared to', 'difference between', 'better than'];
    const matches = comparisonWords.filter(word => 
      text.toLowerCase().includes(word)
    );

    return {
      hasComparisons: matches.length > 0,
      comparisonWords: matches
    };
  }

  calculateAnswerDensity(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const answerSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return lower.includes('answer') || 
             lower.includes('solution') || 
             lower.includes('result') ||
             /^(to |the |this |here)/i.test(sentence.trim());
    });

    return sentences.length > 0 ? (answerSentences.length / sentences.length) * 100 : 0;
  }

  analyzeFeaturedSnippetOptimization($) {
    const hasList = $('ol, ul').length > 0;
    const hasTable = $('table').length > 0;
    const hasDefinition = $('p').first().text().length > 50;

    return {
      hasList,
      hasTable,
      hasDefinition,
      optimizationScore: [hasList, hasTable, hasDefinition].filter(Boolean).length * 33.33
    };
  }

  detectConversationalTone(text) {
    const conversationalWords = ['you', 'your', 'we', 'our', 'let\'s', 'here\'s'];
    const wordCount = text.split(/\s+/).length;
    const conversationalCount = conversationalWords.reduce((count, word) => {
      return count + (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);

    return wordCount > 0 ? (conversationalCount / wordCount) * 100 : 0;
  }
}

module.exports = { ContentAnalyzer };