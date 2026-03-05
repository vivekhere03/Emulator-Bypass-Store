import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Navbar from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingCart, CreditCard, Key, Users,
  Package, Settings, BarChart3, FileText, History, Shield, Coins
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  // User items (visible to all logged-in users)
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Buy Credits", href: "/buy-credits", icon: Coins },
  // Seller items
  { label: "Seller Overview", href: "/seller", icon: BarChart3, roles: ["seller"] },
  { label: "API Key", href: "/seller/api-key", icon: Key, roles: ["seller"] },
  { label: "Manage Users", href: "/seller/users", icon: Users, roles: ["seller"] },
  { label: "Credit History", href: "/seller/history", icon: History, roles: ["seller"] },
  { label: "API Logs", href: "/seller/logs", icon: FileText, roles: ["seller"] },
  // Admin items
  { label: "Dashboard", href: "/admin", icon: Shield, roles: ["admin"] },
  { label: "Products", href: "/admin/products", icon: Package, roles: ["admin"] },
  { label: "Sellers", href: "/admin/sellers", icon: Users, roles: ["admin"] },
  { label: "All Orders", href: "/admin/orders", icon: ShoppingCart, roles: ["admin"] },
  { label: "Credit Packages", href: "/admin/packages", icon: CreditCard, roles: ["admin"] },
  { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["admin"] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  section: "user" | "seller" | "admin";
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, section }) => {
  const location = useLocation();
  const { isAdmin, isSeller } = useAuth();

  const filteredItems = navItems.filter((item) => {
    if (section === "user" && !item.roles) return true;
    if (section === "seller" && item.roles?.includes("seller")) return isSeller;
    if (section === "admin" && item.roles?.includes("admin")) return isAdmin;
    // Show seller items in user section too if user is seller
    if (section === "user" && item.roles?.includes("seller")) return isSeller;
    return false;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Mobile/tablet horizontal nav */}
      <div className="border-b border-border/50 bg-card/30 lg:hidden">
        <div className="flex gap-1 overflow-x-auto p-2 scrollbar-hide">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1">
        <aside className="hidden w-64 flex-shrink-0 border-r border-border/50 bg-card/30 lg:block">
          <div className="sticky top-16 flex flex-col gap-1 p-4">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section === "admin" ? "Admin Panel" : section === "seller" ? "Seller Panel" : "My Account"}
            </p>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </aside>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
};

export default DashboardLayout;
