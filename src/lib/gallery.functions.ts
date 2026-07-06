import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  image_source: "upload" | "external";
  link_type: "plan" | "product_page" | "external_url";
  plan_slug: string | null;
  product_slug: string | null;
  external_url: string | null;
  price: number | null;
  currency: string;
  sku: string | null;
  brand: string | null;
  availability: "in_stock" | "out_of_stock" | "preorder";
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function anonClient() {
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  image_url: z.string().trim().url(),
  image_source: z.enum(["upload", "external"]),
  link_type: z.enum(["plan", "product_page", "external_url"]),
  plan_slug: z.string().trim().max(80).optional().nullable(),
  product_slug: z.string().trim().regex(/^[a-z0-9-]+$/i).max(80).optional().nullable(),
  external_url: z.string().trim().url().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  currency: z.string().trim().length(3).default("USD"),
  sku: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().max(80).optional().nullable(),
  availability: z.enum(["in_stock", "out_of_stock", "preorder"]).default("in_stock"),
  sort_order: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const listGalleryPublic = createServerFn({ method: "GET" }).handler(async () => {
  const sb = anonClient();
  const { data, error } = await sb
    .from("gallery_items")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GalleryItem[];
});

export const getGalleryItemBySlug = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const sb = anonClient();
    const { data: row, error } = await sb
      .from("gallery_items")
      .select("*")
      .eq("product_slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as GalleryItem | null) ?? null;
  });

export const adminListGallery = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as GalleryItem[];
  });

export const adminUpsertGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const payload = { ...data };
    if (data.id) {
      const { id: _id, ...rest } = payload;
      const { error } = await supabaseAdmin.from("gallery_items").update(rest).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("gallery_items")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

export const adminDeleteGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("gallery_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUploadGalleryImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({
    filename: z.string().trim().min(1).max(200),
    contentType: z.string().trim().min(3).max(120),
    base64: z.string().min(1),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const ext = (data.filename.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `items/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const bytes = Buffer.from(data.base64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("gallery")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    // Bucket is private → signed URL, 10 years
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("gallery")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Signed URL failed");
    return { url: signed.signedUrl, path };
  });
