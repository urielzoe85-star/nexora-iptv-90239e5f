import { useCallback, useEffect, useState } from "react";
import { Bug, RefreshCw, Trash2, PowerOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  collectPwaState,
  clearNexoraCaches,
  unregisterNexoraSw,
  isPwaDebug,
  type PwaState,
} from "@/pwa/debug";

/**
 * Panneau de diagnostic du service worker — visible uniquement en mode debug
 * (?sw=debug). Purement informatif : n'altère jamais la stratégie de cache.
 */
export function PwaDebugPanel() {
  const [state, setState] = useState<PwaState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await collectPwaState());
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (!isPwaDebug()) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const reg = state?.registrations?.[0];

  return (
    <div className="fixed bottom-4 left-4 z-[70] w-[19rem] max-w-[92vw] rounded-lg border border-border bg-background/95 p-3 font-mono text-[11px] shadow-lg backdrop-blur">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left font-sans text-xs font-semibold text-foreground"
      >
        <Bug className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1">SW debug</span>
        <span className={state?.online ? "text-primary" : "text-destructive"}>
          {state?.online ? "online" : "offline"}
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open ? (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <p>état : {reg?.state ?? (state?.supported ? "aucun SW" : "non supporté")}</p>
          <p className="truncate">script : {reg?.scriptURL || "—"}</p>
          <p>contrôleur : {state?.controller ? "oui" : "non"}</p>
          <p>maj en attente : {reg?.hasWaiting ? "oui" : "non"}</p>
          <p>
            caches : {state?.caches.length ?? 0} · {state?.totalEntries ?? 0} entrées
            {state?.usageMB != null ? ` · ${state.usageMB} Mo` : ""}
          </p>
          {state?.caches.length ? (
            <ul className="max-h-24 overflow-auto rounded border border-border/60 p-1">
              {state.caches.map((c) => (
                <li key={c.name} className="truncate">
                  {c.name} ({c.entries})
                </li>
              ))}
            </ul>
          ) : null}
          {state?.lastError ? (
            <p className="text-destructive break-words">err : {state.lastError}</p>
          ) : null}
          <div className="flex flex-wrap gap-1 pt-1">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(refresh)}>
              <RefreshCw className="mr-1 h-3 w-3" /> État
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(clearNexoraCaches)}>
              <Trash2 className="mr-1 h-3 w-3" /> Caches
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(unregisterNexoraSw)}>
              <PowerOff className="mr-1 h-3 w-3" /> SW
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
