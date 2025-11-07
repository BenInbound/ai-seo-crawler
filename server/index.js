require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Initialize database
const { supabaseAdmin } = require('./services/database/supabase');
const UserModel = require('./models/user');
const OrganizationModel = require('./models/organization');
const OrganizationMemberModel = require('./models/organization-member');
const ProjectModel = require('./models/project');
const CrawlRunModel = require('./models/crawl-run');
const PageModel = require('./models/page');
const SnapshotModel = require('./models/snapshot');
// const ScoreModel = require('./models/score'); // TODO: Create score model

// Set Supabase client on all models
UserModel.setSupabaseClient(supabaseAdmin);
OrganizationModel.setSupabaseClient(supabaseAdmin);
OrganizationMemberModel.setSupabaseClient(supabaseAdmin);
ProjectModel.setSupabaseClient(supabaseAdmin);
CrawlRunModel.setSupabaseClient(supabaseAdmin);
PageModel.setSupabaseClient(supabaseAdmin);
SnapshotModel.setSupabaseClient(supabaseAdmin);
// ScoreModel.setSupabaseClient(supabaseAdmin); // TODO: Uncomment when score model is created

// Import middleware
const { requestLogger, performanceLogger, errorLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { optionalAuthenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./api/routes/auth');
const organizationRoutes = require('./api/routes/organizations');
const projectRoutes = require('./api/routes/projects');
const crawlerRoutes = require('./api/routes/crawler');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyBlock: true,
  points: parseInt(process.env.RATE_LIMIT_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
});

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    });
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(requestLogger);
app.use(performanceLogger(1000)); // Log requests slower than 1 second

// Rate limiting
app.use(rateLimiterMiddleware);

// Optional authentication (attaches user if token present)
// Use this for public endpoints that behave differently when authenticated
// For protected routes, use the authenticate middleware directly in the route
app.use(optionalAuthenticate);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api', projectRoutes); // Projects uses full paths like /organizations/:orgId/projects
app.use('/api/crawler', crawlerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static files from React build (in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
// Must be after all routes
app.use(errorLogger); // Log errors with context
app.use(errorHandler); // Handle and format errors

// 404 handler for unmatched routes (must be last)
app.use(notFoundHandler);

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('AI Search Crawler ready - stateless analysis mode');
  });
}

module.exports = app;