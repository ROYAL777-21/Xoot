import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/zoot/AppShell";
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
            <Route path="/app" element={<RequireAuth><AppShell><Book /></AppShell></RequireAuth>} />
            <Route path="/app/bookings" element={<RequireAuth><AppShell><Bookings /></AppShell></RequireAuth>} />
            <Route path="/app/bookings/:id" element={<RequireAuth><AppShell><BookingDetail /></AppShell></RequireAuth>} />
            <Route path="/app/favorites" element={<RequireAuth><AppShell><Favorites /></AppShell></RequireAuth>} />
            <Route path="/app/loyalty" element={<RequireAuth><AppShell><Loyalty /></AppShell></RequireAuth>} />
            <Route path="/app/plans" element={<RequireAuth><AppShell><Plans /></AppShell></RequireAuth>} />
            <Route path="/app/training" element={<RequireAuth><AppShell><Training /></AppShell></RequireAuth>} />
            <Route path="/app/support" element={<RequireAuth><AppShell><Support /></AppShell></RequireAuth>} />
            <Route path="/app/insurance" element={<RequireAuth><AppShell><Insurance /></AppShell></RequireAuth>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
