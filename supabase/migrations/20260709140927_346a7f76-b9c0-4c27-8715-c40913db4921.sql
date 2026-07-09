
REVOKE EXECUTE ON FUNCTION public._camerpay_selftest(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._camerpay_sign(_uuid text, _ref text, _status text, _amount text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='CAMERPAY_WEBHOOK_SECRET' LIMIT 1;
  IF v_secret IS NULL THEN RAISE EXCEPTION 'no secret'; END IF;
  RETURN encode(extensions.hmac((_uuid||'|'||_ref||'|'||_status||'|'||_amount)::bytea, v_secret::bytea, 'sha256'),'hex');
END;$$;
REVOKE EXECUTE ON FUNCTION public._camerpay_sign(text,text,text,text) FROM PUBLIC, anon, authenticated;
