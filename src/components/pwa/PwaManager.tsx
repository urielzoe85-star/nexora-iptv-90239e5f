import { useEffect, useState } from "react";
import type { Workbox } from "workbox-window";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, X } from "lucide-react";
import { registerPwa } from "@/pwa/register";
import { isCapacitorNative } from "@/lib/runtime-env";
import { PWA_ENABLED } from "@/pwa/config";
import { PwaDebugPanel } from "./PwaDebugPanel";
import { isPwaDebug, pwaLog, installPwaDebugListeners } from "@/pwa/debug";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaManager() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateWb, setUpdateWb] = useState<Workbox | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    installPwaDebugListeners();
    if (!PWA_ENABLED) {
      // PWA désactivée : on nettoie tout SW/caches résiduels puis on sort.
      void registerPwa();
      return;
    }
    if (isCapacitorNative()) {
      setIsNative(true);
      pwaLog("native runtime — couche PWA neutralisée");
      return;
    }
    registerPwa((wb) => setUpdateWb(wb));
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      pwaLog("beforeinstallprompt capturé");
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      pwaLog("appinstalled");
      setInstallEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    try {
      if (sessionStorage.getItem("nexora.install.dismissed") === "1") {
        setInstallDismissed(true);
      }
    } catch { /* noop */ }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!PWA_ENABLED || isNative) return isPwaDebug() ? <PwaDebugPanel /> : null;

  const acceptUpdate = () => {
    if (!updateWb) return;
    pwaLog("update acceptée par l'utilisateur — skipWaiting");
    updateWb.addEventListener("controlling", () => window.location.reload());
    updateWb.messageSkipWaiting();
  };

  const doInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice.catch(() => null);
    setInstallEvt(null);
  };

  const dismissInstall = () => {
    setInstallDismissed(true);
    try { sessionStorage.setItem("nexora.install.dismissed", "1"); } catch { /* noop */ }
  };

  return (
    <>
      <PwaDebugPanel />
      {updateWb ? (
        <div className="fixed bottom-4 left-1/2 z-[60] w-[92%] max-w-md -translate-x-1/2 rounded-lg border border-primary/40 bg-background p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Nouvelle version disponible</p>
              <p className="text-muted-foreground">Mettez à jour Nexora pour bénéficier des dernières améliorations.</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { pwaLog("update reportée"); setUpdateWb(null); }}>Plus tard</Button>
            <Button size="sm" onClick={acceptUpdate}>Mettre à jour</Button>
          </div>
        </div>
      ) : null}

      {installEvt && !installDismissed ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border bg-background p-3 shadow-lg">
          <button
            aria-label="Fermer"
            onClick={dismissInstall}
            className="absolute top-1 right-1 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 pr-4">
            <Download className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Installer Nexora</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Accédez à Nexora directement depuis votre écran d'accueil.</p>
          <Button size="sm" className="mt-2 w-full" onClick={doInstall}>Installer</Button>
        </div>
      ) : null}
    </>
  );
}