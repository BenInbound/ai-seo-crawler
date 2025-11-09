# Manual User Approval Workflow

This document describes the manual approval system for new user registrations.

## Overview

The platform requires admin approval for all new user accounts registered with @inbound.no email addresses. This ensures controlled access to the internal AEO platform.

## User Registration Flow

1. User visits `/register` and submits registration form with:
   - Name
   - Email (must be @inbound.no)
   - Password
   - Confirm password

2. Backend creates user account with `approved = false`

3. User sees success message:
   - "Your account has been created and is awaiting admin approval"
   - "You will be able to log in once an administrator approves your account"

4. User is redirected to login page after 5 seconds

5. If user attempts to log in before approval:
   - Returns 403 Forbidden
   - Error: "Account pending approval"
   - Details: "Your account is awaiting admin approval. Please contact your administrator."

## Admin Approval Process

### Prerequisites

- Admin must be logged in
- Admin must have 'admin' role in at least one organization

### List Pending Users

**Endpoint:** `GET /api/admin/users/pending`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@inbound.no",
      "name": "John Doe",
      "created_at": "2025-11-09T14:30:00Z"
    }
  ],
  "count": 1
}
```

### Approve User

**Endpoint:** `POST /api/admin/users/:userId/approve`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "message": "User approved successfully",
  "user": {
    "id": "uuid",
    "email": "user@inbound.no",
    "name": "John Doe",
    "approved": true,
    "approved_at": "2025-11-09T14:35:00Z"
  }
}
```

### Reject User

**Endpoint:** `POST /api/admin/users/:userId/reject`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "message": "User rejected and deleted successfully",
  "email": "user@inbound.no"
}
```

**Note:** This permanently deletes the user account. Cannot be undone.

## Database Schema

### users table

New columns added by migration `003_add_user_approval.sql`:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| approved | BOOLEAN | false | Whether user has been approved by admin |
| approved_at | TIMESTAMPTZ | NULL | Timestamp when user was approved |
| approved_by | UUID | NULL | References users(id) - Admin who approved |

### Index

- `idx_users_approved` on `users(approved)` - For efficient filtering of unapproved users

## Running the Migration

### Option 1: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Paste the contents of `supabase/migrations/003_add_user_approval.sql`
4. Click "Run"

### Option 2: Supabase CLI (if linked)

```bash
npx supabase db push
```

## Security Considerations

1. **Email Domain Restriction**: Only @inbound.no emails can register (enforced both client and server-side)

2. **No Auto-Login**: Registration no longer returns a JWT token. Users must wait for approval.

3. **Admin-Only Endpoints**: All `/api/admin/*` endpoints require:
   - Valid JWT token (via `requireAuth` middleware)
   - Admin role in at least one organization (via `requireAdmin` middleware)

4. **Login Prevention**: Unapproved users cannot log in, even with correct credentials

5. **Audit Trail**: All approvals are tracked with:
   - `approved_at` timestamp
   - `approved_by` admin user ID

## Future Enhancements

Possible improvements for later:

1. **Email Notifications**: Send email to users when approved/rejected
2. **Admin Dashboard UI**: Build frontend admin panel for managing users
3. **Approval Comments**: Allow admins to add notes about approval decisions
4. **Bulk Approval**: Approve multiple users at once
5. **Approval Expiration**: Auto-delete unapproved accounts after X days
