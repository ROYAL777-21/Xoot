import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/zoot/AppShell";
import { NativeInteractionLayer } from "@/components/zoot/NativeInteractionLayer";
import { ZooterShell } from "@/components/zooter/ZooterShell";
import { RequireRole } from "@/components/RequireRole";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Auth = lazy(() => import("./pages/Auth"));
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
const ZooterApply = lazy(() => import("./pages/zooter/Apply"));
const ZooterDashboard = lazy(() => import("./pages/zooter/Dashboard"));
const ZooterJobs = lazy(() => import("./pages/zooter/Jobs"));
const ZooterTraining = lazy(() => import("./pages/zooter/Training"));
const ZooterEarnings = lazy(() => import("./pages/zooter/Earnings"));
const ZooterKyc = lazy(() => import("./pages/zooter/Kyc"));
const ZooterProfile = lazy(() => import("./pages/zooter/Profile"));
const AdminKyc = lazy(() => import("./pages/admin/Kyc"));
const AdminOps = lazy(() => import("./pages/admin/Ops"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen grid place-items-center bg-background">
    <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-sm text-muted-foreground shadow-card">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      Loading Zoot
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NativeInteractionLayer />
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/reset" element={<AuthReset />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/install" element={<PwaInstall />} />
                <Route path="/care-plus" element={<CarePlus />} />
                <Route path="/care-plus/apply" element={<RequireAuth><CarePlusApply /></RequireAuth>} />
                <Route path="/trust-centre" element={<TrustSafety />} />
                <Route path="/legal/terms" element={<Terms />} />
                <Route path="/legal/privacy" element={<Privacy />} />
                <Route path="/legal/trust-safety" element={<TrustSafety />} />
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

                {/* Zooter portal */}
                <Route path="/zooter/apply" element={<RequireAuth><ZooterApply /></RequireAuth>} />
                <Route path="/zooter" element={<RequireRole role="zooter"><ZooterShell><ZooterDashboard /></ZooterShell></RequireRole>} />
                <Route path="/zooter/jobs" element={<RequireRole role="zooter"><ZooterShell><ZooterJobs /></ZooterShell></RequireRole>} />
                <Route path="/zooter/training" element={<RequireAuth><ZooterShell><ZooterTraining /></ZooterShell></RequireAuth>} />
                <Route path="/zooter/earnings" element={<RequireRole role="zooter"><ZooterShell><ZooterEarnings /></ZooterShell></RequireRole>} />
                <Route path="/zooter/kyc" element={<RequireAuth><ZooterShell><ZooterKyc /></ZooterShell></RequireAuth>} />
                <Route path="/zooter/profile" element={<RequireRole role="zooter"><ZooterShell><ZooterProfile /></ZooterShell></RequireRole>} />

                {/* Admin */}
                <Route path="/admin/kyc" element={<RequireRole role="admin"><AdminKyc /></RequireRole>} />
                <Route path="/admin/ops" element={<RequireRole role="admin"><AdminOps /></RequireRole>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
