import { createFileRoute } from "@tanstack/react-router";
import { NccModulePlaceholder } from "@/components/ncc/NccModulePlaceholder";
import { getModule } from "@/lib/ncc/modules";

export const Route = createFileRoute("/ncc/telegram")({
  component: () => {
    const m = getModule("telegram");
    if (!m) return null;
    return <NccModulePlaceholder module={m} />;
  },
});
