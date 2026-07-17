DROP POLICY IF EXISTS blog_comments_public_read_approved ON public.blog_comments;

REVOKE SELECT ON public.blog_comments FROM anon;

CREATE OR REPLACE VIEW public.blog_comments_public
WITH (security_invoker = true) AS
SELECT id, post_id, parent_id, author_name, content, created_at
FROM public.blog_comments
WHERE status = 'approved';

GRANT SELECT ON public.blog_comments_public TO anon, authenticated;