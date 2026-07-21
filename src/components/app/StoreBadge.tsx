import { Apple, Play, AppWindow } from "lucide-react";

type Store = "appstore" | "googleplay" | "microsoft";

const LABEL: Record<Store, string> = {
  appstore: "Disponible sur App Store",
  googleplay: "Disponible sur Google Play",
  microsoft: "Disponible sur Microsoft Store",
};

export function StoreBadge({ store, href }: { store: Store; href: string }) {
  const Icon = store === "appstore" ? Apple : store === "googleplay" ? Play : AppWindow;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-transform hover:-translate-y-0.5"
      style={{
        background: "#0b0b0f",
        color: "#ffffff",
      }}
    >
      <Icon className="h-4 w-4" />
      {LABEL[store]}
    </a>
  );
}

export default StoreBadge;