let open = false;
const listeners = new Set<() => void>();

export const aiAssistant = {
  isOpen: () => open,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(v: boolean) {
    if (open === v) return;
    open = v;
    listeners.forEach((l) => l());
  },
  toggle() {
    aiAssistant.set(!open);
  },
};