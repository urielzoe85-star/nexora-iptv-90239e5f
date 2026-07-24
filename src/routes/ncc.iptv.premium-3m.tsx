import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/premium-3m")({
  component: () => (
    <AccountsView
      title="Premium 3 Mois"
      defaultType="premium"
      filter={{ account_type: "premium", package: "3 Months" }}
      showImport
      importLabel="Premium 3 Mois"
    />
  ),
});