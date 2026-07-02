-- Sprint 2 / Bloc D — Security audit trail
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NULL,
  route TEXT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux admins
CREATE POLICY "security_events admin read"
ON public.security_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Écriture réservée à service_role (aucune policy pour authenticated/anon)
CREATE POLICY "security_events service write"
ON public.security_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX idx_security_events_created_at ON public.security_events (created_at DESC);
CREATE INDEX idx_security_events_type_severity ON public.security_events (event_type, severity, created_at DESC);
CREATE INDEX idx_security_events_actor ON public.security_events (actor_user_id, created_at DESC);