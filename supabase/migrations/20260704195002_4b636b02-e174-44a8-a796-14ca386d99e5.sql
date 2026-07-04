
-- Renewal plans
CREATE TABLE public.renewal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_months integer NOT NULL CHECK (duration_months > 0),
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'USD',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.renewal_plans TO anon, authenticated;
GRANT ALL ON public.renewal_plans TO service_role;
ALTER TABLE public.renewal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active renewal plans" ON public.renewal_plans
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage renewal plans" ON public.renewal_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER renewal_plans_set_updated_at BEFORE UPDATE ON public.renewal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.renewal_plans (duration_months, name, price, currency, sort_order) VALUES
  (1, '1 mois', 10, 'USD', 1),
  (3, '3 mois', 27, 'USD', 2),
  (6, '6 mois', 50, 'USD', 3),
  (12, '12 mois', 90, 'USD', 4);

-- Portal announcements
CREATE TABLE public.portal_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portal_announcements TO anon, authenticated;
GRANT ALL ON public.portal_announcements TO service_role;
ALTER TABLE public.portal_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active announcements" ON public.portal_announcements
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage announcements" ON public.portal_announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER portal_announcements_set_updated_at BEFORE UPDATE ON public.portal_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OTP codes for portal login
CREATE TABLE public.client_portal_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  ip text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_portal_otps_email_idx ON public.client_portal_otps (email, created_at DESC);
GRANT ALL ON public.client_portal_otps TO service_role;
ALTER TABLE public.client_portal_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read otps" ON public.client_portal_otps
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Portal sessions (cookie-based, no auth.users required)
CREATE TABLE public.client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX client_portal_sessions_customer_idx ON public.client_portal_sessions (customer_id);
CREATE INDEX client_portal_sessions_expires_idx ON public.client_portal_sessions (expires_at);
GRANT ALL ON public.client_portal_sessions TO service_role;
ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sessions" ON public.client_portal_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
