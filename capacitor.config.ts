import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native wrappers for the App Store and Google Play. The apps load the live
 * site so every release of the web app ships to phones instantly; native
 * plugins (geolocation, share sheet, app lifecycle) are available to the page.
 *
 *   npx cap add ios      # once, on a Mac with Xcode
 *   npx cap add android  # once, with Android Studio
 *   npm run cap:sync     # after changing this file or installing plugins
 *   npx cap open ios | android
 */
const config: CapacitorConfig = {
  appId: "com.routediscover.app",
  appName: "RouteDiscover",
  webDir: "public",
  server: {
    url: process.env.CAP_SERVER_URL || "https://routediscover.com",
    cleartext: false,
  },
  ios: { contentInset: "automatic", backgroundColor: "#fbfaf7" },
  android: { backgroundColor: "#fbfaf7", allowMixedContent: false },
  plugins: {
    SplashScreen: { backgroundColor: "#1c2b5a", launchAutoHide: true, showSpinner: false },
  },
};

export default config;
