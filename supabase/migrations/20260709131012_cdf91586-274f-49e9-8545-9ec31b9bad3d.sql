
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_reference text;

UPDATE public.orders
   SET payment_provider = 'sebpay',
       provider_reference = COALESCE(provider_reference, sebpay_reference)
 WHERE sebpay_reference IS NOT NULL
   AND (payment_provider IS NULL OR provider_reference IS NULL);

CREATE INDEX IF NOT EXISTS orders_provider_reference_idx ON public.orders (provider_reference);
CREATE INDEX IF NOT EXISTS orders_payment_provider_idx  ON public.orders (payment_provider);
