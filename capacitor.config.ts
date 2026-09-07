import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.immrtldragon.workforcehub",
  appName: "Workforce Hub",
  webDir: "android-shell",
  server: {
    url: "https://workforce-hub-production.up.railway.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
