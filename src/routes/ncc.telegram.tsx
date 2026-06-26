import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { NotificationsView } from "@/components/ncc/NotificationsView";

export const Route = createFileRoute("/ncc/telegram")({
  component: () => (
    <div>
      <NccPageHeader icon={Send} title="Telegram" description="Vue filtrée du centre de notifications : canal Telegram." />
      <NotificationsView channel="telegram" />
    </div>
  ),
});
