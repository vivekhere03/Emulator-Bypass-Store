import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Shield, Clock, DollarSign, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Duration {
  id: string;
  duration_label: string;
  duration_days: number;
  price: number;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: p } = await supabase.from("products").select("*").eq("id", id!).single();
      const { data: d } = await supabase
        .from("product_durations")
        .select("*")
        .eq("product_id", id!)
        .order("sort_order");
      setProduct(p);
      setDurations(d ?? []);
      if (d?.length) setSelectedDuration(d[0]);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      navigate("/login");
      return;
    }
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }
    if (!selectedDuration) {
      toast.error("Please select a duration");
      return;
    }

    setPurchasing(true);
    // Create a pending order
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_id: product.id,
      duration_id: selectedDuration.id,
      username_created: username.trim(),
      amount: selectedDuration.price,
      status: "pending",
    }).select().single();

    if (error) {
      toast.error("Failed to create order");
      setPurchasing(false);
      return;
    }

    // For now, navigate to a payment page with order details
    toast.info("Redirecting to payment...");
    navigate(`/payment/${order.id}`);
    setPurchasing(false);
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

  if (!product) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">Product Not Found</h2>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-10">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left - Product Info */}
          <div>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Shield className="h-24 w-24 text-muted-foreground/20" />
                </div>
              )}
            </div>
            <h1 className="mt-6 text-3xl font-bold">{product.name}</h1>
            <p className="mt-3 text-muted-foreground">{product.description || "Premium license product"}</p>
          </div>

          {/* Right - Purchase Form */}
          <Card className="glass-card self-start">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="mb-3 text-lg font-semibold">Select Duration</h3>
                <div className="grid grid-cols-2 gap-3">
                  {durations.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDuration(d)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        selectedDuration?.id === d.id
                          ? "border-primary bg-primary/10 glow-border"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {d.duration_label}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xl font-bold text-primary">
                        <DollarSign className="h-4 w-4" />
                        {d.price.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Desired Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Enter your desired username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {selectedDuration && (
                <div className="rounded-xl bg-secondary/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Product</span>
                    <span>{product.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{selectedDuration.duration_label}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${selectedDuration.price.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handlePurchase}
                disabled={purchasing || !selectedDuration || !username.trim()}
              >
                {purchasing ? "Processing..." : `Pay $${selectedDuration?.price.toFixed(2) || "0.00"} with Binance Pay`}
              </Button>

              {!user && (
                <p className="text-center text-sm text-muted-foreground">
                  You need to{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    sign in
                  </Link>{" "}
                  to purchase
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductDetail;
