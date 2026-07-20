"use client";

import { useEffect } from "react";
import { registerPushToken } from "@/actions/push-token";

/**
 * Mounted once in the root layout. On the regular website (opened in a
 * normal browser), `Capacitor.isNativePlatform()` is false and this does
 * nothing at all — zero effect on the web experience. Only inside the
 * wrapped native app does it request push permission and register the
 * device's token with the server.
 *
 * Dynamically imports @capacitor/core so it's never pulled into the
 * regular web bundle at all.
 */
export function CapacitorBridge() {
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // Dynamic import: on the web, @capacitor/core still resolves but
      // isNativePlatform() is simply false, and nothing further happens.
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      const permStatus = await PushNotifications.checkPermissions();
      let granted = permStatus.receive === "granted";

      if (permStatus.receive === "prompt") {
        const requested = await PushNotifications.requestPermissions();
        granted = requested.receive === "granted";
      }

      if (!granted || cancelled) return;

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
        await registerPushToken({ token: token.value, platform });
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration failed:", error);
      });
    }

    setup().catch((error) => {
      console.error("CapacitorBridge setup failed:", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
