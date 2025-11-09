-- Add user approval system
-- Created: 2025-11-09
-- Description: Add approval field to users table for manual admin approval

-- Add approved column to users table
ALTER TABLE users
ADD COLUMN approved BOOLEAN DEFAULT false NOT NULL;

-- Create index for filtering unapproved users
CREATE INDEX idx_users_approved ON users(approved);

-- Add approved_at and approved_by fields for audit trail
ALTER TABLE users
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN approved_by UUID REFERENCES users(id);

-- Add comment for documentation
COMMENT ON COLUMN users.approved IS 'Whether the user has been approved by an admin. New registrations default to false.';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when the user was approved';
COMMENT ON COLUMN users.approved_by IS 'Admin user who approved this account';
