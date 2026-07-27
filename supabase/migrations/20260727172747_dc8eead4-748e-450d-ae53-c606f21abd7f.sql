REVOKE SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_threads FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages FROM anon;

DROP POLICY IF EXISTS "anon read visitor threads" ON public.ai_chat_threads;
DROP POLICY IF EXISTS "anon read visitor messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "anon insert visitor threads" ON public.ai_chat_threads;
DROP POLICY IF EXISTS "anon insert visitor messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "anon update visitor threads" ON public.ai_chat_threads;