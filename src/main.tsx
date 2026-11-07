import { assertProductionEnv } from "@/lib/env-check";
import { initMonitoring } from "@/lib/monitoring";
import { applyPrePaintThemeClass } from "@/lib/theme-scope";
import { createRoot } from "react-dom/client";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import App from "./App.tsx";
import "./index.css";
import "./mobile-safety.css";

assertProductionEnv();
// Before any paint: the public website is light always; only web-app routes
// (/app, /xooter, /admin) may honour a stored dark preference. See
// src/lib/theme-scope.ts for why this lives here and not an inline <script>.
applyPrePaintThemeClass();
initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      const activateWaitingWorker = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });

      registration.update().catch(() => {
        // Service worker updates are progressive; the app remains usable without them.
      });
      activateWaitingWorker();

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) worker.postMessage({ type: "SKIP_WAITING" });
        });
      });
    }).catch(() => {
      // Service worker support is progressive; the app remains fully usable without it.
    });
  });
}
