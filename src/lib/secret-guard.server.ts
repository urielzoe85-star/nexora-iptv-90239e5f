// Sprint 2 · Bloc F — Secret guard helper.
// Server-only. NE JAMAIS importer depuis un composant client ni au top-level
// d'un `*.functions.ts`. À charger via `await import(...)` dans un handler.
//
// - `requireSecret(name, ctx)` : renvoie la valeur ou lève après avoir logué
//   un event `secret.missing` (severity `critical`).
// - `noteSecretInvalid(name, ctx, reason)` : logue `secret.invalid_use`
//   (severity `warn`) — à utiliser quand un secret est présent mais rejeté
//   par le provider (401/403 upstream).

export interface SecretCtx {
  route?: string | null;
  request_id?: string | null;
  actor_user_id?: string | null;
}

export async function requireSecret(
  name: string,
  ctx: SecretCtx = {},
): Promise<string> {
  const value = process.env[name];
  if (value && value.length > 0) return value;

  try {
    const mod = await import("./security-events.server");
    await mod.recordSecurityEvent({
      event_type: "secret.missing",
      severity: "critical",
      route: ctx.route ?? null,
      request_id: ctx.request_id ?? null,
      actor_user_id: ctx.actor_user_id ?? null,
      message: `Missing required secret ${name}`,
      payload: { secret_name: name },
    });
  } catch {
    // logging is best-effort; never mask original failure
  }

  throw new Error(`Missing required secret: ${name}`);
}

export async function noteSecretInvalid(
  name: string,
  ctx: SecretCtx,
  reason: string,
): Promise<void> {
  try {
    const mod = await import("./security-events.server");
    await mod.recordSecurityEvent({
      event_type: "secret.invalid_use",
      severity: "warn",
      route: ctx.route ?? null,
      request_id: ctx.request_id ?? null,
      actor_user_id: ctx.actor_user_id ?? null,
      message: `Secret ${name} rejected upstream: ${reason.slice(0, 200)}`,
      payload: { secret_name: name, reason: reason.slice(0, 500) },
    });
  } catch {
    // best-effort
  }
}