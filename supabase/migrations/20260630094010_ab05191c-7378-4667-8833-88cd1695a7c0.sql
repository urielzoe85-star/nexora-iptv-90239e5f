
DO $$
DECLARE
  v_secret TEXT;
BEGIN
  -- Generate dedicated cron secret; create or update the vault entry.
  v_secret := encode(gen_random_bytes(32), 'hex');
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'email_queue_cron_secret') THEN
    PERFORM vault.update_secret(
      (SELECT id FROM vault.secrets WHERE name = 'email_queue_cron_secret'),
      v_secret,
      'email_queue_cron_secret'
    );
  ELSE
    PERFORM vault.create_secret(v_secret, 'email_queue_cron_secret');
  END IF;
END $$;

-- Unschedule existing job (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    PERFORM cron.unschedule('process-email-queue');
  END IF;
END $$;

-- Recreate cron job using the dedicated cron secret instead of the service role key.
SELECT cron.schedule(
  'process-email-queue',
  '5 seconds',
  $cron$
  SELECT CASE
    WHEN (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now()
      THEN NULL
    WHEN EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
      OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails LIMIT 1)
      THEN net.http_post(
        url := 'https://project--0416ff55-1348-453a-b816-d3632a19f8ae.lovable.app/lovable/email/queue/process',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Lovable-Context', 'cron',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'email_queue_cron_secret'
          )
        ),
        body := '{}'::jsonb
      )
    ELSE NULL
  END;
  $cron$
);

-- Optional cleanup of the old service-role vault entry (no longer used by this cron job).
DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
