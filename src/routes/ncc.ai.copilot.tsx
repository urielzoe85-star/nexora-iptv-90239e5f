import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { CopilotView } from "@/components/ncc/ai/CopilotView";

export const Route = createFileRoute("/ncc/ai/copilot")({
  component: () => (
    <div>
      <NccPageHeader
        icon={Sparkles}
        title="Copilote IA"
        description="Discute avec l'IA Nexora, analyse ton business et prépare des actions à valider."
      />
      <CopilotView />
    </div>
  ),
});