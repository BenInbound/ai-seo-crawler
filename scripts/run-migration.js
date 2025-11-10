#!/usr/bin/env node
/**
 * Migration Runner
 * Runs the manual run type migration using REST API
 */

require('dotenv').config();
const https = require('https');

async function runMigration() {
  console.log('Running migration: Add "manual" to run_type constraint');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

  console.log(`Project: ${projectRef}`);
  console.log('\n=== Step 1: Drop old constraint ===');

  try {
    // Drop the old constraint using Supabase REST API
    const dropSql = 'ALTER TABLE crawl_runs DROP CONSTRAINT run_type_check;';
    await executeSQL(projectRef, supabaseKey, dropSql);
    console.log('✓ Dropped old constraint successfully');

    console.log('\n=== Step 2: Add new constraint with "manual" ===');

    // Add new constraint
    const addSql = "ALTER TABLE crawl_runs ADD CONSTRAINT run_type_check CHECK (run_type IN ('full', 'sitemap_only', 'sample', 'delta', 'manual'));";
    await executeSQL(projectRef, supabaseKey, addSql);
    console.log('✓ Added new constraint successfully');

    console.log('\n🎉 Migration completed successfully!');
    console.log('You can now use "manual" as a run_type in crawl_runs');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

function executeSQL(projectRef, apiKey, sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

runMigration();
