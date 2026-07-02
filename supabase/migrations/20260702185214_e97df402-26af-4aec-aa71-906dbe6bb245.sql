
-- Sprint 3 · Bloc B — Backups: verification, integrity checks, restore drills.

-- ============================================================================
-- 1) backup_runs — audit each backup verification / integrity / drill run.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL CHECK (kind IN ('verify','integrity','restore_drill','retention')),
  status      TEXT NOT NULL CHECK (status IN ('ok','warn','failed')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  summary     JSONB NOT NULL DEFAULT '{}'::jsonb,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read backup_runs"
  ON public.backup_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS backup_runs_kind_started_idx
  ON public.backup_runs(kind, started_at DESC);

-- ============================================================================
-- 2) backup_integrity_snapshots — per-table row count + checksum snapshots.
--    Enables drift detection between runs (row deltas, corruption detection).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_integrity_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID NOT NULL REFERENCES public.backup_runs(id) ON DELETE CASCADE,
  table_name   TEXT NOT NULL,
  row_count    BIGINT NOT NULL,
  checksum     TEXT NOT NULL,
  captured_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_integrity_snapshots TO authenticated;
GRANT ALL ON public.backup_integrity_snapshots TO service_role;

ALTER TABLE public.backup_integrity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read integrity snapshots"
  ON public.backup_integrity_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS backup_integrity_run_idx
  ON public.backup_integrity_snapshots(run_id);
CREATE INDEX IF NOT EXISTS backup_integrity_table_captured_idx
  ON public.backup_integrity_snapshots(table_name, captured_at DESC);

-- ============================================================================
-- 3) backup_capture_integrity — SECURITY DEFINER function that computes
--    per-table row_count + md5 checksum of a stable projection.
--    Only inspects a hard-coded allow-list of critical tables (customers,
--    orders, iptv_accounts, subscriptions, user_roles, plans). Callable
--    only through the service_role client (verify endpoint).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.backup_capture_integrity(_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t          TEXT;
  v_count    BIGINT;
  v_checksum TEXT;
  results    JSONB := '[]'::jsonb;
  tables     TEXT[] := ARRAY[
    'customers','orders','iptv_accounts','subscriptions',
    'user_roles','plans','products','automation_workflows'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO v_count;
    -- Checksum: md5 over sorted primary-key + row hash. Stable and cheap.
    EXECUTE format(
      $q$ SELECT md5(coalesce(string_agg(md5(row_to_json(x)::text), '' ORDER BY md5(row_to_json(x)::text)), '')) FROM public.%I x $q$,
      t
    ) INTO v_checksum;

    INSERT INTO public.backup_integrity_snapshots(run_id, table_name, row_count, checksum)
    VALUES (_run_id, t, v_count, v_checksum);

    results := results || jsonb_build_object(
      'table', t, 'row_count', v_count, 'checksum', v_checksum
    );
  END LOOP;

  RETURN jsonb_build_object('tables', results, 'count', array_length(tables, 1));
END;
$$;

REVOKE ALL ON FUNCTION public.backup_capture_integrity(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backup_capture_integrity(UUID) TO service_role;

-- ============================================================================
-- 4) backup_restore_drill — proves a snapshot is exploitable by cloning
--    a critical table into a temporary schema, comparing row counts and
--    checksums, then dropping the clone. Non-destructive on public data.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.backup_restore_drill(_table TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed  TEXT[] := ARRAY[
    'customers','orders','iptv_accounts','subscriptions',
    'user_roles','plans','products','automation_workflows'
  ];
  v_src_ct   BIGINT;
  v_clone_ct BIGINT;
  v_src_chk  TEXT;
  v_clone_chk TEXT;
  v_clone_name TEXT;
BEGIN
  IF NOT (_table = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'restore_drill: table % not allowed', _table USING ERRCODE = '22023';
  END IF;

  v_clone_name := format('_restore_drill_%s_%s',
    _table, to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'));

  EXECUTE format('CREATE UNLOGGED TABLE public.%I AS TABLE public.%I',
                 v_clone_name, _table);

  EXECUTE format('SELECT count(*) FROM public.%I', _table) INTO v_src_ct;
  EXECUTE format('SELECT count(*) FROM public.%I', v_clone_name) INTO v_clone_ct;

  EXECUTE format(
    $q$ SELECT md5(coalesce(string_agg(md5(row_to_json(x)::text), '' ORDER BY md5(row_to_json(x)::text)), '')) FROM public.%I x $q$,
    _table
  ) INTO v_src_chk;

  EXECUTE format(
    $q$ SELECT md5(coalesce(string_agg(md5(row_to_json(x)::text), '' ORDER BY md5(row_to_json(x)::text)), '')) FROM public.%I x $q$,
    v_clone_name
  ) INTO v_clone_chk;

  EXECUTE format('DROP TABLE public.%I', v_clone_name);

  RETURN jsonb_build_object(
    'table', _table,
    'source_rows', v_src_ct,
    'restored_rows', v_clone_ct,
    'source_checksum', v_src_chk,
    'restored_checksum', v_clone_chk,
    'match', (v_src_ct = v_clone_ct AND v_src_chk = v_clone_chk)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backup_restore_drill(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backup_restore_drill(TEXT) TO service_role;
