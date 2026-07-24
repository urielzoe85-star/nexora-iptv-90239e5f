import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/renewals")({
  component: () => <AccountsView title="À renouveler (7 jours)" filter={{ expiring_within_days: 7, account_type: "premium" }} />,
});
