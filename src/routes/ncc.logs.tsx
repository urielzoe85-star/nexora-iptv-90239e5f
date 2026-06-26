import { createFileRoute } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { LogsTable } from "@/components/ncc/modules/LogsTable";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Wrench } from "lucide-react";

export const Route = createFileRoute("/ncc/logs")({
  component: LogsPage,
});

function LogsPage() {
  return (
    <div>
      <NccPageHeader
        icon={ScrollText}
        title="Journal système"
        description="Historique consolidé de tous les évènements de la plateforme."
        action={<Badge variant="secondary" className="gap-1"><Wrench className="h-3 w-3" /> Collecte à venir</Badge>}
      />
      <LogsTable />
    </div>
  );
}
