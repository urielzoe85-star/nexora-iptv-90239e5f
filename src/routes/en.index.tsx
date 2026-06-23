import { createFileRoute } from "@tanstack/react-router";
import { NexoraLanding } from "./index";

export const Route = createFileRoute("/en/")({
  component: NexoraLanding,
});