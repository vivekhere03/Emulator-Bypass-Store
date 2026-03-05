import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [transactionId, setTransactionId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name), product_durations(duration_label, duration_days)")
        .eq("id", orderId!)
        .single();
      setOrder(data);
      setLoading(false);
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  const handleVerify = async () => {
    if (!transactionId.trim()) {
      toast.error("Enter your Binance Pay transaction ID");
      return;
    }
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: {
          order_id: orderId,
          transaction_id: transactionId.trim(),
          payment_type: "binance_pay",
          expected_amount: order.amount,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Payment verified! Account created.");
        navigate(`/order-success/${orderId}`);
      } else {
        toast.error(data?.error || "Payment verification failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }

    setVerifying(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p>Order not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg glass-card">
          <CardHeader className="text-center">
            <Shield className="mx-auto mb-2 h-10 w-10 text-primary" />
            <CardTitle className="text-2xl">Complete Payment</CardTitle>
            <CardDescription>Send the exact amount via Binance Pay and verify</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
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
                <span className="font-mono">{order.username_created}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2 text-lg font-bold">
                <span>Amount</span>
                <span className="text-primary">${Number(order.amount).toFixed(2)} USDT</span>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="mb-2 text-sm text-muted-foreground">
                Send exactly <strong className="text-foreground">${Number(order.amount).toFixed(2)} USDT</strong> via Binance Pay
              </p>
              <p className="text-xs text-muted-foreground">
                After payment, paste your transaction ID below
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txId">Binance Pay Transaction ID</Label>
              <Input
                id="txId"
                placeholder="e.g., prepay_id_xxxxx"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="font-mono"
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleVerify}
              disabled={verifying || !transactionId.trim()}
            >
              {verifying ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Verify Payment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Payment;
