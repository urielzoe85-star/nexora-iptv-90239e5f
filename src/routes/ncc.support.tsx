import { createFileRoute } from "@tanstack/react-router";
import { NccModulePlaceholder } from "@/components/ncc/NccModulePlaceholder";
import { getModule } from "@/lib/ncc/modules";

export const Route = createFileRoute("/ncc/support")({
  component: () => {
    const m = getModule("support");
    if (!m) return null;
    return <NccModulePlaceholder module={m} />;
  },
});
