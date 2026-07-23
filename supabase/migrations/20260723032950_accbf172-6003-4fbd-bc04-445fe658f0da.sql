CREATE TABLE public.ai_blog_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  topic TEXT NOT NULL,
  angle TEXT,
  format TEXT NOT NULL DEFAULT 'guide',
  length TEXT NOT NULL DEFAULT 'medium',
  locale TEXT NOT NULL DEFAULT 'fr',
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  cta_target TEXT,
  seo_score INT,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_blog_suggestions_batch_idx ON public.ai_blog_suggestions(batch_id, created_at DESC);
CREATE INDEX ai_blog_suggestions_status_idx ON public.ai_blog_suggestions(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_blog_suggestions TO authenticated;
GRANT ALL ON public.ai_blog_suggestions TO service_role;

ALTER TABLE public.ai_blog_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ai_blog_suggestions" ON public.ai_blog_suggestions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write ai_blog_suggestions" ON public.ai_blog_suggestions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ai_blog_suggestions_set_updated_at
  BEFORE UPDATE ON public.ai_blog_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();