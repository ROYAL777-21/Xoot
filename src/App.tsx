import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/zoot/AppShell";
import { NativeInteractionLayer } from "@/components/zoot/NativeInteractionLayer";
import { XootSupportBot } from "@/components/zoot/XootSupportBot";
import { XooterShell } from "@/components/zooter/XooterShell";
import { RequireRole } from "@/components/RequireRole";
import { XootAnalyticsProvider } from "@/lib/analytics";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Auth = lazy(() => import("./pages/Auth"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AuthReset = lazy(() => import("./pages/AuthReset"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const PwaInstall = lazy(() => import("./pages/PwaInstall"));
const Book = lazy(() => import("./pages/app/Book"));
const Favorites = lazy(() => import("./pages/app/Favorites"));
const Loyalty = lazy(() => import("./pages/app/Loyalty"));
const GiftClean = lazy(() => import("./pages/app/GiftClean"));
const Properties = lazy(() => import("./pages/app/Properties"));
const AirbnbHostDashboard = lazy(() => import("./pages/app/AirbnbHostDashboard"));
const OfficeDashboard = lazy(() => import("./pages/app/OfficeDashboard"));
const Plans = lazy(() => import("./pages/app/Plans"));
const Bookings = lazy(() => import("./pages/app/Bookings"));
const BookingDetail = lazy(() => import("./pages/app/BookingDetail"));
const Training = lazy(() => import("./pages/app/Training"));
const Support = lazy(() => import("./pages/app/Support"));
const Insurance = lazy(() => import("./pages/app/Insurance"));
const CustomerProfile = lazy(() => import("./pages/app/Profile"));
const CarePlus = lazy(() => import("./pages/care/CarePlus"));
const CarePlusApply = lazy(() => import("./pages/care/CarePlusApply"));
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
const XooterApply = lazy(() => import("./pages/zooter/Apply"));
const XooterDashboard = lazy(() => import("./pages/zooter/Dashboard"));
const XooterJobs = lazy(() => import("./pages/zooter/Jobs"));
const XooterTraining = lazy(() => import("./pages/zooter/Training"));
const XooterEarnings = lazy(() => import("./pages/zooter/Earnings"));
const XooterKyc = lazy(() => import("./pages/zooter/Kyc"));
const XooterProfile = lazy(() => import("./pages/zooter/Profile"));
const AdminKyc = lazy(() => import("./pages/admin/Kyc"));
const AdminOps = lazy(() => import("./pages/admin/Ops"));

const coreRoutePreloaders = [
  () => import("./pages/Index.tsx"),
  () => import("./pages/care/CarePlus"),
  () => import("./pages/app/Book"),
  () => import("./pages/app/Bookings"),
  () => import("./pages/app/Support"),
  () => import("./pages/Blog"),
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
    const preload = () => coreRoutePreloaders.forEach((load) => void load());
    const requestIdle = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 650));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = requestIdle(preload, { timeout: 1600 });
    return () => cancelIdle(idleId);
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
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="zoot-theme">
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
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/auth/reset" element={<AuthReset />} />
                  <Route path="/articles" element={<Blog />} />
                  <Route path="/articles/:slug" element={<BlogPost />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/install" element={<PwaInstall />} />
                  <Route path="/care-plus" element={<CarePlus />} />
                  <Route path="/care-plus/apply" element={<RequireAuth><CarePlusApply /></RequireAuth>} />
                  <Route path="/trust-centre" element={<TrustSafety />} />
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
                  <Route path="/legal/zooter-terms" element={<XooterTerms />} />
                  <Route path="/app" element={<RequireAuth><AppShell><Book /></AppShell></RequireAuth>} />
                  <Route path="/app/bookings" element={<RequireAuth><AppShell><Bookings /></AppShell></RequireAuth>} />
                  <Route path="/app/bookings/:id" element={<RequireAuth><AppShell><BookingDetail /></AppShell></RequireAuth>} />
                  <Route path="/app/favorites" element={<RequireAuth><AppShell><Favorites /></AppShell></RequireAuth>} />
                  <Route path="/app/loyalty" element={<RequireAuth><AppShell><Loyalty /></AppShell></RequireAuth>} />
                  <Route path="/app/gifts" element={<RequireAuth><AppShell><GiftClean /></AppShell></RequireAuth>} />
                  <Route path="/app/properties" element={<RequireAuth><AppShell><Properties /></AppShell></RequireAuth>} />
                  <Route path="/app/properties/airbnb" element={<RequireAuth><AppShell><AirbnbHostDashboard /></AppShell></RequireAuth>} />
                  <Route path="/app/properties/office" element={<RequireAuth><AppShell><OfficeDashboard /></AppShell></RequireAuth>} />
                  <Route path="/app/plans" element={<RequireAuth><AppShell><Plans /></AppShell></RequireAuth>} />
                  <Route path="/app/training" element={<RequireAuth><AppShell><Training /></AppShell></RequireAuth>} />
                  <Route path="/app/support" element={<RequireAuth><AppShell><Support /></AppShell></RequireAuth>} />
                  <Route path="/app/insurance" element={<RequireAuth><AppShell><Insurance /></AppShell></RequireAuth>} />
                  <Route path="/app/profile" element={<RequireAuth><AppShell><CustomerProfile /></AppShell></RequireAuth>} />

                  {/* Xooter portal */}
                  <Route path="/zooter/apply" element={<RequireAuth><XooterApply /></RequireAuth>} />
                  <Route path="/zooter" element={<RequireRole role="zooter"><XooterShell><XooterDashboard /></XooterShell></RequireRole>} />
                  <Route path="/zooter/jobs" element={<RequireRole role="zooter"><XooterShell><XooterJobs /></XooterShell></RequireRole>} />
                  <Route path="/zooter/training" element={<RequireAuth><XooterShell><XooterTraining /></XooterShell></RequireAuth>} />
                  <Route path="/zooter/earnings" element={<RequireRole role="zooter"><XooterShell><XooterEarnings /></XooterShell></RequireRole>} />
                  <Route path="/zooter/kyc" element={<RequireAuth><XooterShell><XooterKyc /></XooterShell></RequireAuth>} />
                  <Route path="/zooter/profile" element={<RequireRole role="zooter"><XooterShell><XooterProfile /></XooterShell></RequireRole>} />

                  {/* Admin */}
                  <Route path="/admin/kyc" element={<RequireRole role="admin"><AdminKyc /></RequireRole>} />
                  <Route path="/admin/ops" element={<RequireRole role="admin"><AdminOps /></RequireRole>} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
                <XootSupportBot />
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </XootAnalyticsProvider>
  </QueryClientProvider>
);

export default App;
