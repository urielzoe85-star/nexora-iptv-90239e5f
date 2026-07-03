
CREATE OR REPLACE FUNCTION public.automation_reclaim_stuck(_older_than_seconds int DEFAULT 300)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH stuck AS (
    SELECT id FROM public.automation_queue
    WHERE status = 'processing'
      AND locked_at IS NOT NULL
      AND locked_at < now() - make_interval(secs => GREATEST(_older_than_seconds, 30))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.automation_queue q
     SET status = 'queued',
         locked_at = NULL,
         scheduled_at = now(),
         updated_at = now(),
         last_error = COALESCE(q.last_error, '') || ' [reclaimed:stuck]'
    FROM stuck
   WHERE q.id = stuck.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_reclaim_stuck(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_reclaim_stuck(int) TO service_role;
