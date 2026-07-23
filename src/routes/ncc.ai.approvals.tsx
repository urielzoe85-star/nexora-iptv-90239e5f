import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { ApprovalsView } from "@/components/ncc/ai/ApprovalsView";

export const Route = createFileRoute("/ncc/ai/approvals")({
  component: () => (
    <div>
      <NccPageHeader
        icon={ShieldCheck}
        title="Approbations IA"
        description="Valide ou rejette les actions proposées par l'IA (client & copilote NCC)."
      />
      <ApprovalsView />
    </div>
  ),
});