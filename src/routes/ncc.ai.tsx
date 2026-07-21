import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ncc/ai")({
  component: () => <Outlet />,
});