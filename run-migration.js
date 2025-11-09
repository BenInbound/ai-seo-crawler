require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  const sql = fs.readFileSync('./supabase/migrations/004_add_user_admin_flag.sql', 'utf8');

  console.log('Running migration: 004_add_user_admin_flag.sql');
  console.log('SQL:', sql);

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully');
  process.exit(0);
}

runMigration();
