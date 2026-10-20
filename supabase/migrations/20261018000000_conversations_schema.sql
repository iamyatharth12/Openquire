-- =============================================================================
-- Openquire: Conversations Table & Row-Level Security (RLS) Policies
-- Migration: 20261018000000_conversations_schema.sql
-- =============================================================================

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'web',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  model_id TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  provider_id TEXT NOT NULL DEFAULT 'gemini',
  initial_query TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 2. Enable Row-Level Security (mandatory for user isolation)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can only view their own conversations
DROP POLICY IF EXISTS "Users can select own conversations" ON public.conversations;
CREATE POLICY "Users can select own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Policy: Users can only insert conversations with their own user_id
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Policy: Users can only update their own conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Policy: Users can only delete their own conversations
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 7. High-performance index for querying conversations by user ordered by updatedAt
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations(user_id, updated_at DESC);
