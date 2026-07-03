import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyAdminStatus, getNccUnlockStatus, lockNccAccess } from "@/lib/admin.functions";
import { NccShell } from "@/components/ncc/NccShell";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ncc")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nexora Control Center" },
      { name: "description", content: "Internal Nexora Control Center for operators and staff." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NccLayout,
});

function NccLayout() {
  const navigate = useNavigate();
  const getStatus = useServerFn(getMyAdminStatus);
  const getUnlock = useServerFn(getNccUnlockStatus);
  const lockNcc = useServerFn(lockNccAccess);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "no-auth" }
    | { kind: "forbidden"; email: string | null }
    | { kind: "ok"; email: string | null }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      try {
        const r = await getStatus();
        if (cancelled) return;
        if (!r.isAdmin) {
          setState({ kind: "forbidden", email: s.session.user.email ?? null });
          return;
        }
        const gate = await getUnlock();
        if (!gate.unlocked) {
          try { sessionStorage.removeItem("ncc.unlocked"); } catch { /* noop */ }
          navigate({ to: "/admin", replace: true });
          return;
        }
        setState({ kind: "ok", email: s.session.user.email ?? null });
      } catch {
        if (!cancelled) setState({ kind: "no-auth" });
      }
    })();
    return () => { cancelled = true; };
  }, [getStatus, getUnlock, navigate]);

  if (state.kind === "loading" || state.kind === "no-auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.kind === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Accès refusé</h1>
          <p className="text-sm text-muted-foreground">
            Le compte <strong>{state.email}</strong> n'a pas le rôle administrateur.
          </p>
          <Button onClick={async () => {
            try { await lockNcc(); } catch { /* noop */ }
            await supabase.auth.signOut();
            navigate({ to: "/admin/login", replace: true });
          }}>Se déconnecter</Button>
        </div>
      </div>
    );
  }

  return (
    <NccShell email={state.email}>
      <Outlet />
    </NccShell>
  );
}
