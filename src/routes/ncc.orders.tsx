import { createFileRoute } from "@tanstack/react-router";
import { NccModulePlaceholder } from "@/components/ncc/NccModulePlaceholder";
import { getModule } from "@/lib/ncc/modules";

export const Route = createFileRoute("/ncc/orders")({
  component: () => {
    const m = getModule("orders");
    if (!m) return null;
    return <NccModulePlaceholder module={m} />;
  },
});
