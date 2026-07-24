import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/essai")({
  component: () => (
    <AccountsView
      title="Essai gratuit (24h)"
      defaultType="trial"
      filter={{ account_type: "trial", package: "24 Hours" }}
      showImport
      importLabel="Essai gratuit (24 Hours)"
    />
  ),
});