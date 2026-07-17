import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

// ─────────── Schemas ───────────
const PostStatus = z.enum(["draft", "scheduled", "published", "archived"]);

const PostInput = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(140).optional(),
  locale: z.string().trim().min(2).max(8).default("fr"),
  excerpt: z.string().max(500).optional().nullable(),
  content_html: z.string().max(200_000).default(""),
  content_json: z.any().optional(),
  cover_image_url: z.string().url().max(1000).optional().nullable(),
  cover_image_alt: z.string().max(200).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).max(30).optional(),
  author_name: z.string().max(120).optional().nullable(),
  seo_title: z.string().max(80).optional().nullable(),
  seo_description: z.string().max(200).optional().nullable(),
  og_image_url: z.string().url().max(1000).optional().nullable(),
  canonical_url: z.string().url().max(1000).optional().nullable(),
  noindex: z.boolean().default(false),
  twitter_card: z.string().max(50).default("summary_large_image"),
  status: PostStatus.default("draft"),
  published_at: z.string().datetime().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  comments_enabled: z.boolean().default(false),
});

// ─────────── Admin: Posts ───────────
export const adminListPosts = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      status: PostStatus.optional(),
      category_id: z.string().uuid().optional(),
      search: z.string().max(120).optional(),
      page: z.number().int().min(1).default(1),
      page_size: z.number().int().min(1).max(100).default(20),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    let q = supabaseAdmin
      .from("blog_posts")
      .select("id,title,slug,status,category_id,author_name,published_at,scheduled_at,view_count,updated_at,cover_image_url", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (data.status) q = q.eq("status", data.status);
    if (data.category_id) q = q.eq("category_id", data.category_id);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const adminGetPost = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: post, error } = await supabaseAdmin
      .from("blog_posts").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("Article introuvable");
    const { data: tagLinks } = await supabaseAdmin
      .from("blog_post_tags").select("tag_id").eq("post_id", data.id);
    return { ...post, tag_ids: (tagLinks ?? []).map((r: { tag_id: string }) => r.tag_id) };
  });

async function ensureUniqueSlug(supabaseAdmin: any, base: string, locale: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (true) {
    let q = supabaseAdmin.from("blog_posts").select("id").eq("locale", locale).eq("slug", slug).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    if (!data || data.length === 0) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export const adminCreatePost = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { sanitizeBlogHtml, slugify, computeReadingTime, excerptFromHtml } = await import("@/lib/blog.server");
    const html = sanitizeBlogHtml(data.content_html ?? "");
    const baseSlug = slugify(data.slug || data.title);
    const slug = await ensureUniqueSlug(supabaseAdmin, baseSlug, data.locale);
    const publishedAt =
      data.status === "published" ? (data.published_at ?? new Date().toISOString()) : data.published_at ?? null;
    const { data: inserted, error } = await supabaseAdmin
      .from("blog_posts")
      .insert({
        title: data.title,
        slug,
        locale: data.locale,
        excerpt: data.excerpt ?? excerptFromHtml(html),
        content_html: html,
        content_json: data.content_json ?? {},
        cover_image_url: data.cover_image_url,
        cover_image_alt: data.cover_image_alt,
        reading_time_min: computeReadingTime(html),
        category_id: data.category_id,
        author_id: context.userId,
        author_name: data.author_name,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        og_image_url: data.og_image_url,
        canonical_url: data.canonical_url,
        noindex: data.noindex,
        twitter_card: data.twitter_card,
        status: data.status,
        published_at: publishedAt,
        scheduled_at: data.scheduled_at,
        comments_enabled: data.comments_enabled,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.tag_ids?.length) {
      await supabaseAdmin.from("blog_post_tags").insert(
        data.tag_ids.map((tag_id) => ({ post_id: inserted.id, tag_id })),
      );
    }
    return { id: inserted.id, slug };
  });

export const adminUpdatePost = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => PostInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { sanitizeBlogHtml, slugify, computeReadingTime, excerptFromHtml } = await import("@/lib/blog.server");
    const html = sanitizeBlogHtml(data.content_html ?? "");
    const baseSlug = slugify(data.slug || data.title);
    const slug = await ensureUniqueSlug(supabaseAdmin, baseSlug, data.locale, data.id);
    const publishedAt =
      data.status === "published" ? (data.published_at ?? new Date().toISOString()) : data.published_at ?? null;
    const { error } = await supabaseAdmin.from("blog_posts").update({
      title: data.title,
      slug,
      locale: data.locale,
      excerpt: data.excerpt ?? excerptFromHtml(html),
      content_html: html,
      content_json: data.content_json ?? {},
      cover_image_url: data.cover_image_url,
      cover_image_alt: data.cover_image_alt,
      reading_time_min: computeReadingTime(html),
      category_id: data.category_id,
      author_name: data.author_name,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      og_image_url: data.og_image_url,
      canonical_url: data.canonical_url,
      noindex: data.noindex,
      twitter_card: data.twitter_card,
      status: data.status,
      published_at: publishedAt,
      scheduled_at: data.scheduled_at,
      comments_enabled: data.comments_enabled,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("blog_post_tags").delete().eq("post_id", data.id);
    if (data.tag_ids?.length) {
      await supabaseAdmin.from("blog_post_tags").insert(
        data.tag_ids.map((tag_id) => ({ post_id: data.id, tag_id })),
      );
    }
    return { id: data.id, slug };
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminChangePostStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: PostStatus, scheduled_at: z.string().datetime().optional().nullable() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const patch: {
      status: typeof data.status;
      published_at?: string;
      scheduled_at?: string | null;
    } = { status: data.status };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    if (data.status === "scheduled") patch.scheduled_at = data.scheduled_at ?? null;
    const { error } = await supabaseAdmin.from("blog_posts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────── Admin: Categories ───────────
export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin.from("blog_categories").select("*").order("sort_order").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(100),
      slug: z.string().trim().min(1).max(120).optional(),
      description: z.string().max(500).optional().nullable(),
      seo_title: z.string().max(80).optional().nullable(),
      seo_description: z.string().max(200).optional().nullable(),
      sort_order: z.number().int().default(0),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { slugify } = await import("@/lib/blog.server");
    const slug = slugify(data.slug || data.name);
    if (data.id) {
      const { error } = await supabaseAdmin.from("blog_categories").update({
        name: data.name, slug, description: data.description,
        seo_title: data.seo_title, seo_description: data.seo_description, sort_order: data.sort_order,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("blog_categories").insert({
      name: data.name, slug, description: data.description,
      seo_title: data.seo_title, seo_description: data.seo_description, sort_order: data.sort_order,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("blog_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────── Admin: Tags ───────────
export const adminListTags = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin.from("blog_tags").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertTag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(60), slug: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { slugify } = await import("@/lib/blog.server");
    const slug = slugify(data.slug || data.name);
    if (data.id) {
      const { error } = await supabaseAdmin.from("blog_tags").update({ name: data.name, slug }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    // Upsert by slug (unique)
    const { data: existing } = await supabaseAdmin.from("blog_tags").select("id").eq("slug", slug).maybeSingle();
    if (existing) return { id: existing.id };
    const { data: row, error } = await supabaseAdmin.from("blog_tags").insert({ name: data.name, slug }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteTag = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("blog_tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────── Admin: Upload image ───────────
export const adminUploadBlogImage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      filename: z.string().trim().min(1).max(200),
      content_type: z.string().trim().min(1).max(120),
      data_base64: z.string().min(1).max(20_000_000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const buf = Buffer.from(data.data_base64, "base64");
    const ext = (data.filename.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `posts/${safe}`;
    const { error } = await supabaseAdmin.storage.from("blog-media").upload(path, buf, {
      contentType: data.content_type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("blog-media")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Signed URL failed");
    return { url: signed.signedUrl, path };
  });

// ─────────── Admin: settings ───────────
export const adminGetBlogSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin.from("blog_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { id: 1, comments_globally_enabled: false };
  });

export const adminUpdateBlogSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ comments_globally_enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("blog_settings").update({ comments_globally_enabled: data.comments_globally_enabled }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────── Public reads (no auth) ───────────
export const publicListPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({
      category_slug: z.string().max(140).optional(),
      tag_slug: z.string().max(140).optional(),
      search: z.string().max(120).optional(),
      page: z.number().int().min(1).default(1),
      page_size: z.number().int().min(1).max(50).default(12),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    let category_id: string | null = null;
    if (data.category_slug) {
      const { data: c } = await supabaseAdmin.from("blog_categories").select("id").eq("slug", data.category_slug).maybeSingle();
      if (!c) return { rows: [], total: 0, page: data.page, page_size: data.page_size };
      category_id = c.id;
    }
    let post_ids_from_tag: string[] | null = null;
    if (data.tag_slug) {
      const { data: t } = await supabaseAdmin.from("blog_tags").select("id").eq("slug", data.tag_slug).maybeSingle();
      if (!t) return { rows: [], total: 0, page: data.page, page_size: data.page_size };
      const { data: pt } = await supabaseAdmin.from("blog_post_tags").select("post_id").eq("tag_id", t.id);
      post_ids_from_tag = (pt ?? []).map((r: { post_id: string }) => r.post_id);
      if (post_ids_from_tag.length === 0) return { rows: [], total: 0, page: data.page, page_size: data.page_size };
    }
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    let q = supabaseAdmin
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,cover_image_alt,published_at,reading_time_min,category_id", { count: "exact" })
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .range(from, to);
    if (category_id) q = q.eq("category_id", category_id);
    if (post_ids_from_tag) q = q.in("id", post_ids_from_tag);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const publicGetPost = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(140) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: post, error } = await supabaseAdmin
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) return null;
    const [{ data: cat }, { data: tagLinks }] = await Promise.all([
      post.category_id
        ? supabaseAdmin.from("blog_categories").select("id,name,slug").eq("id", post.category_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("blog_post_tags").select("tag_id, blog_tags(id,name,slug)").eq("post_id", post.id),
    ]);
    // fire-and-forget view increment
    supabaseAdmin.from("blog_posts").update({ view_count: (post.view_count ?? 0) + 1 }).eq("id", post.id).then(() => {});
    return {
      ...post,
      category: cat ?? null,
      tags: (tagLinks ?? []).map((r: any) => r.blog_tags).filter(Boolean),
    };
  });

export const publicRelatedPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid(), limit: z.number().int().min(1).max(6).default(3) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: base } = await supabaseAdmin.from("blog_posts").select("category_id").eq("id", data.post_id).maybeSingle();
    let q = supabaseAdmin
      .from("blog_posts")
      .select("id,title,slug,excerpt,cover_image_url,published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .neq("id", data.post_id)
      .order("published_at", { ascending: false })
      .limit(data.limit);
    if (base?.category_id) q = q.eq("category_id", base.category_id);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const publicListCategories = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data } = await supabaseAdmin.from("blog_categories").select("id,name,slug,description").order("sort_order").order("name");
    return data ?? [];
  });

export const publicGetCategoryBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(140) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: row } = await supabaseAdmin.from("blog_categories").select("*").eq("slug", data.slug).maybeSingle();
    return row;
  });

export const publicGetTagBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(140) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: row } = await supabaseAdmin.from("blog_tags").select("*").eq("slug", data.slug).maybeSingle();
    return row;
  });

export const publicListAllPostsForSitemap = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data } = await supabaseAdmin
      .from("blog_posts")
      .select("slug,updated_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(2000);
    return data ?? [];
  });