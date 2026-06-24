import { createServerFn } from "@tanstack/react-start";

export type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  period_label: string;
  save_label: string | null;
  popular: boolean;
  sort_order: number;
};

export const getPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
  const { data, error } = await sb
    .from("plans")
    .select("id, slug, name, price, currency, period_label, save_label, popular, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    slug: p.slug as string,
    name: p.name as string,
    price: Number(p.price),
    currency: p.currency as string,
    period_label: p.period_label as string,
    save_label: (p.save_label as string | null) ?? null,
    popular: Boolean(p.popular),
    sort_order: Number(p.sort_order),
  })) satisfies PublicPlan[];
});