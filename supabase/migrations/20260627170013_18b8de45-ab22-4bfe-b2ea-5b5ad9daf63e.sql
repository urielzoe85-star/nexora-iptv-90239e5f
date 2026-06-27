
CREATE TABLE public.delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','telegram','email')),
  status text NOT NULL CHECK (status IN ('prepared','copied','sent','automatic','failed')),
  template_id text,
  subject text,
  content text NOT NULL,
  recipient text,
  admin_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_logs_order ON public.delivery_logs(order_id);
CREATE INDEX idx_delivery_logs_channel ON public.delivery_logs(channel);
CREATE INDEX idx_delivery_logs_created ON public.delivery_logs(created_at DESC);

GRANT SELECT, INSERT ON public.delivery_logs TO authenticated;
GRANT ALL ON public.delivery_logs TO service_role;

ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read delivery logs" ON public.delivery_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert delivery logs" ON public.delivery_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
