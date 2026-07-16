import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { BulkSendPage } from "@/components/ncc/bulk/BulkSendPage";

export const Route = createFileRoute("/ncc/bulk")({
  component: () => (
    <div>
      <NccPageHeader
        icon={Megaphone}
        title="Envoi en masse"
        description="Relance client par lot — livraison, renouvellement, paiement — sur WhatsApp, Telegram et Email."
      />
      <BulkSendPage />
    </div>
  ),
});