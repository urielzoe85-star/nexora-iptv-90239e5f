// Actions de journalisation utilisables par tous les workflows.

export async function logToIptvJournal(action: string, message: string, payload: Record<string, unknown> = {}) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin.server");
    await (supabaseAdmin as any).from("iptv_logs").insert({
      action: `automation:${action}`,
      message,
      payload,
    });
  } catch {
    // Ne jamais faire échouer un workflow à cause du journal.
  }
  return { logged: true };
}