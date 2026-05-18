import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/zoot/AppShell";
import { ZooterShell } from "@/components/zooter/ZooterShell";
import { RequireRole } from "@/components/RequireRole";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth";
import Book from "./pages/app/Book";
import Favorites from "./pages/app/Favorites";
import Loyalty from "./pages/app/Loyalty";
import Plans from "./pages/app/Plans";
import Bookings from "./pages/app/Bookings";
import BookingDetail from "./pages/app/BookingDetail";
import Training from "./pages/app/Training";
import Support from "./pages/app/Support";
import Insurance from "./pages/app/Insurance";
import CustomerProfile from "./pages/app/Profile";
import CarePlus from "./pages/care/CarePlus";
import CarePlusApply from "./pages/care/CarePlusApply";
import Terms from "./pages/legal/Terms";
import Privacy from "./pages/legal/Privacy";
import TrustSafety from "./pages/legal/TrustSafety";
import ZooterApply from "./pages/zooter/Apply";
import ZooterDashboard from "./pages/zooter/Dashboard";
import ZooterJobs from "./pages/zooter/Jobs";
import ZooterTraining from "./pages/zooter/Training";
import ZooterEarnings from "./pages/zooter/Earnings";
import ZooterKyc from "./pages/zooter/Kyc";
import ZooterProfile from "./pages/zooter/Profile";
import AdminKyc from "./pages/admin/Kyc";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/care-plus" element={<CarePlus />} />
            <Route path="/care-plus/apply" element={<RequireAuth><CarePlusApply /></RequireAuth>} />
            <Route path="/legal/terms" element={<Terms />} />
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/trust-safety" element={<TrustSafety />} />
            <Route path="/app" element={<RequireAuth><AppShell><Book /></AppShell></RequireAuth>} />
            <Route path="/app/bookings" element={<RequireAuth><AppShell><Bookings /></AppShell></RequireAuth>} />
            <Route path="/app/bookings/:id" element={<RequireAuth><AppShell><BookingDetail /></AppShell></RequireAuth>} />
            <Route path="/app/favorites" element={<RequireAuth><AppShell><Favorites /></AppShell></RequireAuth>} />
            <Route path="/app/loyalty" element={<RequireAuth><AppShell><Loyalty /></AppShell></RequireAuth>} />
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

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
