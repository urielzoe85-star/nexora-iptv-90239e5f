-- Add MEGAOTT export columns to iptv_accounts for native import format
ALTER TABLE public.iptv_accounts
  ADD COLUMN IF NOT EXISTS mac TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS owner TEXT,
  ADD COLUMN IF NOT EXISTS paid BOOLEAN,
  ADD COLUMN IF NOT EXISTS trial BOOLEAN,
  ADD COLUMN IF NOT EXISTS forced_country TEXT,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS admin_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ip TEXT,
  ADD COLUMN IF NOT EXISTS reseller_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS source_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS iptv_accounts_username_lower_idx ON public.iptv_accounts (lower(username));
CREATE INDEX IF NOT EXISTS iptv_accounts_paid_idx ON public.iptv_accounts (paid);
CREATE INDEX IF NOT EXISTS iptv_accounts_trial_idx ON public.iptv_accounts (trial);