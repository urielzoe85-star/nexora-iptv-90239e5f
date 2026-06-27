-- Automation Engine v1.6 tables

CREATE TABLE public.automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  trigger_event text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_workflows TO authenticated;
GRANT ALL ON public.automation_workflows TO service_role;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_workflows admin all" ON public.automation_workflows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER automation_workflows_set_updated_at BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.automation_workflows(id) ON DELETE SET NULL,
  workflow_key text NOT NULL,
  trigger_event text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  error text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_runs admin all" ON public.automation_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX automation_runs_workflow_key_idx ON public.automation_runs(workflow_key);
CREATE INDEX automation_runs_status_idx ON public.automation_runs(status);
CREATE INDEX automation_runs_created_at_idx ON public.automation_runs(created_at DESC);
CREATE TRIGGER automation_runs_set_updated_at BEFORE UPDATE ON public.automation_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.automation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_steps TO authenticated;
GRANT ALL ON public.automation_steps TO service_role;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_steps admin all" ON public.automation_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX automation_steps_run_id_idx ON public.automation_steps(run_id);

CREATE TABLE public.automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key text NOT NULL,
  trigger_event text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_queue TO authenticated;
GRANT ALL ON public.automation_queue TO service_role;
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_queue admin all" ON public.automation_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX automation_queue_status_sched_idx ON public.automation_queue(status, scheduled_at);
CREATE TRIGGER automation_queue_set_updated_at BEFORE UPDATE ON public.automation_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default workflows
INSERT INTO public.automation_workflows (key, name, description, enabled, trigger_event, definition) VALUES
  ('order-created', 'Nouvelle commande', 'Journalise la commande et prépare le traitement du paiement.', true, 'order.created', '{}'::jsonb),
  ('payment-confirmed', 'Paiement confirmé', 'Crée l''abonnement IPTV via MEGAOTT et finalise la commande.', true, 'payment.confirmed', '{}'::jsonb),
  ('payment-failed', 'Paiement échoué', 'Marque la commande en échec et journalise.', true, 'payment.failed', '{}'::jsonb),
  ('subscription-renewal', 'Renouvellement', 'Prolonge l''abonnement via MEGAOTT.', true, 'subscription.renewed', '{}'::jsonb),
  ('subscription-activate', 'Activation', 'Active automatiquement un abonnement.', true, 'subscription.activated', '{}'::jsonb),
  ('subscription-suspend', 'Suspension', 'Suspend automatiquement un abonnement.', true, 'subscription.suspended', '{}'::jsonb);
