import { FloatingAiAssistant } from "./FloatingAiAssistant";
import { FloatingWhatsApp } from "./FloatingWhatsApp";

export function FloatingActions() {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
      <FloatingAiAssistant />
      <FloatingWhatsApp />
    </div>
  );
}
