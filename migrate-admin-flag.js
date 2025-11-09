#!/usr/bin/env node

require('dotenv').config();
const { supabaseAdmin } = require('./server/services/database/supabase');

async function runMigration() {
  console.log('🚀 Running migration: Add is_admin flag to users table\n');

  try {
    // First, let's check current schema
    console.log('1. Checking current users table...');
    const { data: testUser, error: testError } = await supabaseAdmin
      .from('users')
      .select('id, email, is_admin')
      .limit(1)
      .single();

    if (testError && testError.message && testError.message.includes('column users.is_admin does not exist')) {
      console.log('   ✓ Confirmed: is_admin column does not exist yet\n');
      console.log('⚠️  I cannot run ALTER TABLE commands through the Supabase JS client.');
      console.log('   Please run this SQL in your Supabase SQL Editor:\n');
      console.log('----------------------------------------');
      console.log('-- Add platform admin flag to users');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);');
      console.log('UPDATE users SET is_admin = true WHERE email = \'ben@inbound.no\';');
      console.log('COMMENT ON COLUMN users.is_admin IS \'Platform-level admin flag.\';');
      console.log('----------------------------------------\n');
      console.log('📍 Go to: https://supabase.com/dashboard/project/leazinlkienjdzcjqbjr/sql/new');
      process.exit(1);
    } else if (testError) {
      console.error('   ❌ Unexpected error:', testError.message);
      process.exit(1);
    } else {
      console.log('   ✓ Column already exists!');
      console.log('   Current value for test user:', testUser);

      // Update ben@inbound.no to be admin
      console.log('\n2. Setting ben@inbound.no as platform admin...');
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ is_admin: true })
        .eq('email', 'ben@inbound.no')
        .select('id, email, is_admin');

      if (updateError) {
        console.error('   ❌ Error updating admin user:', updateError.message);
        process.exit(1);
      }

      console.log('   ✓ Admin user updated:', updated);
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
