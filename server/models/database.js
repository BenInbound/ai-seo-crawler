const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = process.env.DB_PATH || './database/crawler.db';

let db = null;

async function initDatabase() {
  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    await fs.mkdir(dbDir, { recursive: true });

    db = new sqlite3.Database(DB_PATH);

    // Enable WAL mode for better concurrent access
    await runQuery('PRAGMA journal_mode = WAL');
    await runQuery('PRAGMA synchronous = NORMAL');
    await runQuery('PRAGMA cache_size = 1000');
    await runQuery('PRAGMA temp_store = memory');

    // Create tables
    await createTables();
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS crawl_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      url TEXT NOT NULL,
      crawl_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      overall_score INTEGER,
      content_score INTEGER,
      eat_score INTEGER,
      technical_score INTEGER,
      structured_data_score INTEGER,
      analysis_data TEXT,
      recommendations TEXT,
      status TEXT DEFAULT 'completed',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS page_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_result_id INTEGER,
      url TEXT NOT NULL,
      title TEXT,
      meta_description TEXT,
      h1_tags TEXT,
      word_count INTEGER,
      has_schema_markup BOOLEAN,
      schema_types TEXT,
      mobile_friendly BOOLEAN,
      page_speed_score INTEGER,
      analysis_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (crawl_result_id) REFERENCES crawl_results (id)
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_crawl_results_domain ON crawl_results(domain)`,
    `CREATE INDEX IF NOT EXISTS idx_crawl_results_date ON crawl_results(crawl_date)`,
    `CREATE INDEX IF NOT EXISTS idx_page_analysis_crawl_id ON page_analysis(crawl_result_id)`
  ];

  for (const tableSQL of tables) {
    await runQuery(tableSQL);
  }
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function saveCrawlResult(data) {
  const {
    domain,
    url,
    overallScore,
    contentScore,
    eatScore,
    technicalScore,
    structuredDataScore,
    analysisData,
    recommendations,
    status = 'completed',
    errorMessage = null
  } = data;

  const sql = `
    INSERT INTO crawl_results (
      domain, url, overall_score, content_score, eat_score, 
      technical_score, structured_data_score, analysis_data, 
      recommendations, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    domain,
    url,
    overallScore,
    contentScore,
    eatScore,
    technicalScore,
    structuredDataScore,
    JSON.stringify(analysisData),
    JSON.stringify(recommendations),
    status,
    errorMessage
  ];

  const result = await runQuery(sql, params);
  return result.lastID;
}

async function getCrawlResult(domain, maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
  const sql = `
    SELECT * FROM crawl_results 
    WHERE domain = ? 
    AND crawl_date > datetime('now', '-${maxAge / 1000} seconds')
    ORDER BY crawl_date DESC 
    LIMIT 1
  `;

  const result = await getQuery(sql, [domain]);
  
  if (result) {
    // Parse JSON fields
    result.analysis_data = JSON.parse(result.analysis_data || '{}');
    result.recommendations = JSON.parse(result.recommendations || '[]');
  }

  return result;
}

async function getCrawlHistory(domain, limit = 10) {
  const sql = `
    SELECT id, domain, url, crawl_date, overall_score, 
           content_score, eat_score, technical_score, 
           structured_data_score, status
    FROM crawl_results 
    WHERE domain = ? 
    ORDER BY crawl_date DESC 
    LIMIT ?
  `;

  return await allQuery(sql, [domain, limit]);
}

async function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDatabase,
  runQuery,
  getQuery,
  allQuery,
  saveCrawlResult,
  getCrawlResult,
  getCrawlHistory,
  closeDatabase
};