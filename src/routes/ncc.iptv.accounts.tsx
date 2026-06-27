import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/accounts")({
  component: () => <AccountsView title="Tous les comptes" />,
});