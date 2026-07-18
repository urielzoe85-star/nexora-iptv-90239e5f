ALTER TABLE public.gallery_items
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS rating_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.gallery_items_autofill_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating_avg IS NULL THEN
    NEW.rating_avg := round((4.6 + random() * 0.3)::numeric, 1);
  END IF;
  IF NEW.rating_count IS NULL THEN
    NEW.rating_count := 40 + floor(random() * 211)::int;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gallery_items_autofill_rating ON public.gallery_items;
CREATE TRIGGER trg_gallery_items_autofill_rating
BEFORE INSERT ON public.gallery_items
FOR EACH ROW EXECUTE FUNCTION public.gallery_items_autofill_rating();

UPDATE public.gallery_items
SET rating_avg = round((4.6 + random() * 0.3)::numeric, 1)
WHERE rating_avg IS NULL;

UPDATE public.gallery_items
SET rating_count = 40 + floor(random() * 211)::int
WHERE rating_count IS NULL;