REVOKE EXECUTE ON FUNCTION public.blog_publish_scheduled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.blog_publish_scheduled() TO service_role, postgres;