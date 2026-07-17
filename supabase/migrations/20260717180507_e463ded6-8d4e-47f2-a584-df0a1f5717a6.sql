-- ============================================================
-- Blog / CMS module
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.blog_post_status AS ENUM ('draft','scheduled','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blog_comment_status AS ENUM ('pending','approved','spam','trash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Categories ----------
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
GRANT ALL ON public.blog_categories TO service_role;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_categories_public_read" ON public.blog_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blog_categories_admin_write" ON public.blog_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Tags ----------
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_tags TO authenticated;
GRANT ALL ON public.blog_tags TO service_role;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_tags_public_read" ON public.blog_tags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blog_tags_admin_write" ON public.blog_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_blog_tags_updated_at
  BEFORE UPDATE ON public.blog_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Posts ----------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'fr',
  excerpt TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_image_url TEXT,
  cover_image_alt TEXT,
  reading_time_min INT NOT NULL DEFAULT 1,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  -- SEO
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  noindex BOOLEAN NOT NULL DEFAULT false,
  twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
  -- Publication
  status public.blog_post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  -- Stats
  view_count BIGINT NOT NULL DEFAULT 0,
  -- Comments
  comments_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Future
  translation_of UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (locale, slug)
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public: only published & date reached
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= now());

-- Admin: full read/write
CREATE POLICY "blog_posts_admin_read" ON public.blog_posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "blog_posts_admin_write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON public.blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts (category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_locale ON public.blog_posts (locale);
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled ON public.blog_posts (scheduled_at)
  WHERE status = 'scheduled';

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Post <-> Tags ----------
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
GRANT SELECT ON public.blog_post_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_tags TO authenticated;
GRANT ALL ON public.blog_post_tags TO service_role;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_post_tags_public_read" ON public.blog_post_tags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blog_post_tags_admin_write" ON public.blog_post_tags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- Post images gallery ----------
CREATE TABLE IF NOT EXISTS public.blog_post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_post_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_post_images TO authenticated;
GRANT ALL ON public.blog_post_images TO service_role;
ALTER TABLE public.blog_post_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_post_images_public_read" ON public.blog_post_images
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blog_post_images_admin_write" ON public.blog_post_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- Comments (V1: back only) ----------
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status public.blog_comment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT ALL ON public.blog_comments TO service_role;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_comments_public_read_approved" ON public.blog_comments
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "blog_comments_admin_all" ON public.blog_comments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_blog_comments_updated_at
  BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Blog settings singleton ----------
CREATE TABLE IF NOT EXISTS public.blog_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  comments_globally_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_settings TO authenticated;
GRANT ALL ON public.blog_settings TO service_role;
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_settings_public_read" ON public.blog_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blog_settings_admin_write" ON public.blog_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_blog_settings_updated_at
  BEFORE UPDATE ON public.blog_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.blog_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------- Scheduled publish function + cron ----------
CREATE OR REPLACE FUNCTION public.blog_publish_scheduled()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH due AS (
    SELECT id FROM public.blog_posts
     WHERE status = 'scheduled'
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= now()
  )
  UPDATE public.blog_posts p
     SET status = 'published',
         published_at = COALESCE(p.published_at, now()),
         updated_at = now()
    FROM due
   WHERE p.id = due.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

DO $$ BEGIN
  PERFORM cron.unschedule('blog-publish-scheduled');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'blog-publish-scheduled',
  '*/5 * * * *',
  $$ SELECT public.blog_publish_scheduled(); $$
);

-- ---------- Seed default categories ----------
INSERT INTO public.blog_categories (slug, name, sort_order) VALUES
  ('installation', 'Installation', 1),
  ('tutoriels', 'Tutoriels', 2),
  ('smart-tv', 'Smart TV', 3),
  ('fire-tv', 'Fire TV', 4),
  ('android', 'Android', 5),
  ('iphone', 'iPhone', 6),
  ('paiement', 'Paiement', 7),
  ('faq', 'FAQ', 8),
  ('nouveautes', 'Nouveautés', 9),
  ('actualites', 'Actualités', 10)
ON CONFLICT (slug) DO NOTHING;
