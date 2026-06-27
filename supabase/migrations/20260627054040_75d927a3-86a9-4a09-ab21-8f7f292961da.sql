CREATE TABLE public.integration_debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connector_id text NOT NULL,
  operation text,
  method text NOT NULL,
  url text NOT NULL,
  request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body jsonb,
  status integer,
  response_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_body jsonb,
  duration_ms integer,
  attempts integer,
  ok boolean NOT NULL DEFAULT false,
  error text
);

CREATE INDEX integration_debug_logs_created_at_idx ON public.integration_debug_logs (created_at DESC);
CREATE INDEX integration_debug_logs_connector_idx ON public.integration_debug_logs (connector_id, created_at DESC);

GRANT SELECT, INSERT ON public.integration_debug_logs TO authenticated;
GRANT ALL ON public.integration_debug_logs TO service_role;

ALTER TABLE public.integration_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read integration debug logs"
  ON public.integration_debug_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert integration debug logs"
  ON public.integration_debug_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
