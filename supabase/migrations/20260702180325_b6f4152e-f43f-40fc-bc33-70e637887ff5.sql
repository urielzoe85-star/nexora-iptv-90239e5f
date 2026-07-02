-- Sprint 2 · Bloc F — Secret registry + expiry alerting

CREATE TABLE IF NOT EXISTS public.secret_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  owner text NOT NULL,
  service text NOT NULL,
  environment text NOT NULL DEFAULT 'prod',
  criticality text NOT NULL CHECK (criticality IN ('low','medium','high','critical')),
  rotation_interval interval NOT NULL DEFAULT interval '180 days',
  last_rotated_at timestamptz,
  next_rotation_at timestamptz,
  vault_backed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.secret_registry TO authenticated;
GRANT ALL    ON public.secret_registry TO service_role;

ALTER TABLE public.secret_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secret_registry admin read"
  ON public.secret_registry FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "secret_registry service_role all"
  ON public.secret_registry FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.secret_registry_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_secret_registry_updated_at ON public.secret_registry;
CREATE TRIGGER trg_secret_registry_updated_at
  BEFORE UPDATE ON public.secret_registry
  FOR EACH ROW EXECUTE FUNCTION public.secret_registry_touch_updated_at();

-- Seed inventory (Bloc F matrix)
INSERT INTO public.secret_registry
  (name, owner, service, environment, criticality, rotation_interval, last_rotated_at, next_rotation_at, vault_backed, notes)
VALUES
  ('SEBPAY_SECRET_KEY',              'Payments Squad', 'sebpay webhook + verify', 'prod', 'critical', interval '90 days',  '2026-06-15', '2026-09-13', false, 'HMAC secret'),
  ('SEBPAY_PUBLIC_KEY',              'Payments Squad', 'checkout client',         'prod', 'low',      interval '90 days',  '2026-06-15', '2026-09-13', false, 'publishable'),
  ('MEGAOTT_BEARER_TOKEN',           'Ops IPTV',       'megaott adapter',         'prod', 'critical', interval '180 days', '2026-04-10', '2026-10-07', false, 'provider bearer'),
  ('NCC_ACCESS_PASSWORD',            'Ops',            'back-office gate',        'prod', 'high',     interval '365 days', '2026-05-30', '2027-05-30', false, 'rotate on turnover'),
  ('AUTOMATION_CRON_SECRET',         'Platform',       'automation queue',        'prod', 'high',     interval '180 days', '2026-05-05', '2026-11-01', false, 'bearer for /automation/process-queue'),
  ('EMAIL_CRON_SECRET',              'Platform',       'email queue dispatcher',  'prod', 'high',     interval '180 days', '2026-06-20', '2026-12-17', true,  'mirror: vault email_queue_cron_secret'),
  ('email_queue_service_role_key',   'Platform',       'pg_net email dispatch',   'prod', 'critical', interval '365 days', now(),         now() + interval '365 days', true, 'vault only; rotated with SRK'),
  ('LOVABLE_API_KEY',                'Platform',       'lovable ai gateway',      'prod', 'high',     interval '180 days', now(),         now() + interval '180 days', false, 'rotate via ai_gateway tool only'),
  ('TELEGRAM_API_KEY',               'Ops',            'telegram bot + alerts',   'prod', 'high',     interval '180 days', '2026-06-25', '2026-12-22', false, ''),
  ('SECURITY_ALERT_TELEGRAM_CHAT_ID','Ops',            'security-events alerts',  'prod', 'low',      interval '365 days', '2026-06-25', '2027-06-25', false, 'identifier, not secret'),
  ('SUPABASE_SERVICE_ROLE_KEY',      'Lovable Cloud',  'privileged writes',       'prod', 'critical', interval '365 days', now(),         now() + interval '365 days', false, 'managed by cloud')
ON CONFLICT (name) DO NOTHING;

-- Scanner: emits security_events for expired / expiring-soon secrets.
CREATE OR REPLACE FUNCTION public.secret_registry_scan()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_expired int := 0;
  v_soon    int := 0;
BEGIN
  FOR r IN
    SELECT name, criticality, next_rotation_at
    FROM public.secret_registry
    WHERE next_rotation_at IS NOT NULL
  LOOP
    IF r.next_rotation_at < now() THEN
      INSERT INTO public.security_events(event_type, severity, message, payload)
      VALUES (
        'secret.expired', 'critical',
        'Secret ' || r.name || ' expired on ' || r.next_rotation_at::text,
        jsonb_build_object('secret_name', r.name, 'criticality', r.criticality,
                           'next_rotation_at', r.next_rotation_at)
      );
      v_expired := v_expired + 1;
    ELSIF r.next_rotation_at < now() + interval '7 days' THEN
      INSERT INTO public.security_events(event_type, severity, message, payload)
      VALUES (
        'secret.expiring_soon', 'warn',
        'Secret ' || r.name || ' expires on ' || r.next_rotation_at::text,
        jsonb_build_object('secret_name', r.name, 'criticality', r.criticality,
                           'next_rotation_at', r.next_rotation_at)
      );
      v_soon := v_soon + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('expired', v_expired, 'expiring_soon', v_soon,
                            'scanned_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.secret_registry_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secret_registry_scan() TO service_role;

-- Schedule daily scan (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'secret-registry-scan-daily') THEN
    PERFORM cron.schedule(
      'secret-registry-scan-daily',
      '0 6 * * *',
      $cron$ SELECT public.secret_registry_scan(); $cron$
    );
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- pg_cron absent in local env; safe to ignore
  NULL;
END;
$$;