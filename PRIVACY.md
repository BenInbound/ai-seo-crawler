# Privacy Policy

**Last Updated: January 2025**

## Overview

This Privacy Policy describes how the AI Search Readiness Crawler ("the Tool", "we", "us") collects, uses, and protects information when you use our website analysis service.

## Information We Collect

### Automatically Collected Information
- **Domain Names**: Domains you submit for analysis
- **Analysis Results**: Scores, recommendations, and technical data from website analysis
- **Usage Data**: API requests, timestamps, and basic usage patterns
- **Technical Data**: IP addresses (for rate limiting), browser information, and request metadata

### Information We Don't Collect
- **Personal Information**: We do not collect names, email addresses, or personal identifiers
- **Website Content**: We analyze but do not store full website content or sensitive data
- **Tracking**: We do not use cookies or tracking technologies for advertising

## How We Use Information

### Analysis Purposes
- Provide AI search readiness scores and recommendations
- Cache analysis results to improve service performance
- Generate technical SEO insights and suggestions

### Service Operation
- Rate limiting to prevent abuse
- Error logging and debugging
- Service performance monitoring

## Data Storage and Retention

### Local Storage
- Analysis results are stored locally in SQLite database
- Cache data is retained for 24 hours for performance
- No data is transmitted to external services

### Data Security
- All analysis is performed locally on your infrastructure
- HTTPS encryption for all communications
- No data sharing with third parties

## Website Crawling Practices

### Ethical Crawling
- **Robots.txt Compliance**: We always check and respect robots.txt directives
- **Rate Limiting**: Configurable delays between requests (default 2 seconds)
- **Resource Respect**: We only analyze necessary content, skip media files
- **User Agent Identification**: Clear identification as an analysis tool
- **No Data Mining**: We analyze for SEO insights only, not content extraction

### Multi-Strategy Approach
When robots.txt blocks our crawler:
1. **First**: Attempt with identified crawler user agent
2. **Fallback**: Use browser user agent (similar to legitimate SEO tools like Semrush, Ahrefs)
3. **Blocked**: Provide informative blocked result with guidance

This approach mirrors industry-standard SEO tools and is designed for legitimate analysis purposes only.

## Your Rights

### Access and Control
- **View Results**: All analysis results are displayed transparently
- **Clear Cache**: Use the "Force Refresh" option to clear cached data
- **Data Deletion**: Analysis data is automatically purged after 24 hours

### Opt-Out
- **Robots.txt**: Configure robots.txt to block our crawler if desired
- **No Tracking**: No persistent tracking or user profiling occurs

## Third-Party Services

### Dependencies
This tool uses:
- **Puppeteer**: For website analysis (Google's headless Chrome)
- **Node.js Libraries**: For technical functionality only
- **No Analytics**: No Google Analytics, tracking, or advertising services

## Contact and Compliance

### Questions
For privacy questions or concerns:
- Review this policy and our Terms of Service
- Check our GitHub repository for technical details
- Contact through GitHub issues for transparency

### Legal Compliance
- **GDPR**: Minimal data collection, no personal data processing
- **CCPA**: No personal information sale or sharing
- **Industry Standards**: Following SEO tool industry best practices

## Changes to This Policy

We may update this Privacy Policy to reflect changes in our practices or legal requirements. Updates will be posted in the repository with the new "Last Updated" date.

## Transparency

This is an open-source project. You can:
- Review the complete source code
- Understand exactly what data is collected and how
- Modify the tool for your specific privacy requirements
- Deploy privately for complete data control

---

**Note**: This tool is designed for legitimate SEO analysis and website optimization. It should only be used in compliance with website terms of service and applicable laws.