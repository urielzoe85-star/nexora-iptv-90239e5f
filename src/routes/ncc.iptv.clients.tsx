import { createFileRoute } from "@tanstack/react-router";
import { ActiveClientsView } from "@/components/ncc/iptv/ActiveClientsView";

export const Route = createFileRoute("/ncc/iptv/clients")({
  component: () => <ActiveClientsView />,
});