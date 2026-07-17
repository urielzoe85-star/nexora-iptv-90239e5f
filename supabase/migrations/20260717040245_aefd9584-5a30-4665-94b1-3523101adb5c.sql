
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.client_portal_password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cppr_email ON public.client_portal_password_resets(email);
CREATE INDEX IF NOT EXISTS idx_cppr_expires ON public.client_portal_password_resets(expires_at);

GRANT ALL ON public.client_portal_password_resets TO service_role;
ALTER TABLE public.client_portal_password_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access cppr" ON public.client_portal_password_resets FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.client_portal_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpla_email_created ON public.client_portal_login_attempts(email, created_at DESC);

GRANT ALL ON public.client_portal_login_attempts TO service_role;
ALTER TABLE public.client_portal_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access cpla" ON public.client_portal_login_attempts FOR ALL TO authenticated USING (false) WITH CHECK (false);
