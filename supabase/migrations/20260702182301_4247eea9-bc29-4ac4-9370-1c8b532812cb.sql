CREATE TABLE public.renewal_reminders_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL,
  milestone_days smallint NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT renewal_reminders_sent_unique UNIQUE (account_id, milestone_days, expires_at)
);

CREATE INDEX renewal_reminders_sent_account_idx
  ON public.renewal_reminders_sent (account_id);

GRANT SELECT ON public.renewal_reminders_sent TO authenticated;
GRANT ALL ON public.renewal_reminders_sent TO service_role;

ALTER TABLE public.renewal_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "renewal_reminders_sent admin read"
  ON public.renewal_reminders_sent
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));