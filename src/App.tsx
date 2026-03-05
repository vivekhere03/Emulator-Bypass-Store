import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProductDetail from "./pages/ProductDetail";
import BecomeSeller from "./pages/BecomeSeller";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import NotFound from "./pages/NotFound";

// User dashboard
import UserDashboard from "./pages/dashboard/UserDashboard";
import UserOrders from "./pages/dashboard/UserOrders";
import UserInvoices from "./pages/dashboard/UserInvoices";

// Seller dashboard
import SellerOverview from "./pages/seller/SellerOverview";
import SellerCredits from "./pages/seller/SellerCredits";
import SellerApiKey from "./pages/seller/SellerApiKey";
import SellerUsers from "./pages/seller/SellerUsers";
import SellerHistory from "./pages/seller/SellerHistory";
import SellerLogs from "./pages/seller/SellerLogs";

// Admin dashboard
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/become-seller" element={<BecomeSeller />} />

            {/* Auth required */}
            <Route path="/payment/:orderId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/order-success/:orderId" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />

            {/* User dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/orders" element={<ProtectedRoute><UserOrders /></ProtectedRoute>} />
            <Route path="/dashboard/invoices" element={<ProtectedRoute><UserInvoices /></ProtectedRoute>} />

            {/* Seller dashboard */}
            <Route path="/seller" element={<ProtectedRoute requiredRole="seller"><SellerOverview /></ProtectedRoute>} />
            <Route path="/seller/credits" element={<ProtectedRoute requiredRole="seller"><SellerCredits /></ProtectedRoute>} />
            <Route path="/seller/api-key" element={<ProtectedRoute requiredRole="seller"><SellerApiKey /></ProtectedRoute>} />
            <Route path="/seller/users" element={<ProtectedRoute requiredRole="seller"><SellerUsers /></ProtectedRoute>} />
            <Route path="/seller/history" element={<ProtectedRoute requiredRole="seller"><SellerHistory /></ProtectedRoute>} />
            <Route path="/seller/logs" element={<ProtectedRoute requiredRole="seller"><SellerLogs /></ProtectedRoute>} />

            {/* Admin dashboard */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute requiredRole="admin"><AdminProducts /></ProtectedRoute>} />
            <Route path="/admin/sellers" element={<ProtectedRoute requiredRole="admin"><AdminSellers /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute requiredRole="admin"><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/packages" element={<ProtectedRoute requiredRole="admin"><AdminPackages /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
