# AI Search Readiness Crawler

A comprehensive website analysis tool that evaluates your site's optimization for AI search engines, particularly Google AI Overviews. Get actionable recommendations to improve your AI search visibility.

## Features

- **AI Search Optimization Analysis**: Evaluates content structure, E-A-T signals, technical SEO, and structured data
- **Always Fresh Analysis**: No caching - every analysis provides current, up-to-date results
- **Respectful Crawling**: Honors robots.txt files and implements ethical crawling practices  
- **Real-time Analysis**: Instant feedback with detailed scoring across multiple categories
- **Actionable Recommendations**: Specific improvements with code examples and implementation guides
- **Stateless Architecture**: Simple, reliable, and scalable design like professional SEO tools
- **Modern UI**: Clean, responsive interface with real-time progress indicators

## What We Analyze

### Content Quality & AI Optimization (25%)
- Direct answer optimization in opening paragraphs
- Content format (listicles, guides, comparisons)
- Question-answer pairs and FAQ sections
- Heading hierarchy and readability
- AI Overview keyword optimization

### E-A-T Signals (25%)
- Author information and credentials
- Content freshness and update dates
- External citations and references
- Trust and authority indicators
- About page and contact information

### Technical SEO (25%)
- Mobile optimization and viewport configuration
- Page speed and Core Web Vitals
- HTTPS security and SSL certificates
- Meta tags and image optimization
- Internal linking structure

### Structured Data (25%)
- FAQ and HowTo schema markup
- Article and breadcrumb schemas
- Schema diversity and implementation quality
- Rich snippet optimization

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/benjaminge1978/ai-seo-crawler.git
   cd ai-seo-crawler
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   This starts both backend (port 3001) and frontend (port 3000) servers.

3. **Visit the Application**
   Open http://localhost:3000 in your browser

### Production Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## Usage

1. **Enter Domain**: Input your domain name (e.g., `example.com`)
2. **Start Analysis**: Click "Analyze AI Search Readiness" 
3. **View Results**: Review your overall score and category breakdowns
4. **Follow Recommendations**: Implement suggested improvements with provided code examples
5. **Re-analyze**: Track your progress with follow-up analyses

## Project Structure

```
/
├── server/                 # Backend Node.js/Express server
│   ├── api/routes/        # API route handlers
│   ├── crawler/           # Crawling and analysis engine
│   │   ├── engine.js      # Main crawler with Puppeteer
│   │   ├── analyzer.js    # Content analysis algorithms
│   │   └── scorer.js      # Scoring and recommendations
│   └── utils/             # Utility functions
├── client/                # React frontend application
│   ├── src/components/    # React components
│   ├── src/styles/        # CSS and styling
│   └── public/           # Static assets
└── package.json          # Project configuration
```

## Configuration

Environment variables (`.env`):

```bash
PORT=3001                    # Server port
NODE_ENV=development         # Environment
CRAWLER_DELAY_MS=2000       # Delay between requests
CRAWLER_TIMEOUT_MS=30000    # Request timeout
RATE_LIMIT_REQUESTS=100     # Rate limit per window
RATE_LIMIT_WINDOW_MS=900000 # Rate limit window (15 minutes)
```

## API Endpoints

- `POST /api/crawler/analyze` - Analyze a domain (always fresh results)
- `GET /api/health` - Health check

## Ethical Crawling

This tool implements responsible crawling practices:

- **Robots.txt Compliance**: Always checks and respects robots.txt rules
- **Rate Limiting**: Configurable delays between requests
- **Resource Filtering**: Only analyzes essential content, skips images/media
- **User Agent**: Identifies itself clearly as an analysis tool
- **Timeout Handling**: Proper error handling and request timeouts

## Stateless Design Philosophy

This tool follows a **stateless architecture** similar to professional SEO tools:

### Why No Database/Caching?
- **Always Fresh Results**: Users expect current analysis, not stale cached data
- **Better UX**: No confusion about why scores don't change after improvements
- **Industry Standard**: Google PageSpeed Insights, GTmetrix, Lighthouse all provide fresh analysis
- **Simpler Deployment**: No database setup, migrations, or persistence concerns
- **Predictable Behavior**: Same input always produces current results

### Rate Limiting Strategy
- **Per-Domain Limiting**: 60-second cooldown between analyses of the same domain
- **In-Memory Storage**: Simple Map-based tracking, no persistence needed
- **Automatic Cleanup**: Old entries are automatically purged to prevent memory bloat
- **Respectful Crawling**: Combined with built-in delays for ethical site analysis

This approach prioritizes **reliability** and **user experience** over premature optimization.

## Technology Stack

### Backend
- **Node.js & Express**: Server framework
- **Puppeteer**: Headless browser for crawling
- **Cheerio**: HTML parsing and analysis
- **Stateless Architecture**: No database - always fresh analysis
- **In-Memory Rate Limiting**: Simple, efficient request throttling

### Frontend
- **React**: User interface framework
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Modern icon library
- **Axios**: HTTP client for API calls
- **Recharts**: Data visualization (for future features)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review the code examples in the recommendations

---

Built with ❤️ for better AI search optimization

🚀 Deploy to Vercel for live AI SEO analysis