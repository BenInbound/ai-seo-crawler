-- Add platform admin flag to users
-- Created: 2025-11-09
-- Description: Add is_admin field for platform-level admin privileges

-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for filtering admin users
CREATE INDEX idx_users_admin ON users(is_admin);

-- Set existing ben@inbound.no user as admin
UPDATE users
SET is_admin = true
WHERE email = 'ben@inbound.no';

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Platform-level admin flag. Admins can approve new users and manage platform settings.';
