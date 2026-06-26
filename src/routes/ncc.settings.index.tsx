import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/ncc/settings/")({
  component: () => <Navigate to="/ncc/settings/$section" params={{ section: "company" }} replace />,
});
