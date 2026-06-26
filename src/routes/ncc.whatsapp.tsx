import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { NotificationsView } from "@/components/ncc/NotificationsView";

export const Route = createFileRoute("/ncc/whatsapp")({
  component: () => (
    <div>
      <NccPageHeader icon={MessageCircle} title="WhatsApp" description="Vue filtrée du centre de notifications : canal WhatsApp." />
      <NotificationsView channel="whatsapp" />
    </div>
  ),
});
