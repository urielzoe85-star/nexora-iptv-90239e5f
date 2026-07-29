/** Extrait un message lisible depuis une erreur inconnue (remplace les `catch (e: unknown)`). */
import { errorMessage } from "@/lib/error-message";
export function errorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}
