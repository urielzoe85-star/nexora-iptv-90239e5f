
ALTER TABLE public.ai_chat_threads
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS handoff_status text NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid,
  ADD COLUMN IF NOT EXISTS handoff_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS handoff_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS handoff_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS visitor_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ai_chat_threads_session_id_uq
  ON public.ai_chat_threads(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_chat_threads_handoff_idx
  ON public.ai_chat_threads(handoff_status, updated_at DESC);

ALTER TABLE public.ai_chat_messages
  ADD COLUMN IF NOT EXISTS sender text NOT NULL DEFAULT 'assistant';

-- Capability-based anon access (thread UUID = shared secret with the browser)
GRANT SELECT, INSERT, UPDATE ON public.ai_chat_threads TO anon;
GRANT SELECT, INSERT ON public.ai_chat_messages TO anon;

DROP POLICY IF EXISTS "anon read visitor threads" ON public.ai_chat_threads;
CREATE POLICY "anon read visitor threads" ON public.ai_chat_threads
  FOR SELECT TO anon USING (scope = 'client');

DROP POLICY IF EXISTS "anon read visitor messages" ON public.ai_chat_messages;
CREATE POLICY "anon read visitor messages" ON public.ai_chat_messages
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.ai_chat_threads t
            WHERE t.id = ai_chat_messages.thread_id AND t.scope = 'client')
  );

ALTER TABLE public.ai_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.ai_chat_threads  REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_threads';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
