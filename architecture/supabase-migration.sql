-- =====================================================================
-- VMV8 SUPABASE MIGRATION — Brandscript + Market Research + Documents
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================================

-- 1. BRANDSCRIPTS TABLE — stores the full brandscript per user
CREATE TABLE IF NOT EXISTS vmv8_brandscripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Compulsory user context
  country TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  profession TEXT NOT NULL DEFAULT '',
  services TEXT DEFAULT '',
  -- Full brandscript JSON (all 8 sections)
  brandscript JSONB NOT NULL DEFAULT '{}',
  -- Context data
  context_payload TEXT DEFAULT '',
  context_overview TEXT DEFAULT '',
  context_panels JSONB DEFAULT '[]',
  -- Scraped source URLs
  website_url TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  -- Progress
  completion_pct INTEGER DEFAULT 0,
  completed_sections TEXT[] DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One active brandscript per user
  UNIQUE(user_id)
);

ALTER TABLE vmv8_brandscripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own brandscript"
  ON vmv8_brandscripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brandscript"
  ON vmv8_brandscripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brandscript"
  ON vmv8_brandscripts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brandscript"
  ON vmv8_brandscripts FOR DELETE
  USING (auth.uid() = user_id);


-- 2. MARKET RESEARCH TABLE — stores Firecrawl results + AI market data
CREATE TABLE IF NOT EXISTS vmv8_market_research (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brandscript_id UUID REFERENCES vmv8_brandscripts(id) ON DELETE CASCADE,
  -- Research parameters
  country TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  profession TEXT DEFAULT '',
  -- Raw Firecrawl search results
  firecrawl_results JSONB DEFAULT '[]',
  firecrawl_sources TEXT[] DEFAULT '{}',
  -- AI-generated market data
  market_data JSONB DEFAULT NULL,
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  credits_used INTEGER DEFAULT 0
);

ALTER TABLE vmv8_market_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own market research"
  ON vmv8_market_research FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own market research"
  ON vmv8_market_research FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own market research"
  ON vmv8_market_research FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own market research"
  ON vmv8_market_research FOR DELETE
  USING (auth.uid() = user_id);


-- 3. DOCUMENTS TABLE — stores exported B.I.G Doc history
CREATE TABLE IF NOT EXISTS vmv8_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brandscript_id UUID REFERENCES vmv8_brandscripts(id) ON DELETE SET NULL,
  market_research_id UUID REFERENCES vmv8_market_research(id) ON DELETE SET NULL,
  -- Document metadata
  brand_name TEXT DEFAULT '',
  document_type TEXT DEFAULT 'big_doc',
  -- Snapshots at time of export
  brandscript_snapshot JSONB DEFAULT NULL,
  market_data_snapshot JSONB DEFAULT NULL,
  context_snapshot TEXT DEFAULT '',
  -- File
  file_name TEXT DEFAULT '',
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vmv8_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON vmv8_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON vmv8_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON vmv8_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON vmv8_documents FOR DELETE
  USING (auth.uid() = user_id);


-- 4. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_brandscripts_user ON vmv8_brandscripts(user_id);
CREATE INDEX IF NOT EXISTS idx_market_research_user ON vmv8_market_research(user_id);
CREATE INDEX IF NOT EXISTS idx_market_research_generated ON vmv8_market_research(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user ON vmv8_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_exported ON vmv8_documents(exported_at DESC);
