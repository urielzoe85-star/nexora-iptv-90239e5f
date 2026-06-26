import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Tv, Film, Clapperboard, Trophy, Newspaper, Baby, Music2, Globe2,
  PlayCircle, Share2, MessageCircle, Send, Facebook, Twitter, Mail, Link2,
  Sparkles,
} from "lucide-react";
import { useT, useI18n, LanguageSwitcher } from "@/i18n/context";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalogue Nexora IPTV — Chaînes, films & VOD" },
      { name: "description", content: "Aperçu du catalogue Nexora IPTV : chaînes par pays, bouquets premium, films, séries et VOD. Catalogue mis à jour chaque semaine." },
      { property: "og:title", content: "Catalogue Nexora IPTV — Chaînes, films, séries & VOD" },
      { property: "og:description", content: "Découvrez en un coup d'œil ce que contient un abonnement Nexora IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/catalog" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/catalog" }],
  }),
  component: CatalogPage,
});

type Tab = "channels" | "bouquets" | "movies" | "series" | "vod";

const CHANNEL_COUNTRIES: { flag: string; name: string; count: number; samples: string[] }[] = [
  { flag: "🇫🇷", name: "France", count: 1200, samples: ["TF1", "France 2", "M6", "Canal+", "BeIN Sports 1-3", "RMC Sport", "OCS", "Cine+", "Eurosport", "Disney Channel"] },
  { flag: "🇧🇪", name: "Belgique", count: 320, samples: ["RTBF", "La Une", "Tipik", "RTL TVI", "Club RTL", "Plug RTL", "AB3", "VOO Sport"] },
  { flag: "🇨🇭", name: "Suisse", count: 280, samples: ["RTS 1", "RTS 2", "SRF 1", "SRF zwei", "Blue Sport", "TeleZüri"] },
  { flag: "🇬🇧", name: "United Kingdom", count: 950, samples: ["BBC One", "ITV", "Sky Sports", "TNT Sports", "Sky Cinema", "Sky News"] },
  { flag: "🇺🇸", name: "United States", count: 1800, samples: ["ESPN", "HBO", "CNN", "Fox News", "AMC", "Discovery", "NFL Network"] },
  { flag: "🇩🇪", name: "Deutschland", count: 850, samples: ["ARD", "ZDF", "RTL", "ProSieben", "Sky Bundesliga", "DAZN", "Sport1"] },
  { flag: "🇪🇸", name: "España", count: 620, samples: ["La 1", "Antena 3", "Telecinco", "Movistar+", "DAZN LaLiga"] },
  { flag: "🇮🇹", name: "Italia", count: 600, samples: ["Rai 1", "Canale 5", "Sky Sport", "DAZN", "Sky Cinema"] },
  { flag: "🇵🇹", name: "Portugal", count: 220, samples: ["RTP1", "SIC", "TVI", "Sport TV", "Benfica TV"] },
  { flag: "🇲🇦", name: "Maroc / Maghreb", count: 480, samples: ["2M", "Al Aoula", "Medi 1 TV", "Nessma", "El Hiwar Ettounsi"] },
  { flag: "🇸🇦", name: "العالم العربي", count: 1100, samples: ["MBC 1-4", "Rotana", "Al Jazeera", "beIN Sports MENA", "OSN Movies"] },
  { flag: "🇹🇷", name: "Türkiye", count: 350, samples: ["TRT 1", "Show TV", "ATV", "Star TV", "S Sport", "beIN Sports HD"] },
  { flag: "🇳🇱", name: "Nederland", count: 180, samples: ["NPO 1", "RTL 4", "Ziggo Sport", "ESPN NL"] },
  { flag: "🇵🇱", name: "Polska", count: 240, samples: ["TVP", "Polsat", "TVN", "Canal+ Sport"] },
  { flag: "🇧🇷", name: "Brasil & LATAM", count: 540, samples: ["Globo", "SporTV", "ESPN Brasil", "Telemundo", "Univision"] },
];

const BOUQUETS = [
  { name: "Canal+ / Cine+ / OCS", flags: "🇫🇷" },
  { name: "BeIN Sports / RMC Sport", flags: "🇫🇷" },
  { name: "Sky Sports / Sky Cinema", flags: "🇬🇧" },
  { name: "Sky Bundesliga / DAZN", flags: "🇩🇪" },
  { name: "Movistar+ / DAZN LaLiga", flags: "🇪🇸" },
  { name: "Sky Sport / DAZN", flags: "🇮🇹" },
  { name: "beIN Sports MENA / OSN", flags: "🇸🇦" },
  { name: "ESPN+ / HBO Max linéaire", flags: "🇺🇸" },
  { name: "Sport TV / Eleven Sports", flags: "🇵🇹" },
  { name: "TNT Sports / Premier League", flags: "🇬🇧" },
];

const MOVIES = [
  { genre: "Action", count: 12400, samples: ["Mission: Impossible — Dead Reckoning", "John Wick 4", "Fast X", "Top Gun: Maverick", "Dune Part Two"] },
  { genre: "Sci-Fi / Fantasy", count: 5800, samples: ["Avatar: The Way of Water", "Oppenheimer", "Interstellar", "Blade Runner 2049"] },
  { genre: "Comédie", count: 6900, samples: ["Barbie", "Astérix & Obélix", "Le Sens de la fête", "Qu'est-ce qu'on a fait au Bon Dieu 3"] },
  { genre: "Drame", count: 7200, samples: ["Killers of the Flower Moon", "The Whale", "Past Lives", "Anatomie d'une chute"] },
  { genre: "Animation", count: 3100, samples: ["Spider-Man: Across the Spider-Verse", "Le Garçon et le Héron", "Elemental", "Wish"] },
  { genre: "Thriller / Horreur", count: 4600, samples: ["Scream VI", "Talk to Me", "The Killer", "M3GAN"] },
];

const SERIES = [
  { genre: "Drama", samples: ["Succession", "The Last of Us", "House of the Dragon", "Better Call Saul", "Shōgun"] },
  { genre: "Crime / Thriller", samples: ["True Detective", "Slow Horses", "Mr. & Mrs. Smith", "Lupin"] },
  { genre: "Sci-Fi", samples: ["Foundation", "Severance", "Silo", "For All Mankind", "3 Body Problem"] },
  { genre: "Comédie", samples: ["The Bear", "Ted Lasso", "Only Murders in the Building", "Hacks"] },
  { genre: "Animation / Ados", samples: ["Arcane", "Invincible", "One Piece", "Demon Slayer"] },
  { genre: "Téléréalité & Docu-séries", samples: ["Drive to Survive", "Beckham", "Quarterback", "Top Chef"] },
];

const VOD = [
  { Icon: Newspaper, label: "Replay TV (TF1+, 6play, MyCanal, ARD, BBC iPlayer)" },
  { Icon: Trophy, label: "Sports — résumés, intégrales, multi-cam" },
  { Icon: Baby, label: "Jeunesse — Disney, Pixar, Nickelodeon, Boomerang" },
  { Icon: Globe2, label: "Documentaires — Nat Geo, Discovery, Arte, BBC Earth" },
  { Icon: Music2, label: "Spectacles, stand-up & concerts" },
  { Icon: PlayCircle, label: "Anime simulcast & catalogue VOSTFR" },
];

function CatalogPage() {
  const t = useT();
  const { locale } = useI18n();
  const [tab, setTab] = useState<Tab>("channels");
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => `https://nexora-iptv.com/catalog?lang=${locale}`, [locale]);
  const message = `${t("catalog.share.message")} ${shareUrl}`;
  const enc = encodeURIComponent;

  const shareLinks = [
    { key: "whatsapp", label: t("share.whatsapp"), href: `https://api.whatsapp.com/send?text=${enc(message)}`, Icon: MessageCircle },
    { key: "telegram", label: t("share.telegram"), href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(t("catalog.share.message"))}`, Icon: Send },
    { key: "facebook", label: t("share.facebook"), href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(t("catalog.share.message"))}`, Icon: Facebook },
    { key: "x", label: t("share.x"), href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(t("catalog.share.message"))}`, Icon: Twitter },
    { key: "email", label: t("share.email"), href: `mailto:?subject=${enc(t("share.emailSubject"))}&body=${enc(message)}`, Icon: Mail },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Nexora IPTV — Catalogue", text: t("catalog.share.message"), url: shareUrl });
      } catch { /* cancel */ }
    } else copy();
  };

  const homeHref = locale === "en" ? "/en/" : locale === "de" ? "/de/" : "/fr/";

  const tabs: { id: Tab; label: string; Icon: typeof Tv }[] = [
    { id: "channels", label: t("catalog.tab.channels"), Icon: Tv },
    { id: "bouquets", label: t("catalog.tab.bouquets"), Icon: Sparkles },
    { id: "movies", label: t("catalog.tab.movies"), Icon: Film },
    { id: "series", label: t("catalog.tab.series"), Icon: Clapperboard },
    { id: "vod", label: t("catalog.tab.vod"), Icon: PlayCircle },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a href={`${homeHref}#pricing`} className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-sm font-semibold hidden sm:inline-block">
              {t("catalog.cta.subscribe")}
            </a>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20">
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0" style={{ background: "var(--gradient-radial)" }} />
          <div className="relative max-w-6xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
              <span className="h-2 w-2 rounded-full bg-[color:var(--gold)] animate-pulse" />
              {t("catalog.badge")}
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("catalog.kicker")}</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t("catalog.title.a")}<span className="text-gradient-gold">{t("catalog.title.b")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("catalog.sub")}</p>
          </div>
        </section>

        {/* Tabs */}
        <section className="max-w-6xl mx-auto px-6 mt-12">
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {tabs.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                    active
                      ? "bg-[image:var(--gradient-gold)] text-black"
                      : "glass text-muted-foreground hover:text-foreground hover:border-[color:var(--gold)]/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {tab === "channels" && (
            <div>
              <SectionHead title={t("catalog.channels.title")} desc={t("catalog.channels.desc")} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CHANNEL_COUNTRIES.map((c) => (
                  <div key={c.name} className="glass rounded-2xl p-5 hover:border-[color:var(--gold)]/40 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-2xl leading-none">{c.flag}</span>
                        <span>{c.name}</span>
                      </div>
                      <span className="text-xs text-[color:var(--gold)] font-semibold">
                        {c.count.toLocaleString(locale)} {t("catalog.channelsCount")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.samples.map((s) => (
                        <span key={s} className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "bouquets" && (
            <div>
              <SectionHead title={t("catalog.bouquets.title")} desc={t("catalog.bouquets.desc")} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {BOUQUETS.map((b) => (
                  <div key={b.name} className="glass rounded-2xl p-5 flex items-center gap-3 hover:border-[color:var(--gold)]/40 transition">
                    <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-gold)] grid place-items-center text-black">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold leading-tight">{b.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.flags}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "movies" && (
            <div>
              <SectionHead title={t("catalog.movies.title")} desc={t("catalog.movies.desc")} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {MOVIES.map((m) => (
                  <div key={m.genre} className="glass rounded-2xl p-5 hover:border-[color:var(--gold)]/40 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 font-semibold"><Film className="h-4 w-4 text-[color:var(--gold)]" />{m.genre}</div>
                      <span className="text-xs text-[color:var(--gold)] font-semibold">
                        {m.count.toLocaleString(locale)} {t("catalog.titles")}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {m.samples.map((s) => <li key={s}>• {s}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "series" && (
            <div>
              <SectionHead title={t("catalog.series.title")} desc={t("catalog.series.desc")} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {SERIES.map((s) => (
                  <div key={s.genre} className="glass rounded-2xl p-5 hover:border-[color:var(--gold)]/40 transition">
                    <div className="flex items-center gap-2 font-semibold mb-3"><Clapperboard className="h-4 w-4 text-[color:var(--gold)]" />{s.genre}</div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {s.samples.map((x) => <li key={x}>• {x}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "vod" && (
            <div>
              <SectionHead title={t("catalog.vod.title")} desc={t("catalog.vod.desc")} />
              <div className="grid sm:grid-cols-2 gap-5">
                {VOD.map(({ Icon, label }) => (
                  <div key={label} className="glass rounded-2xl p-5 flex items-start gap-3 hover:border-[color:var(--gold)]/40 transition">
                    <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-gold)] grid place-items-center text-black shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
            {t("catalog.disclaimer")}
          </p>
        </section>

        {/* Share + CTA */}
        <section className="max-w-5xl mx-auto px-6 mt-16">
          <div className="glass rounded-3xl p-8 md:p-12">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">{t("share.kicker")}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t("catalog.share.title")}</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {shareLinks.map(({ key, label, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="glass px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition"
                >
                  <Icon className="h-4 w-4 text-[color:var(--gold)]" />
                  {label}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={copy} className="glass px-4 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:border-[color:var(--gold)]/40 transition">
                <Link2 className="h-4 w-4 text-[color:var(--gold)]" />
                {copied ? t("share.copied") : t("share.copy")}
              </button>
              <button type="button" onClick={nativeShare} className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                {t("share.native")}
              </button>
              <a href={`${homeHref}#pricing`} className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2">
                {t("catalog.cta.subscribe")}
              </a>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground break-all">{shareUrl}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-8">
      <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
