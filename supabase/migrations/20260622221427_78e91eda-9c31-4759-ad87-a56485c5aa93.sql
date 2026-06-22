DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Public can read non-sensitive site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key IN ('contact', 'hero', 'social'));