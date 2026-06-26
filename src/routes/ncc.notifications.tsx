import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { NotificationsView } from "@/components/ncc/NotificationsView";

export const Route = createFileRoute("/ncc/notifications")({
  component: () => (
    <div>
      <NccPageHeader icon={Bell} title="Notifications" description="Centre multi-canal : email, WhatsApp, Telegram, SMS, in-app." />
      <NotificationsView />
    </div>
  ),
});