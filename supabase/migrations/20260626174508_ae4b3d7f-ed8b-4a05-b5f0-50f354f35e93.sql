
-- Phase 3 : Core Business Modules (tables only; storage bucket is created separately)

CREATE TABLE public.customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  full_name   text,
  phone       text,
  country     text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  notes       text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_email_idx   ON public.customers (lower(email));
CREATE INDEX customers_status_idx  ON public.customers (status);
CREATE INDEX customers_created_idx ON public.customers (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers admin all" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku          text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  price        numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency     text NOT NULL DEFAULT 'USD',
  category     text NOT NULL CHECK (category IN ('iptv','digital','service','license','subscription')),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  image_url    text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products (category);
CREATE INDEX products_status_idx   ON public.products (status);
CREATE INDEX products_created_idx  ON public.products (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products admin all" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','active','suspended','expired','cancelled')),
  started_at   timestamptz,
  expires_at   timestamptz,
  renewed_at   timestamptz,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_customer_idx ON public.subscriptions (customer_id);
CREATE INDEX subscriptions_status_idx   ON public.subscriptions (status);
CREATE INDEX subscriptions_expires_idx  ON public.subscriptions (expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions admin all" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','expired','converted','revoked')),
  expires_at   timestamptz,
  notes        text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trials_customer_idx ON public.trials (customer_id);
CREATE INDEX trials_status_idx   ON public.trials (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trials TO authenticated;
GRANT ALL ON public.trials TO service_role;
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trials admin all" ON public.trials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trials_set_updated_at
  BEFORE UPDATE ON public.trials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     text NOT NULL CHECK (channel IN ('email','whatsapp','telegram','sms','in_app')),
  recipient   text NOT NULL,
  subject     text,
  body        text,
  status      text NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','sent','failed')),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);
CREATE INDEX notifications_channel_idx ON public.notifications (channel);
CREATE INDEX notifications_status_idx  ON public.notifications (status);
CREATE INDEX notifications_created_idx ON public.notifications (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications admin all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.customer_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type         text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id     uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_events_customer_idx ON public.customer_events (customer_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_events TO authenticated;
GRANT ALL ON public.customer_events TO service_role;
ALTER TABLE public.customer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_events admin all" ON public.customer_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_customer_idx ON public.orders (customer_id);
