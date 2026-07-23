// Executor for approved AI action requests. Server-only.
// Wave 1: registers a small set of well-known tools with safe
// implementations and records everything else as "approved but not
// wired" so nothing runs silently.

type Handler = (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

const HANDLERS: Record<string, Handler> = {
  send_customer_message: async (args) => {
    const channel = String(args.channel ?? "email").toLowerCase();
    const to = String(args.to ?? args.email ?? args.phone ?? "").trim();
    const message = String(args.message ?? args.text ?? "").trim();
    if (!to || !message) throw new Error("Paramètres manquants: 'to' et 'message' requis.");
    if (channel === "telegram") {
      const { tgSendMessage } = await import("@/lib/telegram.server");
      await tgSendMessage(to, message);
      return { ok: true, channel, to };
    }
    return {
      ok: false,
      channel,
      note: "Canal non câblé automatiquement — action approuvée, à envoyer manuellement depuis /ncc/notifications.",
    };
  },
};

export async function executeApprovedAction(input: {
  tool: string;
  args: Record<string, unknown> | null | undefined;
  summary: string;
}): Promise<Record<string, unknown>> {
  const handler = HANDLERS[input.tool];
  if (!handler) {
    return {
      ok: false,
      pending: true,
      note: `Action approuvée. L'exécuteur pour '${input.tool}' n'est pas encore branché — action à traiter manuellement dans le module NCC correspondant.`,
      summary: input.summary,
    };
  }
  return await handler(input.args ?? {});
}