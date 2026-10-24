// Only public, anonymous page modules. Private routes retain the existing startup path.
const loaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/articles": () => import("@/pages/Blog"),
  "/care-plus": () => import("@/pages/care/CarePlus"),
  "/trust-centre": () => import("@/pages/legal/TrustSafety"),
  "/legal/terms": () => import("@/pages/legal/Terms"),
  "/legal/privacy": () => import("@/pages/legal/Privacy"),
  "/legal/popia": () => import("@/pages/legal/Popia"),
  "/legal/refunds-cancellations": () => import("@/pages/legal/RefundsCancellations"),
  "/legal/account-deletion": () => import("@/pages/legal/AccountDeletion"),
  "/legal/cookies": () => import("@/pages/legal/Cookies"),
  "/legal/acceptable-use": () => import("@/pages/legal/AcceptableUse"),
  "/legal/ai-concierge": () => import("@/pages/legal/AiConciergeNotice"),
  "/legal/care-plus-terms": () => import("@/pages/legal/CarePlusTerms"),
  "/legal/xooter-terms": () => import("@/pages/legal/XooterTerms"),
};

export function publicPageLoaderFor(path: string) {
  const clean = path.replace(/\/+$/, "") || "/";
  return /^\/articles\/[a-z0-9-]+$/.test(clean) ? () => import("@/pages/BlogPost") : loaders[clean];
}

export function preloadPublicPage(path: string) {
  return publicPageLoaderFor(path)?.() ?? Promise.resolve();
}
