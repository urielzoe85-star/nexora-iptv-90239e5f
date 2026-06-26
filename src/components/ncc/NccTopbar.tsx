import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NccNotificationsPanel } from "./NccNotificationsPanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NccTopbar({ email }: { email?: string | null }) {
  const navigate = useNavigate();
  const [openNotif, setOpenNotif] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  const initial = (email ?? "?").slice(0, 1).toUpperCase();

  return (
    <header className="h-14 border-b border-border/60 flex items-center px-4 gap-3 bg-background/60 backdrop-blur sticky top-0 z-30">
      <SidebarTrigger />
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher…" className="pl-9 h-9 bg-muted/40 border-border/60" disabled />
      </div>
      <div className="flex-1 sm:hidden" />
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpenNotif(true)} aria-label="Notifications">
        <Bell className="h-4 w-4" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-semibold grid place-items-center hover:bg-primary/25 transition">
            {initial}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">
            <div className="font-medium">Connecté</div>
            <div className="text-muted-foreground truncate">{email ?? "—"}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
            Aller à l'ancien admin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NccNotificationsPanel open={openNotif} onOpenChange={setOpenNotif} />
    </header>
  );
}
