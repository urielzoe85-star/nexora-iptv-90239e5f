import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/expired")({
  component: () => <AccountsView title="Comptes expirés" filter={{ status: "expired" }} />,
});
