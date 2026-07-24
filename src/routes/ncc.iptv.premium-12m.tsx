import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/premium-12m")({
  component: () => (
    <AccountsView
      title="Premium 12 Mois"
      defaultType="premium"
      filter={{ account_type: "premium", package: "1 Year" }}
      showImport
      importLabel="Premium 12 Mois"
    />
  ),
});