import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COUNTRY_LOCALE, DEFAULT_LOCALE, LOCALES, MESSAGES, localeFromBcp47, type Locale } from "./messages";

const STORAGE_KEY = "nexora-lang";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function detectInitial(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && (stored === "fr" || stored === "en" || stored === "de")) return stored;
  } catch {}
  const langs = (typeof navigator !== "undefined"
    ? [navigator.language, ...(navigator.languages ?? [])]
    : []
  ).filter(Boolean);
  for (const tag of langs) {
    const region = tag.split("-")[1]?.toUpperCase();
    if (region && COUNTRY_LOCALE[region]) return COUNTRY_LOCALE[region];
    const fromTag = localeFromBcp47(tag);
    if (fromTag) return fromTag;
  }
  try {
    const region = (Intl.DateTimeFormat().resolvedOptions().locale ?? "").split("-")[1]?.toUpperCase();
    if (region && COUNTRY_LOCALE[region]) return COUNTRY_LOCALE[region];
  } catch {}
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children, forced }: { children: ReactNode; forced?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(forced ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (forced) {
      setLocaleState(forced);
      try { window.localStorage.setItem(STORAGE_KEY, forced); } catch {}
      return;
    }
    setLocaleState(detectInitial());
  }, [forced]);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<Ctx>(() => ({
    locale,
    setLocale: (l) => {
      setLocaleState(l);
      try { window.localStorage.setItem(STORAGE_KEY, l); } catch {}
    },
    t: (key) => MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key,
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so SSR / boundaries outside the provider don't crash.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: string) => MESSAGES[DEFAULT_LOCALE][key] ?? key,
    } as Ctx;
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.code === locale)!;
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        aria-label="Language"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs hover:border-[color:var(--gold)]/40 transition"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="uppercase tracking-wider">{current.code}</span>
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 min-w-[160px] rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl p-1 z-50 shadow-xl">
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setLocale(l.code); setOpen(false); }}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/5 ${l.code === locale ? "text-[color:var(--gold)]" : ""}`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}