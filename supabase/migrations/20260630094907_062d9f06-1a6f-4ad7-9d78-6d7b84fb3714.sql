
CREATE OR REPLACE FUNCTION public.verify_email_cron_secret(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_expected TEXT;
BEGIN
  SELECT decrypted_secret INTO v_expected
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_cron_secret'
  LIMIT 1;
  IF v_expected IS NULL OR _token IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN v_expected = _token;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_email_cron_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_cron_secret(TEXT) TO service_role;
