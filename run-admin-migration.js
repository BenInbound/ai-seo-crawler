require('dotenv').config();
const { supabaseAdmin } = require('./server/services/database/supabase');

async function runMigration() {
  console.log('Running migration: 004_add_user_admin_flag.sql\n');

  try {
    // Add is_admin column
    console.log('1. Adding is_admin column...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;
      `
    }).then(r => {
      if (r.error) throw r.error;
      console.log('   ✓ Column added');
    });

    // Create index
    console.log('2. Creating index...');
    await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);
      `
    }).then(r => {
      if (r.error) throw r.error;
      console.log('   ✓ Index created');
    });

    // Set ben@inbound.no as admin
    console.log('3. Setting ben@inbound.no as admin...');
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_admin: true })
      .eq('email', 'ben@inbound.no')
      .select();

    if (error) throw error;
    console.log('   ✓ Admin user updated:', data);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
