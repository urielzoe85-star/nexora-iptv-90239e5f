
CREATE OR REPLACE FUNCTION public._camerpay_selftest(_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_secret text;
  v_uuid text := 'selftest-' || _ref;
  v_status text := 'completed';
  v_amount text := '1000';
  v_sig text;
  v_body text;
  v_req bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'CAMERPAY_WEBHOOK_SECRET' LIMIT 1;
  IF v_secret IS NULL THEN RAISE EXCEPTION 'CAMERPAY_WEBHOOK_SECRET not in vault'; END IF;

  v_sig := encode(extensions.hmac(
    (v_uuid || '|' || _ref || '|' || v_status || '|' || v_amount)::bytea,
    v_secret::bytea, 'sha256'), 'hex');

  v_body := 'uuid=' || v_uuid
         || '&invoice_id=' || _ref
         || '&status=' || v_status
         || '&amount=' || v_amount
         || '&signature=' || v_sig;

  SELECT net.http_post(
    url := 'https://nexora-iptv.lovable.app/api/public/camerpay/webhook',
    headers := jsonb_build_object(
      'Content-Type','application/x-www-form-urlencoded',
      'X-CamerPay-Event-Id','evt-' || _ref),
    body := v_body::jsonb  -- pg_net expects jsonb; wrong for form body
  ) INTO v_req;
  RETURN jsonb_build_object('request_id', v_req, 'signature', v_sig);
END; $$;
