import { useRouterState } from "@tanstack/react-router";
import { buildWhatsAppLink } from "@/lib/whatsapp-contact";

export function FloatingWhatsApp() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/admin") || path.startsWith("/ncc")) return null;

  const href = buildWhatsAppLink({
    message: "Bonjour Nexora, je souhaite en savoir plus sur vos abonnements IPTV 🙏",
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      data-event="whatsapp_floating_click"
      className="group fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_30px_-6px_rgba(37,211,102,0.55)] transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 md:h-16 md:w-16"
      style={{ backgroundColor: "#25D366" }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full animate-ping opacity-40"
        style={{ backgroundColor: "#25D366" }}
      />
      <svg
        viewBox="0 0 32 32"
        className="relative h-8 w-8 md:h-9 md:w-9"
        fill="#ffffff"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.315.244-.658.244-1.001 0-.058 0-.144-.03-.187-.1-.172-2.434-1.53-2.678-1.53zm-2.908 7.593c-1.747 0-3.48-.53-4.942-1.49L7.793 24.41l1.132-3.337a8.955 8.955 0 0 1-1.72-5.272c0-4.955 4.04-8.995 8.997-8.995S25.2 10.845 25.2 15.8c0 4.958-4.04 8.998-8.998 8.998zm0-19.798c-5.96 0-10.8 4.842-10.8 10.8 0 1.964.53 3.898 1.546 5.574L5 27.202l5.974-1.92a10.807 10.807 0 0 0 16.03-9.482c0-5.958-4.842-10.8-10.802-10.8z" />
      </svg>
    </a>
  );
}