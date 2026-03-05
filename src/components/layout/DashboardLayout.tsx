import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Navbar from "./Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingCart, CreditCard, Key, Users,
  Package, Settings, BarChart3, FileText, History, Shield
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  // Seller items
  { label: "Overview", href: "/seller", icon: BarChart3, roles: ["seller"] },
  { label: "Buy Credits", href: "/seller/credits", icon: CreditCard, roles: ["seller"] },
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
    if (section === "user" && !item.roles) return item.href.startsWith("/dashboard");
    if (section === "seller" && item.roles?.includes("seller")) return isSeller;
    if (section === "admin" && item.roles?.includes("admin")) return isAdmin;
    return false;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
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
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
};

export default DashboardLayout;
