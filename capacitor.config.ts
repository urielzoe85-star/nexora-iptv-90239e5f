import type { CapacitorConfig } from '@capacitor/cli';

// Source de vérité de la configuration du wrapper Capacitor Android.
// IMPORTANT : `server.url` doit pointer sur l'hôte FINAL (nexora-iptv.com).
// `app.nexora-iptv.com` renvoie un HTTP 302 vers nexora-iptv.com : au démarrage,
// Android considérait ce changement d'hôte comme une navigation externe et
// ouvrait Chrome en laissant la WebView blanche.
// `allowNavigation` autorise tous les sous-domaines Nexora (www, app, account)
// afin que checkout, espace client et redirections internes restent dans l'app.
const config: CapacitorConfig = {
  appId: 'com.nexora.app',
  appName: 'Nexora',
  server: {
    url: 'https://nexora-iptv.com',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['nexora-iptv.com', '*.nexora-iptv.com'],
  },
};

export default config;
