/**
 * Vercel Serverless Function Entry Point
 *
 * This file exports the main Express app for Vercel's serverless environment.
 * All routes from server/index.js are available here.
 */

require('dotenv').config();

// Export the main server application
// Note: The server/index.js file exports the fully configured Express app
// with all routes, middleware, and database initialization
module.exports = require('../server/index.js');