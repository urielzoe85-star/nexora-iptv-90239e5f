
ALTER TABLE public.iptv_accounts
  ADD COLUMN IF NOT EXISTS package text,
  ADD COLUMN IF NOT EXISTS dns_link text,
  ADD COLUMN IF NOT EXISTS dns_link_samsung_lg text,
  ADD COLUMN IF NOT EXISTS portal_link text,
  ADD COLUMN IF NOT EXISTS mac_address text,
  ADD COLUMN IF NOT EXISTS max_connections integer,
  ADD COLUMN IF NOT EXISTS megaott_subscription_id text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS iptv_accounts_megaott_id_uniq
  ON public.iptv_accounts (megaott_subscription_id)
  WHERE megaott_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS iptv_accounts_active_order_uniq
  ON public.iptv_accounts (order_id)
  WHERE order_id IS NOT NULL AND status IN ('assigned','delivered','reserved','active');

CREATE INDEX IF NOT EXISTS iptv_accounts_package_idx ON public.iptv_accounts (package);
CREATE INDEX IF NOT EXISTS iptv_accounts_order_idx   ON public.iptv_accounts (order_id);

CREATE TABLE IF NOT EXISTS public.iptv_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_format text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mapping_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iptv_import_batches TO authenticated;
GRANT ALL ON public.iptv_import_batches TO service_role;
ALTER TABLE public.iptv_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iptv_import_batches admin all" ON public.iptv_import_batches;
CREATE POLICY "iptv_import_batches admin all" ON public.iptv_import_batches
  TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS iptv_import_batches_set_updated_at ON public.iptv_import_batches;
CREATE TRIGGER iptv_import_batches_set_updated_at
  BEFORE UPDATE ON public.iptv_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.iptv_accounts
  DROP CONSTRAINT IF EXISTS iptv_accounts_import_batch_fk;
ALTER TABLE public.iptv_accounts
  ADD CONSTRAINT iptv_accounts_import_batch_fk
  FOREIGN KEY (import_batch_id) REFERENCES public.iptv_import_batches(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.iptv_import_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iptv_import_mappings TO authenticated;
GRANT ALL ON public.iptv_import_mappings TO service_role;
ALTER TABLE public.iptv_import_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iptv_import_mappings admin all" ON public.iptv_import_mappings;
CREATE POLICY "iptv_import_mappings admin all" ON public.iptv_import_mappings
  TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS iptv_import_mappings_set_updated_at ON public.iptv_import_mappings;
CREATE TRIGGER iptv_import_mappings_set_updated_at
  BEFORE UPDATE ON public.iptv_import_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
