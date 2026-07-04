// Server fns — module Employés (gestion des admins).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    // On récupère tous les users admin via l'API admin (max 100 admins).
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const map = new Map((usersList?.users ?? []).map((u: any) => [u.id, u]));

    return ids.map((id) => {
      const u: any = map.get(id) ?? null;
      const userRoles = (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role);
      return {
        user_id: id,
        email: u?.email ?? "(inconnu)",
        last_sign_in_at: u?.last_sign_in_at ?? null,
        created_at: u?.created_at ?? null,
        roles: userRoles,
        is_admin: userRoles.includes("admin"),
      };
    });
  });

export const inviteEmployee = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), makeAdmin: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error || !invited?.user) throw new Error(error?.message ?? "Invitation échouée");
    if (data.makeAdmin) {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: invited.user.id, role: "admin" });
      if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);
    }
    try {
      const { notifyAdminTelegram } = await import("@/lib/telegram.server");
      await notifyAdminTelegram(`👤 Employé invité : ${data.email}${data.makeAdmin ? " (admin)" : ""}`);
    } catch { /* noop */ }
    return { ok: true, user_id: invited.user.id };
  });

export const changeEmployeeRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) =>
    z.object({
      target_user_id: z.string().uuid(),
      action: z.enum(["grant_admin", "revoke_admin"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    const { data: res, error } = await supabaseAdmin.rpc("admin_change_role", {
      _actor_user_id: context.userId,
      _target_user_id: data.target_user_id,
      _action: data.action,
    });
    if (error) throw new Error(error.message);
    try {
      const { notifyAdminTelegram } = await import("@/lib/telegram.server");
      await notifyAdminTelegram(`🔐 ${data.action} exécuté sur ${data.target_user_id.slice(0, 8)}…`);
    } catch { /* noop */ }
    return res as any;
  });

export const removeEmployee = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ target_user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.target_user_id === context.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    // On supprime tous ses rôles ; on ne supprime pas l'utilisateur auth.
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.target_user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });