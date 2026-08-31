-- Durable Nexora plan -> MegaOTT package mapping.
-- Orders use public.plans.slug in orders.plan_id (not products.id).
CREATE TABLE IF NOT EXISTS public.iptv_provider_plan_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  plan_id text NOT NULL,
  provider_package_id text NOT NULL,
  duration_months integer NOT NULL CHECK (duration_months > 0),
  max_connections integer CHECK (max_connections IS NULL OR max_connections > 0),
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT iptv_provider_plan_mappings_provider_plan_key UNIQUE (provider, plan_id)
);

CREATE INDEX IF NOT EXISTS iptv_provider_plan_mappings_lookup_idx
  ON public.iptv_provider_plan_mappings (provider, plan_id, enabled);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iptv_provider_plan_mappings TO authenticated;
GRANT ALL ON public.iptv_provider_plan_mappings TO service_role;
ALTER TABLE public.iptv_provider_plan_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage IPTV provider plan mappings"
  ON public.iptv_provider_plan_mappings;
CREATE POLICY "Admins manage IPTV provider plan mappings"
  ON public.iptv_provider_plan_mappings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS iptv_provider_plan_mappings_set_updated_at
  ON public.iptv_provider_plan_mappings;
CREATE TRIGGER iptv_provider_plan_mappings_set_updated_at
  BEFORE UPDATE ON public.iptv_provider_plan_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed only plans that are actually present in public.plans. If an operator
-- removed a duration, no artificial mapping row is created.
INSERT INTO public.iptv_provider_plan_mappings
  (provider, plan_id, provider_package_id, duration_months, enabled, metadata)
SELECT 'megaott', p.slug,
       CASE p.slug
         WHEN '1m' THEN '4'
         WHEN '3m' THEN '6'
         WHEN '6m' THEN '3'
         WHEN '12m' THEN '5'
       END,
       CASE p.slug
         WHEN '1m' THEN 1
         WHEN '3m' THEN 3
         WHEN '6m' THEN 6
         WHEN '12m' THEN 12
       END,
       true,
       jsonb_build_object('source', 'megaott-official-package-mapping')
FROM public.plans p
WHERE p.slug IN ('1m', '3m', '6m', '12m')
  AND p.active = true
ON CONFLICT (provider, plan_id) DO NOTHING;
