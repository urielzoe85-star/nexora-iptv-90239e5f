
-- 1) Orders: lock down sensitive columns at the GRANT level so a future
--    permissive SELECT policy cannot accidentally expose credentials/admin_notes.
REVOKE SELECT ON public.orders FROM anon, authenticated;
GRANT SELECT (id, order_ref, email, full_name, plan_id, plan_name, amount, currency, method, status, sebpay_reference, created_at, updated_at)
  ON public.orders TO authenticated;
-- anon gets no SELECT at all on orders.

-- 2) user_roles: drop authenticated write capability entirely.
--    All role mutations happen via the service-role admin functions.
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
-- Keep: "Users can read their own roles" SELECT policy.

-- 3) plans: drop authenticated admin write policies. Admin writes go through
--    service-role (supabaseAdmin) which bypasses RLS.
DROP POLICY IF EXISTS "Admins can insert plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.plans;
CREATE POLICY "Anyone can read active plans" ON public.plans
  FOR SELECT TO anon, authenticated
  USING (active = true);
REVOKE INSERT, UPDATE, DELETE ON public.plans FROM anon, authenticated;

-- 4) site_settings: same treatment.
DROP POLICY IF EXISTS "Admins can upsert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.site_settings;
REVOKE INSERT, UPDATE, DELETE ON public.site_settings FROM anon, authenticated;

-- 5) has_role: revoke EXECUTE from anon/authenticated/public. Only
--    service_role (used by server-side admin checks) can call it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
