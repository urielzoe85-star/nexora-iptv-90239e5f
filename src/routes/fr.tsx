import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n/context";

export const Route = createFileRoute("/fr")({
  head: () => ({
    meta: [{ property: "og:locale", content: "fr_FR" }],
  }),
  component: () => (
    <I18nProvider forced="fr">
      <Outlet />
    </I18nProvider>
  ),
});