// Server functions to list and decide AI action requests.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export const listActionRequests = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .inputValidator((d) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    let q = (supabaseAdmin as any).from("ai_action_requests")
      .select("id,scope,tool,summary,args,status,requested_by_email,requested_by_label,created_at,decided_at,result,error")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { requests: rows ?? [] };
  });

export const decideActionRequest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d) =>
    z.object({
      requestId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: data.decision,
      decided_by_user_id: (context as any).userId,
      decided_at: nowIso,
    };
    if (data.note) patch.error = data.decision === "rejected" ? data.note : null;
    const { data: row, error } = await (supabaseAdmin as any).from("ai_action_requests")
      .update(patch).eq("id", data.requestId)
      .select("id,status,tool,args,summary").single();
    if (error) throw new Error(error.message);

    if (data.decision === "approved") {
      try {
        const { executeApprovedAction } = await import("@/lib/ai-chat/executor.server");
        const result = await executeApprovedAction({ tool: row.tool, args: row.args, summary: row.summary });
        await (supabaseAdmin as any).from("ai_action_requests")
          .update({ status: "executed", result, decided_at: nowIso })
          .eq("id", data.requestId);
        return { ok: true, executed: true, result: JSON.parse(JSON.stringify(result)) as Record<string, string | number | boolean | null> };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await (supabaseAdmin as any).from("ai_action_requests")
          .update({ status: "failed", error: msg })
          .eq("id", data.requestId);
        return { ok: false, executed: false, error: msg };
      }
    }
    return { ok: true, executed: false };
  });