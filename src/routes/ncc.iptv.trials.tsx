import { createFileRoute } from "@tanstack/react-router";
import { AccountsView } from "@/components/ncc/iptv/AccountsView";

export const Route = createFileRoute("/ncc/iptv/trials")({
  component: () => <AccountsView title="Réserve d'essais gratuits" defaultType="trial" filter={{ account_type: "trial" }} />,
});
