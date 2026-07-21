// Serveur — récupère ou crée un token de désabonnement pour un destinataire.
// Le processor `process-email-queue` exige `unsubscribe_token` dans le payload,
// faute de quoi il rejette l'envoi avec `400 missing_unsubscribe`.

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;
  const normalized = email.trim().toLowerCase();

  const { data: existing } = await sb
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();

  if (existing?.token && !existing.used_at) return existing.token as string;

  const token = generateToken();
  await sb
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });

  const { data: stored } = await sb
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();

  if (!stored?.token) throw new Error("unsubscribe_token_persist_failed");
  return stored.token as string;
}