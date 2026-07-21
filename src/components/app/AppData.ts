export interface RecommendedApp {
  name: string;
  description: string;
  stores: { appstore?: string; googleplay?: string; microsoft?: string };
}

// Applications tierces publiques, disponibles uniquement sur les boutiques officielles.
// Aucune fonctionnalité de diffusion, aucun contenu, aucun identifiant n'est fourni par Nexora.
export const RECOMMENDED_APPS: RecommendedApp[] = [
  {
    name: "VLC",
    description: "Lecteur multimédia libre et gratuit, largement utilisé pour la lecture de fichiers locaux.",
    stores: {
      appstore: "https://apps.apple.com/app/vlc-for-mobile/id650377962",
      googleplay: "https://play.google.com/store/apps/details?id=org.videolan.vlc",
      microsoft: "https://apps.microsoft.com/detail/9nblggh4vp3g",
    },
  },
  {
    name: "Kodi",
    description: "Centre multimédia open source pour organiser vos fichiers personnels.",
    stores: {
      googleplay: "https://play.google.com/store/apps/details?id=org.xbmc.kodi",
      microsoft: "https://apps.microsoft.com/detail/9nblggh4t892",
    },
  },
  {
    name: "Plex",
    description: "Organisez et lisez votre bibliothèque multimédia personnelle sur tous vos appareils.",
    stores: {
      appstore: "https://apps.apple.com/app/plex/id383457673",
      googleplay: "https://play.google.com/store/apps/details?id=com.plexapp.android",
      microsoft: "https://apps.microsoft.com/detail/9wzdncrfj3tj",
    },
  },
  {
    name: "Infuse",
    description: "Lecteur vidéo élégant pour iPhone, iPad, Apple TV et Mac.",
    stores: {
      appstore: "https://apps.apple.com/app/infuse-7/id1136220934",
    },
  },
  {
    name: "MX Player",
    description: "Lecteur vidéo populaire sur Android avec prise en charge de nombreux formats.",
    stores: {
      googleplay: "https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad",
    },
  },
  {
    name: "Jellyfin",
    description: "Serveur multimédia libre pour diffuser vos propres contenus depuis chez vous.",
    stores: {
      appstore: "https://apps.apple.com/app/jellyfin-mobile/id1480192618",
      googleplay: "https://play.google.com/store/apps/details?id=org.jellyfin.mobile",
    },
  },
];

export const DEVICES = [
  { name: "iPhone", icon: "Smartphone" as const },
  { name: "iPad", icon: "Tablet" as const },
  { name: "Android", icon: "Smartphone" as const },
  { name: "Android TV", icon: "Tv" as const },
  { name: "Google TV", icon: "Tv" as const },
  { name: "Apple TV", icon: "Airplay" as const },
  { name: "Windows", icon: "Monitor" as const },
  { name: "macOS", icon: "Laptop" as const },
  { name: "Smart TV", icon: "Tv2" as const },
];

export const FAQ = [
  {
    q: "Qu'est-ce que Nexora ?",
    a: "Nexora est une plateforme technologique qui recense des applications publiques disponibles sur les boutiques officielles et propose des ressources utiles pour vos appareils.",
  },
  {
    q: "Nexora fournit-il du contenu ou des identifiants ?",
    a: "Non. Nexora ne fournit aucun contenu multimédia, aucune playlist, aucun identifiant, aucun fichier M3U ni aucun code Xtream.",
  },
  {
    q: "Où sont téléchargées les applications ?",
    a: "Exclusivement depuis les boutiques officielles : App Store, Google Play et Microsoft Store.",
  },
  {
    q: "Sur quels appareils Nexora est-il disponible ?",
    a: "iPhone, iPad, Android, Android TV, Google TV, Apple TV, Windows, macOS et Smart TV compatibles.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Rendez-vous dans le Centre d'aide pour accéder aux tutoriels, à la FAQ et aux options de contact.",
  },
];