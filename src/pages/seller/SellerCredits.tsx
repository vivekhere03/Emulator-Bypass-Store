import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap, Coins } from "lucide-react";
import { toast } from "sonner";

const SellerCredits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: pkgs } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setPackages(pkgs ?? []);

      if (user) {
        const { data: s } = await supabase
          .from("sellers")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setSeller(s);
      }
    };
    fetchData();
  }, [user]);

  const handlePurchase = async (pkg: any) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!seller || seller.status !== "approved") {
      toast.error("Your seller account must be approved first");
      return;
    }

    setPurchasing(pkg.id);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          amount: pkg.price,
          status: "pending",
          invoice_data: {
            type: "credit_purchase",
            package_id: pkg.id,
            package_name: pkg.name,
            credits: pkg.credits,
            seller_id: seller.id,
          },
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/payment/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    }
    setPurchasing(null);
  };

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Buy Credits</h1>
            <p className="text-muted-foreground">Purchase credits to manage users via API</p>
          </div>
          {seller && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">{seller.credit_balance} credits</span>
            </div>
          )}
        </div>

        {packages.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center rounded-xl p-16">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No credit packages available</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="glass-card hover:glow-border transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground">{pkg.credits} credits</p>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary">${Number(pkg.price).toFixed(2)}</div>
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(pkg)}
                    disabled={purchasing === pkg.id}
                  >
                    {purchasing === pkg.id ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      "Purchase"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SellerCredits;
