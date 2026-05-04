-- ============================================================
-- VMV8 Speech-to-Text: Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the transcripts table
CREATE TABLE IF NOT EXISTS vmv8_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Transcript',
  description TEXT DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('upload', 'recording')) DEFAULT 'upload',
  file_name TEXT,
  duration_seconds INTEGER,
  added_to_context BOOLEAN DEFAULT FALSE,
  added_to_doc BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add recording_session_count to profiles (if profiles table exists)
-- If you don't have a profiles table, create one:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      display_name TEXT,
      username TEXT UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      storage_limit_bytes BIGINT DEFAULT 524288000,
      transcriptions_limit INTEGER DEFAULT 50,
      recording_session_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  ELSE
    -- Add the column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'recording_session_count') THEN
      ALTER TABLE profiles ADD COLUMN recording_session_count INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- 3. RLS policies for transcripts
ALTER TABLE vmv8_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcripts"
  ON vmv8_transcripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcripts"
  ON vmv8_transcripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcripts"
  ON vmv8_transcripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcripts"
  ON vmv8_transcripts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vmv8_transcripts_user_id ON vmv8_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_vmv8_transcripts_created_at ON vmv8_transcripts(created_at DESC);
