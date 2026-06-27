import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/premium")({
  component: () => <AccountsView title="Comptes Premium" defaultType="premium" filter={{ account_type: "premium" }} />,
});
