import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value || ""; });
      setSettings(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveOneSetting = async (key: string, value: string) => {
    // Update all rows for this key (handles accidental duplicates cleanly).
    const { data: updatedRows, error: updateError } = await supabase
      .from("site_settings")
      .update({ value })
      .eq("key", key)
      .select("id");

    if (updateError) {
      throw updateError;
    }

    if ((updatedRows?.length ?? 0) > 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from("site_settings")
      .insert({ key, value });

    if (insertError) {
      throw insertError;
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await saveOneSetting(key, value);
      }
      toast.success("Settings saved");
      // Refresh from DB so UI confirms persisted values.
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value || ""; });
      setSettings(map);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Button onClick={saveSettings} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Approve Sellers</Label>
                <p className="text-sm text-muted-foreground">Automatically approve new seller registrations</p>
              </div>
              <Switch
                checked={settings.auto_approve_sellers === "true"}
                onCheckedChange={(checked) => updateSetting("auto_approve_sellers", String(checked))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Binance Pay</Label>
                <p className="text-sm text-muted-foreground">Enable Binance Pay payment method</p>
              </div>
              <Switch
                checked={settings.binance_pay_enabled === "true"}
                onCheckedChange={(checked) => updateSetting("binance_pay_enabled", String(checked))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-user-monthly-credits">Seller User Monthly Credits Required</Label>
              <Input
                id="seller-user-monthly-credits"
                type="number"
                min="1"
                value={settings.seller_user_monthly_credits ?? "15"}
                onChange={(e) => updateSetting("seller_user_monthly_credits", e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Credits deducted when a seller creates or extends a 1-month user.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
