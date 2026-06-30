ALTER TABLE public.automation_queue
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS automation_queue_idempotency_active_uidx
  ON public.automation_queue (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status IN ('queued', 'processing', 'done');

CREATE INDEX IF NOT EXISTS automation_queue_status_scheduled_idx
  ON public.automation_queue (status, scheduled_at)
  WHERE status = 'queued';

CREATE OR REPLACE FUNCTION public.automation_claim_jobs(_batch_size integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  workflow_key text,
  payload jsonb,
  trigger_event text,
  attempts integer,
  max_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT q.id
    FROM public.automation_queue q
    WHERE q.status = 'queued'
      AND q.scheduled_at <= now()
    ORDER BY q.scheduled_at ASC
    LIMIT GREATEST(1, LEAST(_batch_size, 50))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.automation_queue q
  SET status = 'processing',
      locked_at = now(),
      attempts = q.attempts + 1,
      updated_at = now()
  FROM claimed
  WHERE q.id = claimed.id
  RETURNING q.id, q.workflow_key, q.payload, q.trigger_event, q.attempts, q.max_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_claim_jobs(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_claim_jobs(integer) TO service_role;