CREATE TABLE IF NOT EXISTS public.sitemap_cache_state (
  id smallint PRIMARY KEY DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sitemap_cache_state_singleton CHECK (id = 1)
);

GRANT SELECT ON public.sitemap_cache_state TO anon, authenticated;
GRANT ALL ON public.sitemap_cache_state TO service_role;

ALTER TABLE public.sitemap_cache_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sitemap cache state"
  ON public.sitemap_cache_state FOR SELECT
  USING (true);

INSERT INTO public.sitemap_cache_state (id, updated_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;