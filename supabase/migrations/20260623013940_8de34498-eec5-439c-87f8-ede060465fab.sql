-- Explicitly block anonymous INSERTs on orders (defense-in-depth, was implicit)
CREATE POLICY "Block anonymous order inserts"
ON public.orders
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

-- Prevent duplicate/conflicting role assignments for the same user
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);