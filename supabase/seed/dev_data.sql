-- Development Seed Data
-- Created: 2025-11-07
-- Description: Sample data for testing multi-tenant AEO platform
-- WARNING: This is for development/testing only. Do not run in production.

-- ============================================================================
-- CLEAR EXISTING DATA (use with caution)
-- ============================================================================
-- Uncomment the lines below if you want to reset all data
-- TRUNCATE TABLE embeddings CASCADE;
-- TRUNCATE TABLE page_scores CASCADE;
-- TRUNCATE TABLE page_snapshots CASCADE;
-- TRUNCATE TABLE pages CASCADE;
-- TRUNCATE TABLE crawl_runs CASCADE;
-- TRUNCATE TABLE projects CASCADE;
-- TRUNCATE TABLE org_members CASCADE;
-- TRUNCATE TABLE organizations CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- ============================================================================
-- SEED USERS
-- ============================================================================
-- Password for all test users: "TestPass123!"
-- Hash generated with bcrypt, 10 rounds: $2b$10$rG3qO5YZxJx3k5N7lJ3mXuK6N5YZxJx3k5N7lJ3mXuK6N5YZxJx3k
INSERT INTO users (id, email, password_hash, name, preferences, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com', '$2b$10$rG3qO5YZxJx3k5N7lJ3mXuK6N5YZxJx3k5N7lJ3mXuK6N5YZxJx3k', 'Admin User', '{"theme": "dark"}', NOW() - INTERVAL '30 days'),
  ('22222222-2222-2222-2222-222222222222', 'editor@example.com', '$2b$10$rG3qO5YZxJx3k5N7lJ3mXuK6N5YZxJx3k5N7lJ3mXuK6N5YZxJx3k', 'Editor User', '{"theme": "light"}', NOW() - INTERVAL '20 days'),
  ('33333333-3333-3333-3333-333333333333', 'viewer@example.com', '$2b$10$rG3qO5YZxJx3k5N7lJ3mXuK6N5YZxJx3k5N7lJ3mXuK6N5YZxJx3k', 'Viewer User', '{}', NOW() - INTERVAL '10 days'),
  ('44444444-4444-4444-4444-444444444444', 'demo@agency.com', '$2b$10$rG3qO5YZxJx3k5N7lJ3mXuK6N5YZxJx3k5N7lJ3mXuK6N5YZxJx3k', 'Demo Agency User', '{"theme": "dark"}', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED ORGANIZATIONS
-- ============================================================================
INSERT INTO organizations (id, name, slug, settings, billing_email, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corporation', 'acme-corp', '{"token_limit": 100000, "crawl_frequency": "weekly"}', 'billing@acme.com', NOW() - INTERVAL '30 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tech Startup Inc', 'tech-startup', '{"token_limit": 50000, "crawl_frequency": "daily"}', 'billing@techstartup.com', NOW() - INTERVAL '20 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Marketing Agency', 'marketing-agency', '{"token_limit": 200000, "crawl_frequency": "monthly"}', 'billing@agency.com', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED ORGANIZATION MEMBERS
-- ============================================================================
INSERT INTO org_members (id, organization_id, user_id, role, invited_by, invited_at, joined_at) VALUES
  -- Acme Corporation
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin', NULL, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'editor', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'viewer', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

  -- Tech Startup
  ('10000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'admin', NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('10000000-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'editor', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

  -- Marketing Agency
  ('10000000-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'admin', NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED PROJECTS
-- ============================================================================
INSERT INTO projects (id, organization_id, name, target_url, description, config, created_by, created_at) VALUES
  -- Acme Corporation Projects
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Main Website', 'https://acme.example.com', 'Corporate website for Acme Corporation', '{"depth_limit": 3, "token_limit": 50000}', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Blog', 'https://blog.acme.example.com', 'Company blog for thought leadership', '{"depth_limit": 2, "token_limit": 30000}', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '15 days'),

  -- Tech Startup Projects
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Product Landing Page', 'https://product.startup.example.com', 'Main product landing page', '{"depth_limit": 2, "token_limit": 20000}', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 days'),

  -- Marketing Agency Projects
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Client A - Ecommerce Site', 'https://clienta.example.com', 'Ecommerce website for retail client', '{"depth_limit": 4, "token_limit": 75000}', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED CRAWL RUNS
-- ============================================================================
INSERT INTO crawl_runs (id, project_id, run_type, status, config_snapshot, pages_discovered, pages_processed, token_usage, started_at, completed_at, created_by) VALUES
  -- Completed crawl for Acme Main Website
  ('c0000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'full', 'completed', '{"depth_limit": 3, "token_limit": 50000}', 45, 45, 12500, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '2 hours', '11111111-1111-1111-1111-111111111111'),

  -- Recent completed crawl for Acme Main Website
  ('c0000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'full', 'completed', '{"depth_limit": 3, "token_limit": 50000}', 48, 48, 13200, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', '22222222-2222-2222-2222-222222222222'),

  -- Running crawl for Acme Blog
  ('c0000000-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'full', 'running', '{"depth_limit": 2, "token_limit": 30000}', 25, 15, 4200, NOW() - INTERVAL '1 hour', NULL, '22222222-2222-2222-2222-222222222222'),

  -- Completed crawl for Tech Startup
  ('c0000000-0000-0000-0000-000000000004', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'full', 'completed', '{"depth_limit": 2, "token_limit": 20000}', 12, 12, 3500, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED PAGES (Sample)
-- ============================================================================
INSERT INTO pages (id, project_id, url, url_hash, page_type, first_discovered_at, last_crawled_at, last_crawl_run_id) VALUES
  -- Acme Main Website pages
  ('p0000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'https://acme.example.com/', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'homepage', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', 'c0000000-0000-0000-0000-000000000002'),
  ('p0000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'https://acme.example.com/products', 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e', 'product', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', 'c0000000-0000-0000-0000-000000000002'),
  ('p0000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'https://acme.example.com/about', 'c1c8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8c8f8', 'resource', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', 'c0000000-0000-0000-0000-000000000002'),

  -- Acme Blog pages
  ('p0000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'https://blog.acme.example.com/', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35', 'homepage', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 hour', 'c0000000-0000-0000-0000-000000000003'),

  -- Tech Startup pages
  ('p0000000-0000-0000-0000-000000000005', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'https://product.startup.example.com/', '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', 'homepage', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', 'c0000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All test users have the same password: "TestPass123!"
-- 2. The password hash is a bcrypt hash (this is a dummy hash for testing)
-- 3. UUIDs are sequential for easy identification in testing
-- 4. Organizations have different token limits to test quota features
-- 5. One crawl is intentionally left in 'running' state to test UI
-- 6. Cross-organization isolation should be tested with these users
-- 7. To test real password hashing, update password_hash values with actual bcrypt hashes
