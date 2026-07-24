import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/premium-1m")({
  component: () => (
    <AccountsView
      title="Premium 1 Mois"
      defaultType="premium"
      filter={{ account_type: "premium", package: "1 Month" }}
      showImport
      importLabel="Premium 1 Mois"
    />
  ),
});