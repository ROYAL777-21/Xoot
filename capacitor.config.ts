import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "za.co.zoot.app",
  appName: "Zoot",
  webDir: "dist",
  server: {
    androidScheme: "https",
    iosScheme: "zoot",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#F7F0E7",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
