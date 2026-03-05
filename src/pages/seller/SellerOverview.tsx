import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, Users, Key, BarChart3, AlertTriangle } from "lucide-react";

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

  const creditBalance = seller?.credit_balance ?? 0;
  const isLowCredits = creditBalance > 0 && creditBalance <= 5;
  const isNoCredits = creditBalance === 0 && seller;

  const stats = [
    { label: "Credit Balance", value: creditBalance, icon: CreditCard },
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

        {/* Low credit warning */}
        {(isLowCredits || isNoCredits) && (
          <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="flex items-center justify-between text-yellow-500">
              <span>
                {isNoCredits
                  ? "You have no credits! Buy credits to start managing users."
                  : `Only ${creditBalance} credits remaining. Buy more soon!`}
              </span>
              <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" asChild>
                <Link to="/seller/credits">Buy Credits</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
