import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexora.hub",
  appName: "Nexora Hub",
  webDir: "dist",
  server: {
    url: "https://app.nexora-iptv.com",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: "#0B1B3B",
  },
  android: {
    backgroundColor: "#0B1B3B",
  },
};

export default config;
