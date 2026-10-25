import { assertProductionEnv } from "@/lib/env-check";
import { initMonitoring } from "@/lib/monitoring";
import { preloadPublicPage } from "@/lib/public-page-loader";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./mobile-safety.css";

assertProductionEnv();
initMonitoring();

const root = document.getElementById("root")!;
const mount = () => {
  root.removeAttribute("data-xoot-public-page");
  createRoot(root).render(<App />);
};
const staticPage = root.getAttribute("data-xoot-public-page");
if (staticPage && staticPage === (window.location.pathname.replace(/\/+$/, "") || "/")) {
  // Keep the readable snapshot while its lazy page chunk downloads. If loading
  // fails, the existing app/error boundary remains responsible for recovery.
  void preloadPublicPage(staticPage).then(mount, mount);
} else {
  mount();
}

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
