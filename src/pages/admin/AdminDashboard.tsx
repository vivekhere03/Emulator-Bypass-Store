import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, ShoppingCart, CreditCard, DollarSign, Shield } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ products: 0, sellers: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [{ count: products }, { count: sellers }, { data: orders }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("sellers").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("amount").eq("status", "completed"),
      ]);
      const revenue = orders?.reduce((sum, o) => sum + Number(o.amount), 0) ?? 0;
      setStats({
        products: products ?? 0,
        sellers: sellers ?? 0,
        orders: orders?.length ?? 0,
        revenue,
      });
    };
    fetch();
  }, []);

  const cards = [
    { label: "Products", value: stats.products, icon: Package },
    { label: "Sellers", value: stats.sellers, icon: Users },
    { label: "Completed Orders", value: stats.orders, icon: ShoppingCart },
    { label: "Total Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign },
  ];

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
