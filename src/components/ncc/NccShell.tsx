import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { NccSidebar } from "./NccSidebar";
import { NccTopbar } from "./NccTopbar";

export function NccShell({ children, email }: { children: ReactNode; email?: string | null }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <NccSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <NccTopbar email={email} />
          <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}
