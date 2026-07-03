// Sprint 3 · Bloc A — Billing lifecycle helpers (server-only).
//
// Centralises state transitions on public.iptv_accounts so every change
// lands in public.iptv_lifecycle_events (audit) and the corresponding
// operational side-effects run in a single place. Keep imports lazy —
// this module ships in a client-reachable graph via `*.server.ts` naming
// guard but callers should still await `import()` when possible.

import { supabaseAdmin } from "@/lib/supabase-admin.server";

type Actor = "system" | "webhook" | "cron" | "admin";

export interface RecordTransitionInput {
  accountId: string;
  fromState?: string | null;
  toState: string;
  reason: string;
  actor?: Actor;
  metadata?: Record<string, unknown>;
}

/** Append a lifecycle audit row. Best-effort — never throws. */
export async function recordLifecycleEvent(input: RecordTransitionInput): Promise<void> {
  try {
    await (supabaseAdmin as any).from("iptv_lifecycle_events").insert({
      account_id: input.accountId,
      from_state: input.fromState ?? null,
      to_state: input.toState,
      reason: input.reason,
      actor: input.actor ?? "system",
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[billing] lifecycle audit failed", err);
  }
}

/** Suspend an account and audit the transition. Idempotent. */
export async function suspendAccount(accountId: string, reason: string, meta: Record<string, unknown> = {}): Promise<boolean> {
  const { data: before } = await (supabaseAdmin as any)
    .from("iptv_accounts").select("status").eq("id", accountId).maybeSingle();
  if (!before) return false;
  if (before.status === "suspended") return true;
  const { error } = await (supabaseAdmin as any)
    .from("iptv_accounts")
    .update({ status: "suspended", enabled: false, admin_enabled: false })
    .eq("id", accountId);
  if (error) { console.error("[billing] suspend failed", error.message); return false; }
  await recordLifecycleEvent({
    accountId, fromState: before.status, toState: "suspended",
    reason, actor: "cron", metadata: meta,
  });
  return true;
}

/** Reactivate a suspended account and audit. Called after payment confirmed. */
export async function reactivateAccountsForOrder(orderId: string, meta: Record<string, unknown> = {}): Promise<number> {
  const { data: rows } = await (supabaseAdmin as any)
    .from("iptv_accounts")
    .select("id, status")
    .eq("order_id", orderId);
  const list = (rows ?? []) as Array<{ id: string; status: string }>;
  let count = 0;
  for (const row of list) {
    if (row.status !== "suspended") continue;
    const { error } = await (supabaseAdmin as any)
      .from("iptv_accounts")
      .update({ status: "active", enabled: true, admin_enabled: true })
      .eq("id", row.id);
    if (error) { console.error("[billing] reactivate failed", error.message); continue; }
    await recordLifecycleEvent({
      accountId: row.id, fromState: "suspended", toState: "active",
      reason: "reactivation", actor: "webhook", metadata: { order_id: orderId, ...meta },
    });
    count += 1;
  }
  return count;
}