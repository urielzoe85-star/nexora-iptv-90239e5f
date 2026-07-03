import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { AutomationPage } from "@/components/ncc/automation/AutomationPage";

export const Route = createFileRoute("/admin/automation")({
  component: AdminAutomationPage,
});

function AdminAutomationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Workflow className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Automation Engine</h1>
          <p className="text-sm text-muted-foreground">
            File d'attente, drainage et historique — accès administrateur direct (pas de code NCC requis).
          </p>
        </div>
      </div>
      <AutomationPage />
    </div>
  );
}