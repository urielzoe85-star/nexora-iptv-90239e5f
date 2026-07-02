
-- Bloc D closure: correlation IDs & target user for role-change auditing.
ALTER TABLE public.security_events
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS target_user_id uuid;

CREATE INDEX IF NOT EXISTS security_events_request_id_idx
  ON public.security_events(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS security_events_target_user_id_idx
  ON public.security_events(target_user_id) WHERE target_user_id IS NOT NULL;

-- Bloc E: atomic role change with last-admin protection & self-demote guard.
CREATE OR REPLACE FUNCTION public.admin_change_role(
  _actor_user_id uuid,
  _target_user_id uuid,
  _action text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_had_admin boolean;
  v_admin_count int;
  v_old_role text;
  v_new_role text;
BEGIN
  IF _action NOT IN ('grant_admin','revoke_admin') THEN
    RAISE EXCEPTION 'Invalid action: %', _action USING ERRCODE = '22023';
  END IF;
  IF _actor_user_id IS NULL OR _target_user_id IS NULL THEN
    RAISE EXCEPTION 'actor and target are required' USING ERRCODE = '22023';
  END IF;

  -- Serialize concurrent role changes: lock every admin row.
  PERFORM 1 FROM public.user_roles WHERE role = 'admin' FOR UPDATE;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _target_user_id AND role = 'admin'
  ) INTO v_had_admin;

  IF _action = 'grant_admin' THEN
    v_old_role := CASE WHEN v_had_admin THEN 'admin' ELSE 'none' END;
    v_new_role := 'admin';
    IF NOT v_had_admin THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (_target_user_id, 'admin');
    END IF;
  ELSE
    IF NOT v_had_admin THEN
      RAISE EXCEPTION 'Target user is not an admin' USING ERRCODE = 'P0002';
    END IF;
    IF _target_user_id = _actor_user_id THEN
      RAISE EXCEPTION 'You cannot revoke your own admin role' USING ERRCODE = 'P0001';
    END IF;
    SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last active administrator' USING ERRCODE = 'P0001';
    END IF;
    DELETE FROM public.user_roles
      WHERE user_id = _target_user_id AND role = 'admin';
    v_old_role := 'admin';
    v_new_role := 'none';
  END IF;

  RETURN jsonb_build_object(
    'old_role', v_old_role,
    'new_role', v_new_role,
    'admin_count', (SELECT count(*) FROM public.user_roles WHERE role = 'admin')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_role(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_change_role(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_role(uuid, uuid, text) TO service_role;
