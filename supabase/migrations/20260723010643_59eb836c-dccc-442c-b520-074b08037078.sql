
-- 1) Remove overly broad anon SELECT policies on visitor chat tables.
DROP POLICY IF EXISTS "anon read visitor messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "anon read visitor threads" ON public.ai_chat_threads;

-- 2) Pin search_path on pgmq wrapper functions flagged by the linter.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
