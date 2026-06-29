import { createFileRoute, Link } from "@tanstack/react-router";
import { Tv, Smartphone, Monitor, Download, KeyRound, PlayCircle, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

const FAQ = [
  {
    q: "How do I install IPTV on my TV or phone?",
    a: "Install a compatible app (IPTV Smarters Pro, TiviMate, Smart IPTV, GSE Smart IPTV or XCIPTV), open it, choose 'Add User' or 'Add Playlist', then enter the M3U URL or Xtream Codes credentials (host, username, password) sent by email after your subscription. The app loads channels and VOD within seconds.",
  },
  {
    q: "How can I watch live TV on the internet for free?",
    a: "Free national channels (BBC, ITV, ABC, NBC, France TV, RAI, RTVE) stream legally and free on the broadcasters' official platforms (BBC iPlayer, ITVX, Pluto TV, Tubi, Plex Live, Samsung TV Plus). For an international bouquet or premium channels centralized in a single player, a legal IPTV subscription is the most convenient option.",
  },
  {
    q: "What is the best IPTV app?",
    a: "On Android and Android TV: IPTV Smarters Pro and TiviMate are the most popular. On iPhone / iPad and Apple TV: IPTV Smarters Pro and GSE Smart IPTV. On Samsung / LG Smart TVs: Smart IPTV or SET IPTV. On Fire TV Stick: IPTV Smarters Pro via the Amazon App Store.",
  },
  {
    q: "How do I get IPTV on a Smart TV without an Android box?",
    a: "On Samsung and LG, install Smart IPTV or SET IPTV from the TV's app store, note the MAC address shown by the app, then add your M3U playlist via the app's web portal. The TV downloads the playlist automatically on each boot.",
  },
  {
    q: "Which devices are IPTV-compatible?",
    a: "Android / Android TV, iOS / Apple TV, Samsung Tizen and LG webOS Smart TVs, Fire TV Stick, MAG boxes (Infomir), Formuler, Windows, macOS, Linux, and any modern web browser through an online player.",
  },
  {
    q: "Why is my IPTV not working or buffering?",
    a: "Check: (1) your bandwidth (15 Mbps minimum for FHD, 25 Mbps for 4K), (2) that you're connected via Ethernet or 5 GHz Wi-Fi, (3) that the device's date and time are correct, (4) that the app is up to date. If a specific channel won't load, try another stream from the same bouquet — the server may failover automatically.",
  },
  {
    q: "Do I need a VPN to watch live TV online?",
    a: "A VPN is not mandatory with a legal IPTV subscription. It improves privacy on public Wi-Fi and can unblock some geo-restricted channels, but it does not make an unauthorized service legal.",
  },
];

export const Route = createFileRoute("/en/guide-iptv")({
  head: () => ({
    meta: [
      { title: "How to Install IPTV and Watch Live TV Online — 2026 Guide" },
      { name: "description", content: "Install IPTV on Smart TV, Android, iPhone, Fire TV and Apple TV: M3U / Xtream Codes setup and live TV streaming guide." },
      { property: "og:title", content: "How to Install IPTV and Watch Live TV Online — Nexora Guide" },
      { property: "og:description", content: "IPTV installation step by step: apps, M3U / Xtream Codes setup, troubleshooting and FAQ." },
      { property: "og:url", content: "https://nexora-iptv.com/en/guide-iptv" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "en_US" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/en/guide-iptv" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to install IPTV and watch live TV on the internet",
          description: "Install an IPTV app, configure your M3U or Xtream Codes access and start streaming live on any device.",
          totalTime: "PT5M",
          step: [
            { "@type": "HowToStep", name: "Choose an IPTV app", text: "Install IPTV Smarters Pro, TiviMate, Smart IPTV or GSE Smart IPTV depending on your device." },
            { "@type": "HowToStep", name: "Get your credentials", text: "Open the confirmation email and note the M3U URL or Xtream Codes credentials (host, username, password)." },
            { "@type": "HowToStep", name: "Add the playlist", text: "In the app, choose 'Add User' or 'Add Playlist' and paste the information." },
            { "@type": "HowToStep", name: "Start streaming", text: "Wait for channels to load, open the desired category and start the live stream or VOD." },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: GuideIPTVPage,
});

function GuideIPTVPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[color:var(--gold)]/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/en" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-gold)] grid place-items-center font-bold text-black">N</div>
            <span className="font-semibold tracking-wide">NEXORA <span className="text-gradient-gold">IPTV</span></span>
          </Link>
          <Link to="/en" className="text-sm text-muted-foreground hover:text-foreground transition">← Home</Link>
        </div>
      </header>

      <main className="pt-28 pb-24">
        <article className="max-w-3xl mx-auto px-6">
          <p className="text-sm text-[color:var(--gold)] uppercase tracking-wider mb-3">Guide · Updated 2026</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            How to install IPTV and watch live TV on the internet
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            This English guide explains how to install an IPTV app, configure your access (M3U
            link or Xtream Codes) and watch live TV online from your Smart TV, smartphone,
            computer or Android box. Follow the steps — activation takes less than five minutes.
          </p>

          <section className="grid sm:grid-cols-2 gap-4 mb-12">
            <FeatureCard icon={<Download className="h-5 w-5" />} title="1. Install the app">
              IPTV Smarters Pro, TiviMate, Smart IPTV or GSE Smart IPTV depending on your device.
            </FeatureCard>
            <FeatureCard icon={<KeyRound className="h-5 w-5" />} title="2. Get your credentials">
              M3U link or Xtream Codes credentials emailed to you after subscription.
            </FeatureCard>
            <FeatureCard icon={<Tv className="h-5 w-5" />} title="3. Add the playlist">
              Paste the M3U URL or enter host, username and password in the app.
            </FeatureCard>
            <FeatureCard icon={<PlayCircle className="h-5 w-5" />} title="4. Start streaming">
              Channels appear within seconds, sorted by category.
            </FeatureCard>
          </section>

          <h2 className="text-2xl font-semibold mb-4">Which IPTV app should you choose?</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            <AppCard icon={<Smartphone className="h-5 w-5" />} title="Android & Android TV" apps="IPTV Smarters Pro, TiviMate, XCIPTV" />
            <AppCard icon={<Smartphone className="h-5 w-5" />} title="iPhone, iPad & Apple TV" apps="IPTV Smarters Pro, GSE Smart IPTV" />
            <AppCard icon={<Tv className="h-5 w-5" />} title="Samsung & LG Smart TV" apps="Smart IPTV, SET IPTV (no box required)" />
            <AppCard icon={<Tv className="h-5 w-5" />} title="Fire TV Stick" apps="IPTV Smarters Pro via Amazon App Store" />
            <AppCard icon={<Monitor className="h-5 w-5" />} title="Windows, macOS, Linux" apps="IPTV Smarters, VLC, MyIPTV Player" />
            <AppCard icon={<Monitor className="h-5 w-5" />} title="MAG / Formuler boxes" apps="Stalker / Portal URL provided at subscription" />
          </div>

          <h2 className="text-2xl font-semibold mb-4">Install IPTV Smarters Pro — step by step</h2>
          <ol className="space-y-4 mb-12 list-decimal pl-5 text-muted-foreground leading-relaxed marker:text-[color:var(--gold)] marker:font-semibold">
            <li><strong className="text-foreground">Download the app</strong> from the Google Play Store, App Store or Amazon App Store depending on your device.</li>
            <li><strong className="text-foreground">Open the app</strong> and accept the terms of use and storage access.</li>
            <li><strong className="text-foreground">Choose 'Login with Xtream Codes API'</strong> (recommended) — this method syncs EPG and VOD.</li>
            <li><strong className="text-foreground">Enter your credentials</strong> received by email: any name, the server URL (e.g. <code className="text-[color:var(--gold)]">http://server.example.com:8080</code>), your username and password.</li>
            <li><strong className="text-foreground">Confirm</strong> — the app loads the channel list, TV guide and VOD.</li>
            <li><strong className="text-foreground">Open 'Live TV'</strong>, pick a category (Sports, USA, International…) and start streaming.</li>
          </ol>

          <h2 className="text-2xl font-semibold mb-4">Configure an M3U playlist manually</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The M3U method works with almost every IPTV app. In the app, choose 'Add Playlist' →
            'M3U URL', paste the link provided by your provider then save. Avoid the 'M3U File'
            method: if you change device or network, the list will need to be re-imported on
            every update.
          </p>

          <h2 className="text-2xl font-semibold mb-4">Watch live TV online for free</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            For free-to-air national channels (BBC, ITV, ABC, NBC, RAI, RTVE), the broadcasters
            stream live legally and free on their official platforms: <strong>BBC iPlayer</strong>,
            <strong> ITVX</strong>, <strong>Pluto TV</strong>, <strong>Tubi</strong>,
            <strong> Plex Live</strong> and <strong>Samsung TV Plus</strong>. For an international
            bouquet or premium channels centralized in one player, a legal IPTV subscription
            remains the most convenient solution.
          </p>

          <h2 className="text-2xl font-semibold mb-4">Quick troubleshooting</h2>
          <ul className="space-y-3 mb-12">
            {[
              "Constant buffering: switch to Ethernet or 5 GHz Wi-Fi, restart the internet box, check your bandwidth (15 Mbps FHD, 25 Mbps 4K).",
              "Authentication error: re-enter URL, username and password carefully (mind spaces and capitals).",
              "No channels showing: check the device date and time, then update the app.",
              "One channel crashes: try another stream in the same bouquet or wait a few minutes — the server may failover.",
              "Empty EPG: reconnect via Xtream Codes rather than M3U to enable the TV guide.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mb-4">Best practices</h2>
          <ul className="space-y-3 mb-12">
            {[
              "Choose a transparent provider (legal entity, HTTPS payment, reachable support).",
              "Keep your Xtream credentials private: never share them on forums.",
              "Enable automatic app updates to keep recent codecs.",
              "Use an HDMI 2.0+ cable for 4K HDR.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[color:var(--gold)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2"><HelpCircle className="h-6 w-6 text-[color:var(--gold)]" /> Frequently asked questions</h2>
          <div className="space-y-6 mb-12">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/5 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Tv className="h-8 w-8 text-[color:var(--gold)] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Ready to watch live TV?</p>
              <p className="text-sm text-muted-foreground">Discover Nexora IPTV subscriptions: instant activation, multi-device and 24/7 support.</p>
            </div>
            <Link to="/en" className="px-5 py-2.5 rounded-lg bg-[image:var(--gradient-gold)] text-black font-semibold whitespace-nowrap">See plans</Link>
          </div>
        </article>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function AppCard({ icon, title, apps }: { icon: React.ReactNode; title: string; apps: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-2 text-[color:var(--gold)]">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground leading-relaxed">{apps}</p>
    </div>
  );
}