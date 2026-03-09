-- ═══════════════════════════════════════════════════════
-- iOS App Discovery — Supabase SQL Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL)
-- ═══════════════════════════════════════════════════════

-- Create the apps table
CREATE TABLE IF NOT EXISTS apps (
  track_id       BIGINT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  developer      TEXT,
  bundle_id      TEXT,
  release_date   TIMESTAMPTZ,
  last_updated   TIMESTAMPTZ,
  app_store_url  TEXT,
  icon           TEXT,
  category       TEXT,
  first_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_release_date ON apps (release_date DESC);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps (category);
-- Enable trigram extension for fuzzy text search (required for gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_apps_name ON apps USING gin (name gin_trgm_ops);

-- Enable Row Level Security
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (public dashboard)
CREATE POLICY "Allow public read access"
  ON apps
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role full access (crawler writes)
CREATE POLICY "Allow service role full access"
  ON apps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
