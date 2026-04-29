import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RestaurantDetail from "./pages/RestaurantDetail";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import RestaurantRegister from "./pages/RestaurantRegister";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import RestaurantAnalytics from "./pages/RestaurantAnalytics";
import { OAuthCallback } from "./pages/OAuthCallback";
import Install from "./pages/Install";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <div className="pb-16 md:pb-0">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/restaurant/register" element={<RestaurantRegister />} />
                <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
                 <Route path="/restaurant/analytics" element={<RestaurantAnalytics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/~oauth" element={<OAuthCallback />} />
                <Route path="/install" element={<Install />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <BottomNav />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
