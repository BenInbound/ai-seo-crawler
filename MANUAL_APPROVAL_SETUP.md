# Manual Approval System - Setup Instructions

## Quick Start

The manual approval system has been implemented but requires running a database migration.

### Step 1: Run the Migration

You need to run the SQL migration to add the approval columns to the users table.

**Option A: Supabase Dashboard (Recommended)**

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to: **SQL Editor**
3. Click **New Query**
4. Paste the contents of `supabase/migrations/003_add_user_approval.sql`
5. Click **Run** or press `Cmd+Enter`

**Option B: Supabase CLI**

```bash
# If you have Supabase CLI linked to your project
npx supabase db push
```

### Step 2: Approve Existing Users

If you have existing users who need access, you'll need to manually approve them:

```sql
-- Run this in Supabase SQL Editor to approve all existing users
UPDATE users
SET approved = true,
    approved_at = NOW()
WHERE approved = false;
```

Or approve specific users:

```sql
-- Approve a specific user by email
UPDATE users
SET approved = true,
    approved_at = NOW()
WHERE email = 'your-email@inbound.no' AND approved = false;
```

### Step 3: Make Yourself an Admin

To use the admin approval endpoints, you need admin role in an organization:

```sql
-- Check your current role
SELECT u.email, om.role, o.name as organization
FROM users u
JOIN org_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'your-email@inbound.no';

-- If you're not an admin, update your role
UPDATE org_members
SET role = 'admin'
WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@inbound.no');
```

## Testing the Approval Flow

### Test Registration

1. Go to http://localhost:3000/register
2. Fill in the form with a test @inbound.no email
3. Submit registration
4. You should see: "Your account has been created and is awaiting admin approval"
5. Try logging in - you should get a 403 error: "Account pending approval"

### Test Admin Approval

1. Log in as an admin user
2. Get your JWT token from localStorage or Network tab
3. Test the API endpoints:

```bash
# List pending users
curl -X GET http://localhost:3001/api/admin/users/pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Approve a user
curl -X POST http://localhost:3001/api/admin/users/USER_ID/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

4. The approved user should now be able to log in

## What Changed

### Registration Flow
- ✅ Users can register with @inbound.no emails
- ✅ Registration creates account with `approved = false`
- ✅ No automatic login after registration
- ✅ Success message explains approval requirement

### Login Flow
- ✅ Unapproved users get 403 Forbidden when logging in
- ✅ Clear error message: "Account pending approval"

### Admin Endpoints
- ✅ `GET /api/admin/users/pending` - List users awaiting approval
- ✅ `POST /api/admin/users/:userId/approve` - Approve a user
- ✅ `POST /api/admin/users/:userId/reject` - Reject and delete user
- ✅ All endpoints require admin role

### Database
- ✅ `approved` column (default: false)
- ✅ `approved_at` timestamp
- ✅ `approved_by` admin user reference
- ✅ Index on `approved` for performance

## Need Help?

- See full documentation: `docs/manual-approval-workflow.md`
- View migration file: `supabase/migrations/003_add_user_approval.sql`
- Check admin routes: `server/api/routes/admin.js`
