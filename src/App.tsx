import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { XootThemeProvider } from "@/components/XootThemeProvider";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/xoot/AppShell";
import { NativeInteractionLayer } from "@/components/xoot/NativeInteractionLayer";
import { XooterShell } from "@/components/xooter/XooterShell";
import { RequireRole } from "@/components/RequireRole";
import { XootAnalyticsProvider } from "@/lib/analytics";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
/**
 * The kit gallery, dev-only.
 *
 * The guard is on the `lazy()` call, not just on the `<Route>`. Guarding only the route left the
 * `import()` reachable at module scope, and a production build still emitted
 * `dist/assets/KitGallery-*.js` — unreachable through the router but downloadable by anyone who
 * reads the assets directory. Measured, not assumed: the first version shipped that chunk.
 *
 * With the ternary here `import.meta.env.DEV` folds to `false`, the arrow becomes unreachable,
 * and Rollup drops the chunk entirely. A design workshop on a live marketplace is unfinished
 * work on display, not a feature.
 */
const KitGallery = import.meta.env.DEV ? lazy(() => import("./pages/dev/KitGallery")) : null;
const Auth = lazy(() => import("./pages/Auth"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const BookingConfirm = lazy(() => import("./pages/BookingConfirm"));
const CarePlusPaywall = lazy(() => import("./pages/CarePlusPaywall"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AuthReset = lazy(() => import("./pages/AuthReset"));
const Blog = lazy(() => import("./pages/Blog"));
const BugBounty = lazy(() => import("./pages/BugBounty"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const PwaInstall = lazy(() => import("./pages/PwaInstall"));
const SplitInvite = lazy(() => import("./pages/SplitInvite"));
const Book = lazy(() => import("./pages/app/Book"));
const Today = lazy(() => import("./pages/app/Today"));
const NotificationsFeed = lazy(() => import("./pages/app/NotificationsFeed"));
const WebsiteBooking = lazy(() => import("./pages/WebsiteBooking"));
const Favorites = lazy(() => import("./pages/app/Favorites"));
const Loyalty = lazy(() => import("./pages/app/Loyalty"));
const Widgets = lazy(() => import("./pages/app/Widgets"));
const GiftClean = lazy(() => import("./pages/app/GiftClean"));
const Properties = lazy(() => import("./pages/app/Properties"));
const ManageMore = lazy(() => import("./pages/app/ManageMore"));
const Calendars = lazy(() => import("./pages/app/Calendars"));
const AirbnbHostDashboard = lazy(() => import("./pages/app/AirbnbHostDashboard"));
const OfficeDashboard = lazy(() => import("./pages/app/OfficeDashboard"));
const Plans = lazy(() => import("./pages/app/Plans"));
const Bookings = lazy(() => import("./pages/app/Bookings"));
const BookingDetail = lazy(() => import("./pages/app/BookingDetail"));
const Training = lazy(() => import("./pages/app/Training"));
const Support = lazy(() => import("./pages/app/Support"));
const Insurance = lazy(() => import("./pages/app/Insurance"));
const CustomerProfile = lazy(() => import("./pages/app/Profile"));
const AccountEdit = lazy(() => import("./pages/app/AccountEdit"));
const HomeEdit = lazy(() => import("./pages/app/HomeEdit"));
const CarePlus = lazy(() => import("./pages/care/CarePlus"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const TrustSafety = lazy(() => import("./pages/legal/TrustSafety"));
const Popia = lazy(() => import("./pages/legal/Popia"));
const RefundsCancellations = lazy(() => import("./pages/legal/RefundsCancellations"));
const AccountDeletion = lazy(() => import("./pages/legal/AccountDeletion"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const AcceptableUse = lazy(() => import("./pages/legal/AcceptableUse"));
const AiConciergeNotice = lazy(() => import("./pages/legal/AiConciergeNotice"));
const CarePlusTerms = lazy(() => import("./pages/legal/CarePlusTerms"));
const XooterTerms = lazy(() => import("./pages/legal/XooterTerms"));
const XooterApply = lazy(() => import("./pages/xooter/Apply"));
const XooterDashboard = lazy(() => import("./pages/xooter/Dashboard"));
const XooterJobs = lazy(() => import("./pages/xooter/Jobs"));
const XooterTraining = lazy(() => import("./pages/xooter/Training"));
const XooterEarnings = lazy(() => import("./pages/xooter/Earnings"));
const XooterKyc = lazy(() => import("./pages/xooter/Kyc"));
const XooterProfile = lazy(() => import("./pages/xooter/Profile"));
const AdminKyc = lazy(() => import("./pages/admin/Kyc"));
const AdminOps = lazy(() => import("./pages/admin/Ops"));

const coreRoutePreloaders = [
  () => import("./pages/Auth"),
  () => import("./pages/WebsiteBooking"),
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

const PreloadCoreRoutes = () => {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    let cancelled = false;
    // Warm the next likely action one chunk at a time. Other destinations preload on intent.
    const preload = async () => { for (const load of coreRoutePreloaders) { if (cancelled) return; await load().catch(() => {}); } };
    const requestIdle = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 650));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = requestIdle(preload, { timeout: 1600 });
    return () => { cancelled = true; cancelIdle(idleId); };
  }, []);

  return null;
};

const RouteLoading = () => (
  <div className="fixed inset-x-0 top-0 z-70 h-1 overflow-hidden bg-primary/10" aria-label="Loading Xoot route">
    <div className="h-full w-1/3 animate-pulse rounded-r-full bg-primary/70" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <XootAnalyticsProvider>
      <HelmetProvider>
        <XootThemeProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <NativeInteractionLayer />
              <PreloadCoreRoutes />
              <ScrollToTop />
              <AuthProvider>
                <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/book" element={<WebsiteBooking />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/book/confirm" element={<BookingConfirm />} />
                  <Route path="/care-plus/join" element={<CarePlusPaywall />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
                  <Route path="/signin" element={<Navigate to="/auth?mode=signin" replace />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/auth/reset" element={<AuthReset />} />
                  <Route path="/articles" element={<Blog />} />
                  <Route path="/articles/:slug" element={<BlogPost />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/install" element={<PwaInstall />} />
                  {/* Public on purpose: the person opening this link has no Xoot account yet,
                      and asking them to make one before telling them what they are being asked
                      to pay for is how an invitation gets ignored. The 192-bit invite token is
                      the credential; accepting still requires signing in as the invited email. */}
                  <Route path="/split/:token" element={<SplitInvite />} />
                  <Route path="/care-plus" element={<CarePlus />} />
                  {/*
                    The Care+ placement application was retired on 2026-08-13 (ZD-031). The route
                    stays as a redirect rather than being deleted outright: bookmarks, already-sent
                    emails and delivered push notifications still point here, and a 404 tells those
                    people nothing. `replace` so it does not sit in the back-stack.
                  */}
                  <Route path="/care-plus/apply" element={<Navigate to="/care-plus" replace />} />
                  <Route path="/trust-centre" element={<TrustSafety />} />
                  <Route path="/bug-bounty" element={<BugBounty />} />
                  <Route path="/legal/terms" element={<Terms />} />
                  <Route path="/legal/privacy" element={<Privacy />} />
                  <Route path="/legal/trust-safety" element={<TrustSafety />} />
                  <Route path="/legal/popia" element={<Popia />} />
                  <Route path="/legal/refunds-cancellations" element={<RefundsCancellations />} />
                  <Route path="/legal/account-deletion" element={<AccountDeletion />} />
                  <Route path="/legal/cookies" element={<Cookies />} />
                  <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
                  <Route path="/legal/ai-concierge" element={<AiConciergeNotice />} />
                  <Route path="/legal/care-plus-terms" element={<CarePlusTerms />} />
                  <Route path="/legal/xooter-terms" element={<XooterTerms />} />
                  <Route path="/app" element={<RequireAuth><AppShell><Today /></AppShell></RequireAuth>} />
                  <Route path="/app/notifications" element={<RequireAuth><AppShell><NotificationsFeed /></AppShell></RequireAuth>} />
                  <Route path="/app/book" element={<RequireAuth><AppShell><Book /></AppShell></RequireAuth>} />
                  <Route path="/app/bookings" element={<RequireAuth><AppShell><Bookings /></AppShell></RequireAuth>} />
                  <Route path="/app/bookings/:id" element={<RequireAuth><AppShell><BookingDetail /></AppShell></RequireAuth>} />
                  <Route path="/app/favorites" element={<RequireAuth><AppShell><Favorites /></AppShell></RequireAuth>} />
                  <Route path="/app/loyalty" element={<RequireAuth><AppShell><Loyalty /></AppShell></RequireAuth>} />
                  <Route path="/app/widgets" element={<RequireAuth><AppShell><Widgets /></AppShell></RequireAuth>} />
                  <Route path="/gifts" element={<GiftClean />} />
                  <Route path="/app/gifts" element={<RequireAuth><GiftClean /></RequireAuth>} />
                  <Route path="/app/properties" element={<RequireAuth><AppShell><ManageMore /></AppShell></RequireAuth>} />
                  <Route path="/app/properties/accounts" element={<RequireAuth><AppShell><Properties /></AppShell></RequireAuth>} />
                  <Route path="/app/calendar" element={<RequireAuth><AppShell><Calendars /></AppShell></RequireAuth>} />
                  <Route path="/app/properties/airbnb" element={<RequireAuth><AppShell><AirbnbHostDashboard /></AppShell></RequireAuth>} />
                  <Route path="/app/properties/office" element={<RequireAuth><AppShell><OfficeDashboard /></AppShell></RequireAuth>} />
                  <Route path="/app/plans" element={<RequireAuth><AppShell><Plans /></AppShell></RequireAuth>} />
                  <Route path="/app/training" element={<RequireAuth><AppShell><Training /></AppShell></RequireAuth>} />
                  <Route path="/app/support" element={<RequireAuth><AppShell><Support /></AppShell></RequireAuth>} />
                  <Route path="/app/insurance" element={<RequireAuth><AppShell><Insurance /></AppShell></RequireAuth>} />
                  <Route path="/app/profile" element={<RequireAuth><AppShell><CustomerProfile /></AppShell></RequireAuth>} />
                  <Route path="/app/profile/account" element={<RequireAuth><AppShell><AccountEdit /></AppShell></RequireAuth>} />
                  <Route path="/app/profile/homes/:id" element={<RequireAuth><AppShell><HomeEdit /></AppShell></RequireAuth>} />

                  {/* Xooter portal */}
                  <Route path="/xooter/apply" element={<RequireAuth><XooterApply /></RequireAuth>} />
                  <Route path="/xooter" element={<RequireRole role="xooter"><XooterShell><XooterDashboard /></XooterShell></RequireRole>} />
                  <Route path="/xooter/jobs" element={<RequireRole role="xooter"><XooterShell><XooterJobs /></XooterShell></RequireRole>} />
                  <Route path="/xooter/training" element={<RequireAuth><XooterShell><XooterTraining /></XooterShell></RequireAuth>} />
                  <Route path="/xooter/earnings" element={<RequireRole role="xooter"><XooterShell><XooterEarnings /></XooterShell></RequireRole>} />
                  <Route path="/xooter/kyc" element={<RequireAuth><XooterShell><XooterKyc /></XooterShell></RequireAuth>} />
                  <Route path="/xooter/profile" element={<RequireRole role="xooter"><XooterShell><XooterProfile /></XooterShell></RequireRole>} />

                  {/* Admin */}
                  <Route path="/admin/kyc" element={<RequireRole role="admin"><AdminKyc /></RequireRole>} />
                  <Route path="/admin/ops" element={<RequireRole role="admin"><AdminOps /></RequireRole>} />

                  {/* Dev only — see the note beside the import. Falls through to NotFound in
                      production, which is what a stranger typing /dev/kit should get. */}
                  {KitGallery ? <Route path="/dev/kit" element={<KitGallery />} /> : null}

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
        </XootThemeProvider>
      </HelmetProvider>
    </XootAnalyticsProvider>
  </QueryClientProvider>
);

export default App;
