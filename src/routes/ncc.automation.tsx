import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { AutomationPage } from "@/components/ncc/automation/AutomationPage";

export const Route = createFileRoute("/ncc/automation")({
  component: () => (
    <div>
      <NccPageHeader
        icon={Workflow}
        title="Automation Engine"
        description="Moteur de workflows métier — déclencheurs, actions, historique d'exécution."
      />
      <AutomationPage />
    </div>
  ),
});
