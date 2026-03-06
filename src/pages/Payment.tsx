import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, Copy, Wallet, Clock, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import binancePayQr from "@/assets/binance-pay-qr.png";
import bep20Qr from "@/assets/bep20-qr.jpeg";

const BEP20_ADDRESS = "0xbbf4a99e4ccca52535c2a00e2066e63e6448b1d1";
const BINANCE_PAY_ID = "892343627";
const PAYMENT_TIMEOUT_MINUTES = 10;

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [transactionId, setTransactionId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"binance_pay" | "bep20">("binance_pay");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  const isCreditPurchase = order?.invoice_data?.type === "credit_purchase";

  const expireOrder = useCallback(async () => {
    if (!orderId) return;
    setExpired(true);
    await supabase
      .from("orders")
      .update({ status: "expired" })
      .eq("id", orderId)
      .eq("status", "pending");
  }, [orderId]);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name), product_durations(duration_label, duration_days)")
        .eq("id", orderId!)
        .single();
      setOrder(data);
      setLoading(false);

      // Check if order is already expired/failed/completed
      if (data) {
        if (data.status === "expired" || data.status === "failed") {
          setExpired(true);
        } else if (data.status === "completed") {
          navigate(`/order-success/${orderId}`);
          return;
        }

        // Calculate remaining time from order creation
        if (data.status === "pending") {
          const createdAt = new Date(data.created_at).getTime();
          const expiresAt = createdAt + PAYMENT_TIMEOUT_MINUTES * 60 * 1000;
          const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
          if (remaining <= 0) {
            // Already past deadline — expire it
            setExpired(true);
            await supabase
              .from("orders")
              .update({ status: "expired" })
              .eq("id", data.id)
              .eq("status", "pending");
          } else {
            setTimeLeft(remaining);
          }
        }
      }
    };
    if (orderId) fetchOrder();
  }, [orderId, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || expired) return;
    if (timeLeft <= 0) {
      expireOrder();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          expireOrder();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, expired, expireOrder]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const handleCancel = async () => {
    if (!orderId) return;
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("status", "pending");
    toast.info("Order cancelled");
    navigate("/dashboard/orders");
  };

  const handleVerify = async () => {
    if (expired) {
      toast.error("This order has expired. Please create a new order.");
      return;
    }
    if (!transactionId.trim()) {
      toast.error(
        paymentMethod === "binance_pay"
          ? "Enter your Binance Pay Order ID"
          : "Enter your BEP20 transaction hash"
      );
      return;
    }
    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: {
          order_id: orderId,
          transaction_id: transactionId.trim(),
          payment_type: paymentMethod,
        },
      });

      if (error) {
        let errorMsg = "Verification failed";
        try {
          if (error.context && typeof error.context === "object") {
            const body = await (error.context as Response).json();
            errorMsg = body?.error || errorMsg;
          } else if (error.message) {
            errorMsg = error.message;
          }
        } catch {
          errorMsg = error.message || errorMsg;
        }
        toast.error(errorMsg);
        return;
      }

      if (data?.success) {
        toast.success(
          isCreditPurchase
            ? "Payment verified! Credits added."
            : "Payment verified! Account created."
        );
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

  // Show expired/failed/cancelled state
  if (expired || order.status === "expired" || order.status === "failed" || order.status === "cancelled") {
    const statusText = order.status === "cancelled" ? "Cancelled" : order.status === "failed" ? "Failed" : "Expired";
    return (
      <MainLayout>
        <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md glass-card">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <XCircle className="h-16 w-16 text-destructive" />
              <h2 className="text-2xl font-bold">Order {statusText}</h2>
              <p className="text-muted-foreground">
                {order.status === "failed"
                  ? "Payment verification failed. Please create a new order and try again."
                  : order.status === "cancelled"
                    ? "This order was cancelled. You can create a new order."
                    : "This payment session has expired. Please create a new order and complete payment within 10 minutes."}
              </p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => navigate("/dashboard/orders")}>
                  View Orders
                </Button>
                <Button onClick={() => navigate("/")}>
                  New Order
                </Button>
              </div>
            </CardContent>
          </Card>
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
            <CardDescription>
              Send the exact amount and verify your payment
            </CardDescription>
            {/* Countdown Timer */}
            {timeLeft !== null && (
              <div className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${timeLeft <= 300
                ? "bg-destructive/10 text-destructive"
                : "bg-yellow-500/10 text-yellow-500"
                }`}>
                {timeLeft <= 300 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                <span>
                  {timeLeft <= 300 ? "Hurry! " : ""}Time remaining: {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
              {isCreditPurchase ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Package</span>
                    <span>{order.invoice_data.package_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Credits</span>
                    <span>{order.invoice_data.credits} credits</span>
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
                    <span className="font-mono">{order.username_created}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-border/50 pt-2 text-lg font-bold">
                <span>Amount</span>
                <span className="text-primary">
                  ${Number(order.amount).toFixed(2)} USDT
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <Tabs
              value={paymentMethod}
              onValueChange={(v) => {
                setPaymentMethod(v as "binance_pay" | "bep20");
                setTransactionId("");
              }}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="binance_pay">
                  <Wallet className="mr-1.5 h-4 w-4" /> Binance Pay
                </TabsTrigger>
                <TabsTrigger value="bep20">
                  <Shield className="mr-1.5 h-4 w-4" /> BEP20 (USDT)
                </TabsTrigger>
              </TabsList>

              {/* Binance Pay Tab */}
              <TabsContent value="binance_pay" className="space-y-4 mt-4">
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={binancePayQr}
                    alt="Binance Pay QR"
                    className="w-48 h-48 rounded-xl border border-border"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Scan with Binance App → Pay
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Binance Pay ID</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-foreground">
                      {BINANCE_PAY_ID}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(BINANCE_PAY_ID, "Pay ID")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Name: Vivek Chauhan</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Send exactly{" "}
                    <strong className="text-foreground">
                      ${Number(order.amount).toFixed(2)} USDT
                    </strong>{" "}
                    via Binance Pay
                  </p>
                </div>
              </TabsContent>

              {/* BEP20 Tab */}
              <TabsContent value="bep20" className="space-y-4 mt-4">
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={bep20Qr}
                    alt="BEP20 QR"
                    className="w-48 h-48 rounded-xl border border-border"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Scan to send USDT (BEP20 / BSC network)
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    USDT Address (BEP20 - BSC)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-foreground break-all">
                      {BEP20_ADDRESS}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(BEP20_ADDRESS, "Address")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    Send exactly{" "}
                    <strong className="text-foreground">
                      ${Number(order.amount).toFixed(2)} USDT
                    </strong>{" "}
                    on <strong className="text-foreground">BSC (BEP20)</strong> network
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Transaction ID Input */}
            <div className="space-y-2">
              <Label htmlFor="txId">
                {paymentMethod === "binance_pay"
                  ? "Binance Pay Order ID"
                  : "BEP20 Transaction Hash"}
              </Label>
              <Input
                id="txId"
                placeholder={
                  paymentMethod === "binance_pay"
                    ? "e.g., 1234567890"
                    : "e.g., 0xabc123..."
                }
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {paymentMethod === "binance_pay"
                  ? "Find this in Binance App → Pay → Transaction History → Order ID"
                  : "Find this in your wallet's transaction history (the tx hash)"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancel}
                className="flex-shrink-0"
              >
                Cancel
              </Button>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Payment;
