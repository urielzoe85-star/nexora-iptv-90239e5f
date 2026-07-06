
CREATE TABLE public.gallery_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  image_source text NOT NULL DEFAULT 'external' CHECK (image_source IN ('upload','external')),
  link_type text NOT NULL DEFAULT 'plan' CHECK (link_type IN ('plan','product_page','external_url')),
  plan_slug text,
  product_slug text,
  external_url text,
  price numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  sku text,
  brand text,
  availability text NOT NULL DEFAULT 'in_stock' CHECK (availability IN ('in_stock','out_of_stock','preorder')),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX gallery_items_product_slug_key ON public.gallery_items(product_slug) WHERE product_slug IS NOT NULL;
CREATE INDEX gallery_items_active_sort_idx ON public.gallery_items(active, sort_order);

GRANT SELECT ON public.gallery_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active gallery items"
  ON public.gallery_items FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins manage gallery items"
  ON public.gallery_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_gallery_items_updated_at
  BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
