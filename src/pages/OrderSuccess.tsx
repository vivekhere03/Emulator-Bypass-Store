import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Copy, Download, Home } from "lucide-react";
import { toast } from "sonner";

const OrderSuccess = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, download_url), product_durations(duration_label, duration_days)")
        .eq("id", orderId!)
        .single();
      setOrder(data);
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  const copyUsername = () => {
    if (order?.username_created) {
      navigator.clipboard.writeText(order.username_created);
      toast.success("Username copied!");
    }
  };

  if (!order) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  const isCreditPurchase = order?.invoice_data?.type === "credit_purchase";

  return (
    <MainLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg glass-card">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">Payment Successful!</h2>
              <p className="mt-1 text-muted-foreground">
                {isCreditPurchase ? "Credits have been added to your account" : "Your account has been created"}
              </p>
            </div>

            <div className="rounded-xl bg-secondary/50 p-4 space-y-3 text-left">
              {isCreditPurchase ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Package</span>
                    <span>{order.invoice_data?.package_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Credits</span>
                    <span>{order.invoice_data?.credits} credits</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product</span>
                    <span>{order.products?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{order.product_durations?.duration_label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Username</span>
                    <button onClick={copyUsername} className="flex items-center gap-1 font-mono text-primary hover:underline">
                      {order.username_created} <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span>${Number(order.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Download link if product has one */}
            {!isCreditPurchase && order.products?.download_url && (
              <a
                href={order.products.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-primary font-semibold hover:bg-primary/10 transition-colors"
              >
                <Download className="h-5 w-5" /> Download Product
              </a>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/dashboard/orders">
                  <Download className="mr-2 h-4 w-4" /> View Orders
                </Link>
              </Button>
              <Button className="flex-1" asChild>
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" /> Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default OrderSuccess;
