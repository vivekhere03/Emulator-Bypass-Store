import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

const SellerCredits = () => {
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setPackages(data ?? []);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Buy Credits</h1>
          <p className="text-muted-foreground">Purchase credits to manage users via API</p>
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
                  <Button className="w-full" onClick={() => toast.info("Payment flow coming soon")}>
                    Purchase
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
