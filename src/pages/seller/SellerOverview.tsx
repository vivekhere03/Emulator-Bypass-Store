import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Users, Key, BarChart3 } from "lucide-react";

const SellerOverview = () => {
  const { user } = useAuth();
  const [seller, setSeller] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from("sellers").select("*").eq("user_id", user.id).single();
      setSeller(data);
    };
    fetch();
  }, [user]);

  const stats = [
    { label: "Credit Balance", value: seller?.credit_balance ?? 0, icon: CreditCard },
    { label: "API Key", value: seller?.api_key_prefix ? `${seller.api_key_prefix}...` : "Not set", icon: Key },
    { label: "Status", value: seller?.status ?? "—", icon: BarChart3 },
    { label: "Users Added", value: "—", icon: Users },
  ];

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your reseller business</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerOverview;
