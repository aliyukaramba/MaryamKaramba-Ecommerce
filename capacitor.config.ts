import type { CapacitorConfig } from "@capacitor/cli";

/**
 * This app is NOT bundled as a static export inside the native shell —
 * Capacitor's WebView instead loads the live production site directly
 * (server.url below). This is deliberate: the site relies on Server
 * Actions, dynamic SSR, and cookie-based sessions (both admin and
 * customer auth), none of which work in a fully static bundle. The
 * native app is effectively a dedicated, installable window onto the
 * real site, with native plugins (push notifications, etc.) bridged in
 * on top.
 *
 * Before building for real devices/app stores, replace the URL below
 * with your actual production domain.
 */
const config: CapacitorConfig = {
  appId: "com.yourstore.app", // TODO: replace with your real reverse-DNS app id before building
  appName: "Your Store",       // TODO: replace with your real app name
  webDir: "www", // placeholder dir - see www/index.html; not what actually loads at runtime
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://yourdomain.com",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
