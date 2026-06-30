
CREATE OR REPLACE FUNCTION public._tmp_get_email_cron_secret()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_cron_secret' LIMIT 1
$$;
