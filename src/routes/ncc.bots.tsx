import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { BotsPage } from "@/components/ncc/bots/BotsPage";

export const Route = createFileRoute("/ncc/bots")({
  component: () => (
    <div>
      <NccPageHeader
        icon={Bot}
        title="Bots"
        description="Orchestration des assistants Telegram : commandes, webhook, alertes admin et diffusion."
      />
      <BotsPage />
    </div>
  ),
});