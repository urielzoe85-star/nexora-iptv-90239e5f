// -------------------------------------------------------------------------
// SebPay — couche transport serveur (portable)
//
// Module SERVEUR UNIQUEMENT. Il ne doit jamais être importé statiquement par
// un module accessible depuis le bundle client. Sur TanStack Start on le
// charge via `await import(...)` DANS le corps d'un handler `createServerFn`.
// -------------------------------------------------------------------------

export const SEBPAY_BASE_URL = "https://newapi.sebpay.bj";
export const SEBPAY_COLLECTIONS_PATH = "/api/v1/collections";

function cleanSecretValue(value: string): string {
  // Les copier-coller depuis un dashboard / .env ramènent souvent des
  // espaces ou des guillemets encadrants.
  return value.trim().replace(/^['"]|['"]$/g, "");
}

export function sebpayKeyMode(key: string): "live" | "test" | "unknown" {
  if (key.startsWith("pk_live_") || key.startsWith("sk_live_")) return "live";
  if (key.startsWith("pk_test_") || key.startsWith("sk_test_")) return "test";
  return "unknown";
}

function safeKeyDiagnostics(key: string, raw: string) {
  // Diagnostic sans fuite : jamais la valeur, seulement sa forme.
  return {
    present: key.length > 0,
    length: key.length,
    prefix: key.slice(0, 8),
    mode: sebpayKeyMode(key),
    trimmed: key.length !== raw.length,
  };
}

function maskPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length <= 4) return digits ? "****" : undefined;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function redactSebpayPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;
  const copy = { ...(payload as Record<string, unknown>) };
  if ("phone" in copy) copy.phone = maskPhone(copy.phone);
  return copy;
}

export function normalizePhone(value: string): string {
  return String(value ?? "").replace(/[^\d]/g, "");
}

export function operatorSlug(value: string): string {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("mtn")) return "mtn";
  if (v.includes("orange")) return "orange";
  if (v.includes("moov")) return "moov";
  if (v.includes("wav") || v.includes("wave")) return "wav";
  return v.trim();
}

// Noms d'env assemblés depuis des jetons : aucun littéral de nom de secret ne
// survit dans une éventuelle chunk client (ceinture + bretelles).
const PUB_KEY_NAME = ["SEBPAY", "PUBLIC", "KEY"].join("_");
const SEC_KEY_NAME = ["SEBPAY", "SECRET", "KEY"].join("_");

export function sebpayHeaders(): Record<string, string> {
  // process.env est lu ICI (à l'appel), jamais au niveau module.
  const env = process.env as Record<string, string | undefined>;
  const rawPub = env[PUB_KEY_NAME] ?? "";
  const rawSec = env[SEC_KEY_NAME] ?? "";
  const pub = cleanSecretValue(rawPub);
  const sec = cleanSecretValue(rawSec);

  console.log("[sebpay] auth keys check", {
    publicKey: safeKeyDiagnostics(pub, rawPub),
    secretKey: safeKeyDiagnostics(sec, rawSec),
  });

  if (!pub) throw new Error("Configuration de paiement indisponible: clé publique SebPay manquante côté serveur.");
  if (!sec) throw new Error("Configuration de paiement indisponible: clé secrète SebPay manquante côté serveur.");
  if (sec.length < 20) throw new Error("Configuration de paiement indisponible: clé secrète SebPay semble tronquée.");
  if (pub.length < 20) throw new Error("Configuration de paiement indisponible: clé publique SebPay semble tronquée.");

  const publicMode = sebpayKeyMode(pub);
  const secretMode = sebpayKeyMode(sec);
  if (publicMode === "unknown" || secretMode === "unknown") {
    throw new Error("Configuration de paiement indisponible: format de clé SebPay invalide (pk_live_/sk_live_ ou pk_test_/sk_test_ attendu).");
  }
  if (publicMode !== secretMode) {
    throw new Error("Configuration de paiement indisponible: clés SebPay public/secret dans des modes différents (live/test).");
  }

  return { "X-Public-Key": pub, "X-Secret-Key": sec, Accept: "application/json" };
}

export async function sebpayFetch(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<{ status: number; raw: string; json: unknown }> {
  const url = `${SEBPAY_BASE_URL}${path}`;
  const headers: Record<string, string> = sebpayHeaders();
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  console.log("[sebpay] →", init.method, url, init.body ? { payload: redactSebpayPayload(init.body) } : "");

  // Le POST déclenche le push opérateur : plus long que le GET de vérification.
  const timeoutMs = init.method === "GET" ? 8_000 : 20_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new Error(aborted ? "SebPay timeout" : `SebPay network error: ${String(e)}`);
  }
  clearTimeout(timer);

  const raw = await res.text();
  let json: unknown = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { /* réponse non-JSON */ }
  console.log("[sebpay] ←", res.status, url, raw.slice(0, 2000));
  return { status: res.status, raw, json };
}

export function mapSebpayStatus(s: unknown): "paid" | "failed" | "cancelled" | "pending" {
  const v = String(s ?? "").toLowerCase();
  if (["approved", "success", "successful", "succeeded", "paid", "completed"].includes(v)) return "paid";
  if (["rejected", "failed", "failure", "error", "declined"].includes(v)) return "failed";
  if (["cancelled", "canceled"].includes(v)) return "cancelled";
  return "pending"; // défaut sûr : un statut inconnu ne ferme jamais une commande
}