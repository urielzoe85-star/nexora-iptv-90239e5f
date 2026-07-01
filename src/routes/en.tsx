import { createFileRoute, Outlet } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";

export const Route = createFileRoute("/en")({
  head: () => ({
    meta: [{ property: "og:locale", content: "en_US" }],
  }),
  component: () => (
    <I18nProvider forced="en">
      <Outlet />
    </I18nProvider>
  ),
});