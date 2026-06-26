import { createFileRoute } from "@tanstack/react-router";
import { NccModulePlaceholder } from "@/components/ncc/NccModulePlaceholder";
import { getModule } from "@/lib/ncc/modules";

export const Route = createFileRoute("/ncc/bots")({
  component: () => {
    const m = getModule("bots");
    if (!m) return null;
    return <NccModulePlaceholder module={m} />;
  },
});
