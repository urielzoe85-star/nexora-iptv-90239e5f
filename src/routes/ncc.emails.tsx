import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { NotificationsView } from "@/components/ncc/NotificationsView";

export const Route = createFileRoute("/ncc/emails")({
  component: () => (
    <div>
      <NccPageHeader icon={Mail} title="Emails" description="Vue filtrée du centre de notifications : canal Email." />
      <NotificationsView channel="email" />
    </div>
  ),
});
