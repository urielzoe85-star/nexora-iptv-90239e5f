import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { Headset } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { InboxView } from "@/components/ncc/ai/InboxView";

export const Route = createFileRoute("/ncc/ai/inbox")({
  component: InboxLayout,
});

function InboxLayout() {
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/ncc/ai/inbox/$threadId");
  return (
    <div>
      <NccPageHeader
        icon={Headset}
        title="Inbox IA — visiteurs"
        description="Conversations en direct avec les visiteurs du site. Prends la main quand l'IA passe le relais."
      />
      {hasChild ? <Outlet /> : <InboxView />}
    </div>
  );
}