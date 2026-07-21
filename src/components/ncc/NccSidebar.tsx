import { Link, useRouterState } from "@tanstack/react-router";
import { NCC_MODULES, GROUP_LABELS, type ModuleGroup } from "@/lib/ncc/modules";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import nexoraBrand from "@/assets/nexora-brand.jpg.asset.json";

const GROUP_ORDER: ModuleGroup[] = ["cockpit", "intelligence", "sales", "services", "content", "ops", "system"];

export function NccSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) =>
    to === "/ncc" ? path === "/ncc" : path === to || path.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <img
            src={nexoraBrand.url}
            alt="Nexora"
            className="h-8 w-8 rounded-md object-cover"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm">Nexora</span>
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase">Control Center</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {GROUP_ORDER.map((group) => {
          const items = NCC_MODULES.filter((m) => m.group === group);
          if (!items.length) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{GROUP_LABELS[group]}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((m) => (
                    <SidebarMenuItem key={m.id}>
                      <SidebarMenuButton asChild isActive={isActive(m.to)} tooltip={m.label}>
                        <Link to={m.to} className="flex items-center gap-2">
                          <m.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{m.label}</span>
                          {m.status === "preparing" && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">Soon</Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="text-[10px] text-muted-foreground">v1.0 · Phase 1</div>
      </SidebarFooter>
    </Sidebar>
  );
}
