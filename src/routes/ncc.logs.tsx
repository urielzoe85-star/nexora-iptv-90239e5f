import { createFileRoute } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { LogsTable } from "@/components/ncc/modules/LogsTable";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/ncc/logs")({
  component: LogsPage,
});

function LogsPage() {
  return (
    <div>
      <NccPageHeader
        icon={ScrollText}
        title="Journal système"
        description="Historique consolidé : sécurité, automation, IPTV."
      />
      <LogsTable />
    </div>
  );
}
