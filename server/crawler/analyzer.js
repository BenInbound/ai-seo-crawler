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

    return {
      content: this.analyzeContentQuality($, pageData),
      eat: this.analyzeEAT($, pageData),
      technical: this.analyzeTechnical($, pageData),
      structuredData: this.analyzeStructuredData(pageData),
      aiReadiness: this.analyzeAIReadiness($, pageData)
    };
  }

  analyzeContentQuality($, pageData) {
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

  analyzeEAT($, pageData) {
    // Author information detection
    const authorInfo = this.detectAuthorInfo($);
    
    // About page detection
    const hasAboutPage = this.detectAboutPage($);
    
    // Contact information
    const contactInfo = this.detectContactInfo($);
    
    // External citations and references
    const citations = this.detectCitations($, pageData);
    
    // Content freshness
    const publishDate = this.extractPublishDate($);
    const lastUpdated = this.extractUpdateDate($);
    
    // Expertise indicators
    const expertiseIndicators = this.detectExpertiseIndicators($);

    return {
      authorInfo,
      hasAboutPage,
      contactInfo,
      citations,
      publishDate,
      lastUpdated,
      expertiseIndicators,
      trustSignals: this.detectTrustSignals($)
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

  analyzeAIReadiness($, pageData) {
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

  detectAboutPage($) {
    const aboutLinks = $('a[href*="about"], a[href*="About"]').length > 0;
    return aboutLinks;
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
      '[datetime]',
      '.published',
      '.date',
      '[class*="publish"]',
      '[property="article:published_time"]'
    ];

    for (const selector of dateSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        return element.attr('datetime') || element.text().trim();
      }
    }
    return null;
  }

  extractUpdateDate($) {
    const updateSelectors = [
      '[class*="updated"]',
      '[class*="modified"]',
      '[property="article:modified_time"]'
    ];

    for (const selector of updateSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        return element.attr('datetime') || element.text().trim();
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