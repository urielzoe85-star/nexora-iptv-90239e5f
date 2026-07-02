
-- Bloc A — Sprint 2 : resserrer les policies "TO public + auth.role()=service_role"
-- vers "TO service_role" pour rendre l'intent explicite. Aucun changement fonctionnel :
-- service_role bypasse RLS et n'était de toute façon jamais bloqué.

-- email_send_log
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log"   ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "email_send_log service_role insert" ON public.email_send_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "email_send_log service_role select" ON public.email_send_log
  FOR SELECT TO service_role USING (true);
CREATE POLICY "email_send_log service_role update" ON public.email_send_log
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- email_send_state
DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "email_send_state service_role all" ON public.email_send_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- email_unsubscribe_tokens
DROP POLICY IF EXISTS "Service role can insert tokens"       ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can read tokens"         ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "email_unsubscribe_tokens service_role insert" ON public.email_unsubscribe_tokens
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "email_unsubscribe_tokens service_role select" ON public.email_unsubscribe_tokens
  FOR SELECT TO service_role USING (true);
CREATE POLICY "email_unsubscribe_tokens service_role update" ON public.email_unsubscribe_tokens
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- suppressed_emails
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails"   ON public.suppressed_emails;
CREATE POLICY "suppressed_emails service_role insert" ON public.suppressed_emails
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "suppressed_emails service_role select" ON public.suppressed_emails
  FOR SELECT TO service_role USING (true);
