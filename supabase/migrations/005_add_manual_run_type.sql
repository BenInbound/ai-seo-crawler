-- Migration: Add 'manual' to run_type check constraint
-- This allows single-URL manual crawls

-- Drop the old constraint
ALTER TABLE crawl_runs
DROP CONSTRAINT run_type_check;

-- Add the new constraint with 'manual' included
ALTER TABLE crawl_runs
ADD CONSTRAINT run_type_check
CHECK (run_type IN ('full', 'sitemap_only', 'sample', 'delta', 'manual'));
