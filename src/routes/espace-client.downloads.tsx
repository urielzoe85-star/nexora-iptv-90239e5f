import { createFileRoute, Link } from "@tanstack/react-router";
import { PORTAL_BASE_URL } from "@/lib/portal-url";
import { Download, Smartphone, Tv2, Monitor } from "lucide-react";

export const Route = createFileRoute("/espace-client/downloads")({
  head: () => ({
    meta: [
      { title: 'Applications & téléchargements — Nexora IPTV' },
      { name: "description", content: 'Téléchargez les applications IPTV recommandées pour Smart TV, mobile, tablette et PC.' },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: 'Applications & téléchargements — Nexora IPTV' },
      { property: "og:description", content: 'Téléchargez les applications IPTV recommandées pour Smart TV, mobile, tablette et PC.' },
      { property: "og:url", content: `${PORTAL_BASE_URL}/espace-client/downloads` },
    ],
    links: [{ rel: "canonical", href: `${PORTAL_BASE_URL}/espace-client/downloads` }],
  }),
  component: DownloadsPage,
});

const APPS = [
  { name: "M-IBO Player", os: "Android (APK)", icon: Smartphone,
    url: "https://pub-32ee8b5200cb4935b28bee48941d5806.r2.dev/android/m-ibo.apk" },
  { name: "IPTV Smarters Pro", os: "Android / iOS / Smart TV", icon: Smartphone,
    url: "https://www.iptvsmarters.com/" },
  { name: "TiviMate", os: "Android TV / Fire TV", icon: Tv2,
    url: "https://tivimate.com/" },
  { name: "GSE Smart IPTV", os: "iOS / iPadOS", icon: Smartphone,
    url: "https://apps.apple.com/us/app/gse-smart-iptv-live-tv-player/id1030153473" },
  { name: "VLC Media Player", os: "Windows / macOS / Linux", icon: Monitor,
    url: "https://www.videolan.org/vlc/" },
];

function DownloadsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Téléchargements & guides</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Applications compatibles Nexora IPTV. Consultez le guide d'installation adapté à votre appareil.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-3">
        {APPS.map(({ name, os, icon: Icon, url }) => (
          <a key={name} href={url} target="_blank" rel="noreferrer" className="glass rounded-xl p-5 flex items-center gap-3 hover:border-[color:var(--gold)]/40 transition">
            <Icon className="h-6 w-6 text-[color:var(--gold)]" />
            <div className="flex-1">
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground">{os}</div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-2">Guides d'installation</h2>
        <div className="space-y-2 text-sm">
          <Link to="/fr/guide-iptv" className="block text-[color:var(--gold)] hover:underline">Guide d'installation (FR)</Link>
          <Link to="/en/guide-iptv" className="block text-[color:var(--gold)] hover:underline">Setup guide (EN)</Link>
        </div>
      </div>
    </div>
  );
}