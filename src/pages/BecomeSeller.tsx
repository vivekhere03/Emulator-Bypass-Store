import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Users, Key, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const BecomeSeller = () => {
  const { user, isSeller } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleApply = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/login");
      return;
    }

    setSubmitting(true);

    // Check if already has a seller record
    const { data: existing } = await supabase
      .from("sellers")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending") {
        toast.info("Your seller application is already pending approval");
      } else if (existing.status === "active") {
        toast.info("You're already an active seller!");
        navigate("/seller");
      } else {
        toast.info("Your seller account is currently suspended. Contact admin.");
      }
      setSubmitting(false);
      return;
    }

    // Create seller record with pending status
    const { error } = await supabase.from("sellers").insert({
      user_id: user.id,
      status: "pending",
      credit_balance: 0,
    });

    if (error) {
      toast.error("Failed to submit application");
      setSubmitting(false);
      return;
    }

    // Also add seller role
    await supabase.from("user_roles").insert({
      user_id: user.id,
      role: "seller" as any,
    });

    setSubmitted(true);
    setSubmitting(false);
    toast.success("Seller application submitted!");
  };

  if (isSeller) {
    return (
      <MainLayout>
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-3xl font-bold">You're Already a Seller!</h1>
          <p className="mb-6 text-muted-foreground">Access your seller dashboard to manage users and credits.</p>
          <Button size="lg" onClick={() => navigate("/seller")}>
            Go to Seller Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (submitted) {
    return (
      <MainLayout>
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4">
          <CheckCircle className="mb-4 h-16 w-16 text-primary" />
          <h1 className="mb-2 text-3xl font-bold">Application Submitted!</h1>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            Your seller application is under review. Once approved by an admin, you'll get access to the seller dashboard where you can buy credits and manage users.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 border-primary/30 bg-primary/10 text-primary">
            <Users className="mr-1 h-3 w-3" /> Seller Program
          </Badge>
          <h1 className="mb-4 text-4xl font-black">Become a Seller</h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Join our reseller program. Buy credits, manage users, and grow your business with our powerful API.
          </p>
        </div>

        {/* How it works */}
        <div className="mx-auto mb-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "1. Apply & Get Approved",
              desc: "Submit your seller application. Admin reviews and approves your account.",
            },
            {
              icon: Zap,
              title: "2. Buy Credits",
              desc: "Purchase credit packages. Each credit lets you add or extend one user license.",
            },
            {
              icon: Key,
              title: "3. Manage & Resell",
              desc: "Use the seller dashboard or API to add users, extend licenses, reset HWIDs, and more.",
            },
          ].map((step) => (
            <Card key={step.title} className="glass-card">
              <CardContent className="p-6 text-center">
                <step.icon className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What sellers get */}
        <div className="mx-auto mb-12 max-w-2xl">
          <Card className="glass-card glow-border">
            <CardContent className="p-8">
              <h3 className="mb-6 text-center text-xl font-bold">What You Get</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Credit-based user management",
                  "Add / Extend / Remove users",
                  "Reset HWID for users",
                  "API key for automation",
                  "View your user list",
                  "Transaction history",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          {!user ? (
            <div className="space-y-3">
              <Button size="lg" onClick={() => navigate("/register")}>
                Sign Up to Apply <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <Button size="lg" onClick={handleApply} disabled={submitting}>
              {submitting ? "Submitting..." : "Apply to Become a Seller"} 
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default BecomeSeller;
