import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/suspended")({
  component: () => <AccountsView title="Comptes suspendus" filter={{ status: "suspended" }} />,
});
