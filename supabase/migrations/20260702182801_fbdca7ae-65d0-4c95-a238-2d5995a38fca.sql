
-- Sprint 3 · Bloc A — Billing lifecycle: dunning, lifecycle audit, metrics.

-- 1) Dunning idempotency table: prevents duplicate J+1/J+3/J+7 emails.
CREATE TABLE IF NOT EXISTS public.payment_dunning_sent (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL,
  customer_id  UUID,
  milestone_days SMALLINT NOT NULL CHECK (milestone_days IN (1, 3, 7)),
  failed_at    TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_dunning_sent_unique UNIQUE (order_id, milestone_days, failed_at)
);
GRANT SELECT ON public.payment_dunning_sent TO authenticated;
GRANT ALL    ON public.payment_dunning_sent TO service_role;
ALTER TABLE public.payment_dunning_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read payment_dunning_sent"
  ON public.payment_dunning_sent FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Lifecycle audit table: every state transition of an IPTV account.
CREATE TABLE IF NOT EXISTS public.iptv_lifecycle_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL,
  from_state   TEXT,
  to_state     TEXT NOT NULL,
  reason       TEXT NOT NULL,
  actor        TEXT NOT NULL DEFAULT 'system',
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS iptv_lifecycle_events_account_idx
  ON public.iptv_lifecycle_events (account_id, created_at DESC);
GRANT SELECT ON public.iptv_lifecycle_events TO authenticated;
GRANT ALL    ON public.iptv_lifecycle_events TO service_role;
ALTER TABLE public.iptv_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read iptv_lifecycle_events"
  ON public.iptv_lifecycle_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Metrics view — aggregated observability for the billing cycle.
CREATE OR REPLACE VIEW public.billing_metrics_daily AS
SELECT
  d::date AS day,
  (SELECT count(*) FROM public.renewal_reminders_sent r WHERE r.sent_at::date = d::date)   AS reminders_sent,
  (SELECT count(*) FROM public.payment_dunning_sent   p WHERE p.sent_at::date = d::date)   AS dunning_sent,
  (SELECT count(*) FROM public.iptv_lifecycle_events  l WHERE l.created_at::date = d::date AND l.to_state = 'suspended') AS suspensions,
  (SELECT count(*) FROM public.iptv_lifecycle_events  l WHERE l.created_at::date = d::date AND l.to_state = 'active'    AND l.reason = 'reactivation') AS reactivations
FROM generate_series(current_date - INTERVAL '30 days', current_date, INTERVAL '1 day') d;
GRANT SELECT ON public.billing_metrics_daily TO authenticated;
