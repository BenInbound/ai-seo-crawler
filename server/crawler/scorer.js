class ScoreCalculator {
  constructor() {
    this.weights = {
      content: 0.25,
      eat: 0.25,
      technical: 0.25,
      structuredData: 0.25
    };
  }

  calculateScores(analysis) {
    const contentScore = this.calculateContentScore(analysis.content, analysis.aiReadiness);
    const eatScore = this.calculateEATScore(analysis.eat);
    const technicalScore = this.calculateTechnicalScore(analysis.technical);
    const structuredDataScore = this.calculateStructuredDataScore(analysis.structuredData);

    const overall = Math.round(
      contentScore * this.weights.content +
      eatScore * this.weights.eat +
      technicalScore * this.weights.technical +
      structuredDataScore * this.weights.structuredData
    );

    return {
      overall,
      content: Math.round(contentScore),
      eat: Math.round(eatScore),
      technical: Math.round(technicalScore),
      structuredData: Math.round(structuredDataScore)
    };
  }

  calculateContentScore(content, aiReadiness) {
    let score = 0;

    // Word count (10 points)
    if (content.wordCount > 1000) score += 10;
    else if (content.wordCount > 500) score += 7;
    else if (content.wordCount > 300) score += 4;

    // Direct answer in first paragraph (15 points)
    if (content.hasDirectAnswer) score += 15;

    // Content format optimization (10 points)
    const formatScores = {
      'listicle': 10,
      'step-by-step guide': 9,
      'comparison': 8,
      'review': 7,
      'article': 5
    };
    score += formatScores[content.contentFormat] || 3;

    // Factual backup (10 points)
    if (content.hasDataBackup) score += 10;

    // Heading structure (10 points)
    if (content.headingAnalysis.hasH1 && content.headingAnalysis.properHierarchy) {
      score += 8;
    } else if (content.headingAnalysis.hasH1) {
      score += 5;
    }
    score += Math.min(2, content.headingAnalysis.questionHeadings);

    // FAQ optimization (10 points)
    if (content.faqAnalysis.hasFAQSection) score += 5;
    score += Math.min(5, content.faqAnalysis.questionCount);

    // Readability (10 points)
    score += Math.min(10, content.readabilityScore / 10);

    // Question answering capability (10 points)
    score += Math.min(10, content.questionAnsweringScore / 10);

    // AI readiness bonus (15 points)
    score += Math.min(10, aiReadiness.aiOverviewOptimization.score / 10);
    if (aiReadiness.isListicle.isListicle) score += 3;
    if (aiReadiness.hasComparisons.hasComparisons) score += 2;

    return Math.min(100, score);
  }

  calculateEATScore(eat) {
    const pageType = eat.pageType || 'page';
    let score = 0;

    // Page-type-specific scoring
    switch (pageType) {
      case 'blog':
        score = this.calculateBlogEATScore(eat);
        break;
      case 'homepage':
        score = this.calculateHomepageEATScore(eat);
        break;
      case 'about':
        score = this.calculateAboutEATScore(eat);
        break;
      case 'contact':
        score = this.calculateContactEATScore(eat);
        break;
      case 'service':
        score = this.calculateServiceEATScore(eat);
        break;
      case 'faq':
        score = this.calculateFAQEATScore(eat);
        break;
      default:
        score = this.calculateGenericEATScore(eat);
    }

    return Math.min(100, score);
  }

  calculateBlogEATScore(eat) {
    let score = 0;

    // Author information (30 points) - Critical for blog content
    if (eat.authorInfo.hasAuthor) score += 20;
    if (eat.authorInfo.hasAuthorBio) score += 10;

    // Contact information (10 points)
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 10;

    // Citations and references (25 points) - Important for credibility
    if (eat.citations.authorityCitations > 0) {
      score += Math.min(20, eat.citations.authorityCitations * 4);
    }
    if (eat.citations.hasReferences) score += 5;

    // Content freshness (20 points) - Very important for blogs
    if (eat.publishDate) score += 10;
    if (eat.lastUpdated) score += 10;

    // Expertise indicators (10 points)
    score += Math.min(10, eat.expertiseIndicators.count * 2);

    // Trust signals (5 points)
    score += Math.min(5, eat.trustSignals.length * 1);

    return score;
  }

  calculateHomepageEATScore(eat) {
    let score = 0;

    // Author info not relevant for homepage (0 points)
    
    // Contact information (25 points) - Very important for homepage
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 25;

    // Citations less important (10 points)
    if (eat.citations.authorityCitations > 0) score += 10;

    // Freshness not critical for homepage (5 points)
    if (eat.lastUpdated) score += 5;

    // Expertise indicators (15 points)
    score += Math.min(15, eat.expertiseIndicators.count * 3);

    // Trust signals (20 points) - Very important for homepage
    score += Math.min(20, eat.trustSignals.length * 4);

    // Page-specific factors (25 points)
    if (eat.pageSpecificFactors) {
      score += Math.min(25, eat.pageSpecificFactors.score * 0.25);
    }

    return score;
  }

  calculateAboutEATScore(eat) {
    let score = 0;

    // Author info not critical (5 points)
    if (eat.authorInfo.hasAuthor) score += 5;

    // Contact information (20 points)
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 20;

    // Citations less important (10 points)
    if (eat.citations.authorityCitations > 0) score += 10;

    // Freshness not critical (5 points)
    if (eat.lastUpdated) score += 5;

    // Expertise indicators (20 points) - Important for about pages
    score += Math.min(20, eat.expertiseIndicators.count * 4);

    // Trust signals (15 points)
    score += Math.min(15, eat.trustSignals.length * 3);

    // Page-specific factors (25 points) - Company background, mission, team
    if (eat.pageSpecificFactors) {
      score += Math.min(25, eat.pageSpecificFactors.score * 0.25);
    }

    return score;
  }

  calculateContactEATScore(eat) {
    let score = 0;

    // Author info not relevant (0 points)
    
    // Contact information (40 points) - Most important for contact pages
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 40;

    // Citations not relevant (0 points)

    // Freshness not critical (5 points)
    if (eat.lastUpdated) score += 5;

    // Expertise indicators (10 points)
    score += Math.min(10, eat.expertiseIndicators.count * 2);

    // Trust signals (15 points)
    score += Math.min(15, eat.trustSignals.length * 3);

    // Page-specific factors (30 points) - Phone, email, address, form
    if (eat.pageSpecificFactors) {
      score += Math.min(30, eat.pageSpecificFactors.score * 0.3);
    }

    return score;
  }

  calculateServiceEATScore(eat) {
    let score = 0;

    // Author info less important (5 points)
    if (eat.authorInfo.hasAuthor) score += 5;

    // Contact information (20 points)
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 20;

    // Citations somewhat important (15 points)
    if (eat.citations.authorityCitations > 0) score += 15;

    // Freshness somewhat important (10 points)
    if (eat.lastUpdated) score += 10;

    // Expertise indicators (20 points)
    score += Math.min(20, eat.expertiseIndicators.count * 4);

    // Trust signals (15 points)
    score += Math.min(15, eat.trustSignals.length * 3);

    // Page-specific factors (15 points) - Pricing, testimonials, guarantees
    if (eat.pageSpecificFactors) {
      score += Math.min(15, eat.pageSpecificFactors.score * 0.15);
    }

    return score;
  }

  calculateFAQEATScore(eat) {
    let score = 0;

    // Author info not critical (0 points)
    
    // Contact information (15 points)
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 15;

    // Citations somewhat important (15 points)
    if (eat.citations.authorityCitations > 0) score += 15;

    // Freshness somewhat important (10 points)
    if (eat.lastUpdated) score += 10;

    // Expertise indicators (25 points) - Important for FAQ credibility
    score += Math.min(25, eat.expertiseIndicators.count * 5);

    // Trust signals (15 points)
    score += Math.min(15, eat.trustSignals.length * 3);

    // Page-specific factors (20 points) - Number of questions, search functionality
    if (eat.pageSpecificFactors) {
      score += Math.min(20, eat.pageSpecificFactors.score * 0.2);
    }

    return score;
  }

  calculateGenericEATScore(eat) {
    let score = 0;

    // Balanced scoring for unknown page types
    if (eat.authorInfo.hasAuthor) score += 10;
    if (eat.authorInfo.hasAuthorBio) score += 5;
    if (eat.contactInfo.hasContact || eat.contactInfo.hasContactPage) score += 15;
    if (eat.citations.authorityCitations > 0) score += 10;
    if (eat.publishDate) score += 5;
    if (eat.lastUpdated) score += 5;
    score += Math.min(15, eat.expertiseIndicators.count * 3);
    score += Math.min(15, eat.trustSignals.length * 3);
    
    if (eat.pageSpecificFactors) {
      score += Math.min(20, eat.pageSpecificFactors.score * 0.2);
    }

    return score;
  }

  calculateTechnicalScore(technical) {
    let score = 0;

    // HTTPS (15 points)
    if (technical.isHTTPS) score += 15;

    // Mobile optimization (25 points)
    if (technical.mobileOptimization.hasViewportMeta) score += 10;
    score += Math.min(10, technical.mobileOptimization.responsiveImageRatio * 10);
    if (technical.mobileOptimization.hasMobileCSS) score += 5;

    // Page speed (20 points)
    const loadTime = technical.speedFactors.loadTime;
    if (loadTime < 2000) score += 20;
    else if (loadTime < 3000) score += 15;
    else if (loadTime < 5000) score += 10;
    else score += 5;

    // Meta tags (15 points)
    if (technical.metaAnalysis.hasMetaDescription) {
      const descLength = technical.metaAnalysis.metaDescriptionLength;
      if (descLength >= 120 && descLength <= 160) score += 8;
      else if (descLength >= 100 && descLength <= 180) score += 5;
      else if (descLength > 0) score += 3;
    }
    
    const titleLength = technical.metaAnalysis.titleLength;
    if (titleLength >= 30 && titleLength <= 60) score += 7;
    else if (titleLength > 0) score += 4;

    // Internal linking (10 points)
    if (technical.internalLinking.hasNavigation) score += 5;
    score += Math.min(5, technical.internalLinking.internalLinkCount / 5);

    // Image optimization (10 points)
    if (technical.imageOptimization.totalImages === 0) {
      score += 5; // No images is better than unoptimized images
    } else {
      score += Math.min(10, technical.imageOptimization.imagesWithAlt / 10);
    }

    // Technical elements (5 points)
    if (technical.canonicalURL) score += 3;
    if (technical.hasRobotsMeta) score += 2;

    return Math.min(100, score);
  }

  calculateStructuredDataScore(structuredData) {
    let score = 0;

    // Basic structured data presence (20 points)
    if (structuredData.hasStructuredData) score += 20;

    // FAQ schema (25 points)
    if (structuredData.faqSchema.hasFAQSchema) {
      score += 15;
      score += Math.min(10, structuredData.faqSchema.questionCount * 2);
    }

    // HowTo schema (20 points)
    if (structuredData.howToSchema.hasHowToSchema) {
      score += 10;
      score += Math.min(10, structuredData.howToSchema.stepCount * 2);
    }

    // Article schema (20 points)
    if (structuredData.articleSchema.hasArticleSchema) {
      score += 10;
      if (structuredData.articleSchema.hasAuthor) score += 5;
      if (structuredData.articleSchema.hasDatePublished) score += 5;
    }

    // Breadcrumb schema (10 points)
    if (structuredData.breadcrumbSchema.hasBreadcrumbSchema) {
      score += 5;
      score += Math.min(5, structuredData.breadcrumbSchema.itemCount);
    }

    // Schema diversity bonus (5 points)
    const schemaCount = structuredData.schemaTypes.length;
    if (schemaCount >= 3) score += 5;
    else if (schemaCount >= 2) score += 3;

    return Math.min(100, score);
  }

  generateRecommendations(analysis, scores) {
    const recommendations = [];

    // Content recommendations
    if (scores.content < 70) {
      recommendations.push(...this.getContentRecommendations(analysis.content, analysis.aiReadiness));
    }

    // E-A-T recommendations
    if (scores.eat < 70) {
      recommendations.push(...this.getEATRecommendations(analysis.eat));
    }

    // Technical recommendations
    if (scores.technical < 70) {
      recommendations.push(...this.getTechnicalRecommendations(analysis.technical));
    }

    // Structured data recommendations
    if (scores.structuredData < 70) {
      recommendations.push(...this.getStructuredDataRecommendations(analysis.structuredData));
    }

    return this.prioritizeRecommendations(recommendations, scores);
  }

  getContentRecommendations(content, aiReadiness) {
    const recommendations = [];

    // Word count
    if (content.wordCount < 300) {
      recommendations.push({
        category: 'Content Quality',
        priority: 'high',
        issue: 'Content too short',
        recommendation: 'Expand your content to at least 500-1000 words. AI search engines prefer comprehensive content that thoroughly answers questions.',
        impact: 'High - Longer content is 52% more likely to appear in AI overviews'
      });
    }

    // Direct answer
    if (!content.hasDirectAnswer) {
      recommendations.push({
        category: 'AI Optimization',
        priority: 'high',
        issue: 'No direct answer in opening',
        recommendation: 'Start your content with a direct answer to the main question in the first 2-3 sentences. This dramatically improves AI overview visibility.',
        impact: 'High - Direct answers are crucial for AI search results',
        example: 'Instead of: "Many people wonder about..." Try: "To optimize for AI search, start with a clear answer: [Your direct answer here]."'
      });
    }

    // Content format
    if (!['listicle', 'step-by-step guide', 'comparison'].includes(content.contentFormat)) {
      recommendations.push({
        category: 'Content Structure',
        priority: 'medium',
        issue: 'Content format not optimized for AI',
        recommendation: 'Convert your content into a list format, comparison, or step-by-step guide. These formats perform 32.5% better in AI overviews.',
        impact: 'Medium - Format optimization improves AI visibility'
      });
    }

    // Factual backup
    if (!content.hasDataBackup) {
      recommendations.push({
        category: 'Content Authority',
        priority: 'medium',
        issue: 'Lacks factual backing',
        recommendation: 'Add statistics, research citations, or data to support your claims. AI systems favor content with factual backup.',
        impact: 'Medium - Factual content builds authority',
        example: 'Include phrases like "According to [source]," "Research shows," or specific percentages and statistics.'
      });
    }

    // Heading structure
    if (!content.headingAnalysis.properHierarchy) {
      recommendations.push({
        category: 'Content Structure',
        priority: 'medium',
        issue: 'Poor heading hierarchy',
        recommendation: 'Use proper H1-H6 hierarchy with one H1 tag and multiple H2 tags for main sections.',
        impact: 'Medium - Proper structure helps AI understand content'
      });
    }

    // FAQ optimization
    if (content.faqAnalysis.questionCount < 3) {
      recommendations.push({
        category: 'AI Optimization',
        priority: 'high',
        issue: 'Insufficient question-answer pairs',
        recommendation: 'Add more question-answer pairs throughout your content. Use H2 or H3 tags for questions.',
        impact: 'High - Question-answer format is ideal for AI overviews',
        example: 'Use headings like "How to [do something]?" or "What is [concept]?" followed by clear answers.'
      });
    }

    return recommendations;
  }

  getEATRecommendations(eat) {
    const recommendations = [];

    // Author information
    if (!eat.authorInfo.hasAuthor) {
      recommendations.push({
        category: 'E-A-T (Expertise)',
        priority: 'high',
        issue: 'Missing author information',
        recommendation: 'Add clear author bylines and author bio sections. AI systems heavily favor content with identifiable experts.',
        impact: 'High - Author credibility is crucial for AI search trust',
        implementation: 'Add author schema markup and visible author information on each page.'
      });
    }


    // Contact information
    if (!eat.contactInfo.hasContact && !eat.contactInfo.hasContactPage) {
      recommendations.push({
        category: 'E-A-T (Trust)',
        priority: 'medium',
        issue: 'No contact information',
        recommendation: 'Add contact information or a contact page to build trust with AI systems.',
        impact: 'Medium - Contact info improves trustworthiness'
      });
    }

    // Citations
    if (eat.citations.authorityCitations === 0) {
      recommendations.push({
        category: 'E-A-T (Authority)',
        priority: 'medium',
        issue: 'No authoritative citations',
        recommendation: 'Link to authoritative sources like .edu, .gov, or reputable industry sources to back up your claims.',
        impact: 'Medium - External authority links improve credibility',
        example: 'Link to studies, government data, or industry research to support your points.'
      });
    }

    // Freshness
    if (!eat.publishDate && !eat.lastUpdated) {
      recommendations.push({
        category: 'Content Freshness',
        priority: 'medium',
        issue: 'No publication or update dates',
        recommendation: 'Add publication dates and last updated timestamps. Keep content current.',
        impact: 'Medium - Fresh content performs better in AI search',
        implementation: 'Use schema markup for article dates and display visible timestamps.'
      });
    }

    return recommendations;
  }

  getTechnicalRecommendations(technical) {
    const recommendations = [];

    // HTTPS
    if (!technical.isHTTPS) {
      recommendations.push({
        category: 'Technical SEO',
        priority: 'high',
        issue: 'Site not using HTTPS',
        recommendation: 'Implement SSL certificate. HTTPS is required for AI search trust and ranking.',
        impact: 'High - HTTPS is a baseline requirement',
        urgency: 'Critical security and trust issue'
      });
    }

    // Mobile optimization
    if (!technical.mobileOptimization.hasViewportMeta) {
      recommendations.push({
        category: 'Mobile Optimization',
        priority: 'high',
        issue: 'Missing viewport meta tag',
        recommendation: 'Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
        impact: 'High - Mobile-first indexing requires proper viewport',
        implementation: 'Add the viewport meta tag to your HTML head section.'
      });
    }

    // Page speed
    if (technical.speedFactors.loadTime > 3000) {
      recommendations.push({
        category: 'Page Speed',
        priority: 'high',
        issue: 'Slow page loading',
        recommendation: 'Optimize page speed to under 2 seconds. Compress images, minify CSS/JS, and use a CDN.',
        impact: 'High - Page speed affects AI search rankings',
        currentScore: `Current load time: ${(technical.speedFactors.loadTime / 1000).toFixed(2)}s`
      });
    }

    // Meta description
    if (!technical.metaAnalysis.hasMetaDescription) {
      recommendations.push({
        category: 'Meta Optimization',
        priority: 'medium',
        issue: 'Missing meta description',
        recommendation: 'Add compelling meta descriptions (120-160 characters) that answer the main question.',
        impact: 'Medium - Meta descriptions help AI understand page content',
        example: 'Write descriptions that directly answer what users are searching for.'
      });
    }

    // Image optimization
    if (technical.imageOptimization.totalImages > 0 && technical.imageOptimization.imagesWithAlt < 80) {
      recommendations.push({
        category: 'Image SEO',
        priority: 'medium',
        issue: 'Images missing alt text',
        recommendation: 'Add descriptive alt text to all images. This helps AI systems understand your content.',
        impact: 'Medium - Alt text improves accessibility and AI understanding',
        currentScore: `${Math.round(technical.imageOptimization.imagesWithAlt)}% of images have alt text`
      });
    }

    return recommendations;
  }

  getStructuredDataRecommendations(structuredData) {
    const recommendations = [];

    // Basic structured data
    if (!structuredData.hasStructuredData) {
      recommendations.push({
        category: 'Structured Data',
        priority: 'high',
        issue: 'No structured data markup',
        recommendation: 'Implement JSON-LD structured data, starting with Article or BlogPosting schema.',
        impact: 'High - Structured data is crucial for AI search visibility',
        implementation: 'Add Article schema with author, datePublished, and headline properties.'
      });
    }

    // FAQ schema
    if (!structuredData.faqSchema.hasFAQSchema && structuredData.faqSchema.questionCount < 3) {
      recommendations.push({
        category: 'FAQ Schema',
        priority: 'high',
        issue: 'Missing FAQ structured data',
        recommendation: 'Add FAQ schema markup for question-answer pairs. This dramatically improves AI overview chances.',
        impact: 'High - FAQ schema is highly favored by AI search',
        example: 'Use FAQPage schema for pages with 3+ question-answer pairs.',
        implementation: `
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Your question here?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your answer here."
      }
    }
  ]
}`
      });
    }

    // HowTo schema
    if (!structuredData.howToSchema.hasHowToSchema) {
      recommendations.push({
        category: 'HowTo Schema',
        priority: 'medium',
        issue: 'Missing HowTo structured data',
        recommendation: 'For step-by-step content, add HowTo schema markup to improve AI search visibility.',
        impact: 'Medium - HowTo schema helps AI understand procedural content',
        condition: 'Use for instructional or tutorial content'
      });
    }

    // Article schema
    if (!structuredData.articleSchema.hasArticleSchema) {
      recommendations.push({
        category: 'Article Schema',
        priority: 'medium',
        issue: 'Missing Article structured data',
        recommendation: 'Add Article or BlogPosting schema with author, datePublished, and headline.',
        impact: 'Medium - Article schema helps AI understand content type',
        implementation: 'Include author, publisher, datePublished, and headline properties.'
      });
    }

    return recommendations;
  }

  prioritizeRecommendations(recommendations, scores) {
    // Sort by priority and impact
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    return recommendations.sort((a, b) => {
      // First sort by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      // Then by category importance for AI search
      const categoryOrder = {
        'AI Optimization': 5,
        'Content Quality': 4,
        'FAQ Schema': 4,
        'Technical SEO': 3,
        'E-A-T (Expertise)': 3,
        'Structured Data': 2,
        'Mobile Optimization': 2
      };
      
      return (categoryOrder[b.category] || 0) - (categoryOrder[a.category] || 0);
    });
  }
}

module.exports = { ScoreCalculator };