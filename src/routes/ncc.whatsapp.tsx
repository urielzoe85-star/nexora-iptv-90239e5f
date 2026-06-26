import { createFileRoute } from "@tanstack/react-router";
import { NccModulePlaceholder } from "@/components/ncc/NccModulePlaceholder";
import { getModule } from "@/lib/ncc/modules";

export const Route = createFileRoute("/ncc/whatsapp")({
  component: () => {
    const m = getModule("whatsapp");
    if (!m) return null;
    return <NccModulePlaceholder module={m} />;
  },
});
