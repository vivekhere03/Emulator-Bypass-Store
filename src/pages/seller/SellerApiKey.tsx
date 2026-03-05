import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SellerApiKey = () => {
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

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">API Key Management</h1>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-secondary p-4">
              <code className="flex-1 font-mono text-sm">
                {seller?.api_key_prefix ? `${seller.api_key_prefix}${"•".repeat(32)}` : "No API key generated yet"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  toast.info("Full API key is only shown once when generated");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => toast.info("API key regeneration coming soon")}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Key
            </Button>
            <div className="rounded-lg border border-border/50 p-4">
              <h4 className="mb-2 font-semibold">API Endpoints</h4>
              <div className="space-y-2 font-mono text-xs text-muted-foreground">
                <p>POST /api/v2/users/add — Add a user (1 credit)</p>
                <p>POST /api/v2/users/extend — Extend a user (1 credit)</p>
                <p>POST /api/v2/users/reset-hwid — Reset HWID (1 credit)</p>
                <p>POST /api/v2/users/remove — Remove a user (1 credit)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SellerApiKey;
