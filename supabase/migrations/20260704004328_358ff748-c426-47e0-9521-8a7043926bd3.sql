CREATE OR REPLACE FUNCTION public.verify_email_cron_secret(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  v_expected TEXT;
BEGIN
  IF _token IS NULL OR length(_token) = 0 THEN
    RETURN FALSE;
  END IF;

  SELECT decrypted_secret INTO v_expected
  FROM vault.decrypted_secrets
  WHERE name IN ('email_queue_cron_secret', 'email_queue_service_role_key')
    AND decrypted_secret = _token
  LIMIT 1;

  RETURN v_expected IS NOT NULL;
END;
$function$;