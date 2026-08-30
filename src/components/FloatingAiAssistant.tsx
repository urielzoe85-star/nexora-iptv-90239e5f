import { useRouterState } from "@tanstack/react-router";
import { aiAssistant } from "@/lib/ai-assistant";
import nexoraAiLogo from "@/assets/nexora-ai-logo.png";

export function FloatingAiAssistant() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/admin") || path.startsWith("/ncc")) return null;

  return (
    <div className="relative z-[60]">
      <button
        type="button"
        onClick={() => aiAssistant.toggle()}
        aria-label="Ouvrir l'assistant Nexora AI"
        data-event="nexora_ai_floating_click"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_30px_-6px_rgba(212,175,55,0.55)] transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/40 md:h-16 md:w-16"
        style={{ background: "radial-gradient(circle at 30% 25%, #1a3a7a 0%, #0B1E3F 65%, #050d1f 100%)" }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: "#D4AF37" }}
        />
        <img
          src={nexoraAiLogo}
          alt=""
          aria-hidden
          width={64}
          height={64}
          className="relative h-9 w-9 md:h-10 md:w-10 object-contain drop-shadow"
        />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
      </button>
    </div>
  );
}
