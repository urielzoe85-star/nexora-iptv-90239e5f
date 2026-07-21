import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const KB_SECTIONS = ["brand", "products", "pricing", "tone", "faq", "guides"] as const;

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data, error } = await supabaseAdmin
      .from("ai_knowledge_base")
      .select("*")
      .order("section")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [], sections: KB_SECTIONS };
  });

export const upsertKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      section: z.enum(KB_SECTIONS),
      title: z.string().min(1).max(200),
      content: z.string().max(20000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const row = {
      section: data.section,
      title: data.title,
      content: data.content,
      updated_by: context.userId,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("ai_knowledge_base").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("ai_knowledge_base").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { error } = await supabaseAdmin.from("ai_knowledge_base").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });