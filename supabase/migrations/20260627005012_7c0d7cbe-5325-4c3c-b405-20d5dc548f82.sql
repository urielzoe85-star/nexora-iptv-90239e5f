
-- =========================================================
-- IPTV Automation Engine (Phase 1.4)
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.iptv_provider_status AS ENUM ('active','inactive','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.iptv_account_type AS ENUM ('trial','premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.iptv_account_status AS ENUM ('available','assigned','active','expired','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------
-- iptv_providers
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.iptv_providers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  api_url      text,
  panel_url    text,
  api_key      text,
  username     text,
  password     text,
  status       public.iptv_provider_status NOT NULL DEFAULT 'inactive',
  is_default   boolean NOT NULL DEFAULT false,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS iptv_providers_name_key ON public.iptv_providers (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS iptv_providers_one_default
  ON public.iptv_providers ((1)) WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iptv_providers TO authenticated;
GRANT ALL ON public.iptv_providers TO service_role;

ALTER TABLE public.iptv_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iptv_providers admin all"
  ON public.iptv_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER iptv_providers_set_updated_at
  BEFORE UPDATE ON public.iptv_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------
-- iptv_accounts
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.iptv_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid REFERENCES public.iptv_providers(id) ON DELETE SET NULL,
  customer_id   uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  username      text NOT NULL,
  password      text,
  account_type  public.iptv_account_type NOT NULL DEFAULT 'premium',
  bouquet       text,
  status        public.iptv_account_status NOT NULL DEFAULT 'available',
  expires_at    timestamptz,
  assigned_at   timestamptz,
  notes         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS iptv_accounts_provider_username_key
  ON public.iptv_accounts (provider_id, lower(username));
CREATE INDEX IF NOT EXISTS iptv_accounts_status_idx ON public.iptv_accounts (status);
CREATE INDEX IF NOT EXISTS iptv_accounts_type_idx   ON public.iptv_accounts (account_type);
CREATE INDEX IF NOT EXISTS iptv_accounts_expires_idx ON public.iptv_accounts (expires_at);
CREATE INDEX IF NOT EXISTS iptv_accounts_customer_idx ON public.iptv_accounts (customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iptv_accounts TO authenticated;
GRANT ALL ON public.iptv_accounts TO service_role;

ALTER TABLE public.iptv_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iptv_accounts admin all"
  ON public.iptv_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER iptv_accounts_set_updated_at
  BEFORE UPDATE ON public.iptv_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------
-- iptv_logs
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.iptv_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid REFERENCES public.iptv_providers(id) ON DELETE SET NULL,
  account_id   uuid REFERENCES public.iptv_accounts(id) ON DELETE SET NULL,
  actor_id     uuid,
  action       text NOT NULL,
  message      text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS iptv_logs_created_idx ON public.iptv_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS iptv_logs_action_idx  ON public.iptv_logs (action);
CREATE INDEX IF NOT EXISTS iptv_logs_account_idx ON public.iptv_logs (account_id);

GRANT SELECT, INSERT ON public.iptv_logs TO authenticated;
GRANT ALL ON public.iptv_logs TO service_role;

ALTER TABLE public.iptv_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iptv_logs admin read"
  ON public.iptv_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "iptv_logs admin insert"
  ON public.iptv_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
