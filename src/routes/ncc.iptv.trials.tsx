// Ancien onglet — redirige vers /ncc/iptv/essai.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ncc/iptv/trials")({
  beforeLoad: () => { throw redirect({ to: "/ncc/iptv/essai" }); },
});
