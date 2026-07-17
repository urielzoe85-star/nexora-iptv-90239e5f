-- Public read access to blog-media objects
CREATE POLICY "blog_media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-media');

CREATE POLICY "blog_media_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'blog-media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'blog-media' AND public.has_role(auth.uid(), 'admin'));