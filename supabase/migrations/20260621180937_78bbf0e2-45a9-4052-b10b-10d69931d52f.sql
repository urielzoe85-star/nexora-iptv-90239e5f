DROP POLICY IF EXISTS "Public can read orders" ON public.orders;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
GRANT ALL ON public.orders TO service_role;