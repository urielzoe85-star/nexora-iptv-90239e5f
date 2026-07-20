
CREATE TABLE public.blog_post_redirects (
  old_slug text PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_post_redirects TO anon, authenticated;
GRANT ALL ON public.blog_post_redirects TO service_role;
ALTER TABLE public.blog_post_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_blog_redirects" ON public.blog_post_redirects FOR SELECT TO anon, authenticated USING (true);

-- Backfill: save old slugs before renaming
INSERT INTO public.blog_post_redirects (old_slug, post_id)
SELECT slug, id FROM public.blog_posts
WHERE slug IN (
  'best-iptv-for-sports-in-2026-watch-live-games-without-cable',
  'how-to-install-iptv-on-fire-tv-stick-2026-guide-nexora-iptv'
)
ON CONFLICT (old_slug) DO NOTHING;

-- Rename slugs to match canonical URLs
UPDATE public.blog_posts SET slug = 'best-iptv-for-sports-2026'
 WHERE slug = 'best-iptv-for-sports-in-2026-watch-live-games-without-cable';
UPDATE public.blog_posts SET slug = 'how-to-install-iptv-on-fire-tv-stick'
 WHERE slug = 'how-to-install-iptv-on-fire-tv-stick-2026-guide-nexora-iptv';
