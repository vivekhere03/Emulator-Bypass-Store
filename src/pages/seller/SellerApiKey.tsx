import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Copy, RefreshCw, AlertTriangle, CheckCircle2, Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const SellerApiKey = () => {
  const { user } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showKey, setShowKey] = useState(true);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setSeller(data);
    };
    fetchSeller();
  }, [user]);

  const handleGenerate = async () => {
    if (seller?.api_key_hash) {
      const confirmed = window.confirm(
        "⚠️ This will REVOKE your current API key. Any scripts or bots using the old key will stop working.\n\nAre you sure?"
      );
      if (!confirmed) return;
    }

    setGenerating(true);
    setGeneratedKey(null);
    setKeyCopied(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key");

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.api_key) {
        setGeneratedKey(data.api_key);
        setSeller((prev: any) => ({
          ...prev,
          api_key_prefix: data.prefix,
          api_key_hash: "set",
        }));
        toast.success("API key generated! Copy it now — it won't be shown again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate key");
    }

    setGenerating(false);
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setKeyCopied(true);
    toast.success("API key copied to clipboard!");
  };

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">API Key Management</h1>

        {/* Generated Key Alert — Only shown after generation */}
        {generatedKey && (
          <Alert className="border-primary/30 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                🔑 Your new API key (save it NOW — it won't be shown again!)
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                <code className="flex-1 font-mono text-sm break-all text-foreground">
                  {showKey ? generatedKey : "•".repeat(generatedKey.length)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant={keyCopied ? "default" : "outline"}
                  size="sm"
                  onClick={() => copyKey(generatedKey)}
                >
                  {keyCopied ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" /> Copied</>
                  ) : (
                    <><Copy className="mr-1 h-3 w-3" /> Copy</>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Key Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Your API Key
            </CardTitle>
            <CardDescription>
              Use this key to manage users via the API from your scripts, bots, or custom tools.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-secondary p-4">
              <code className="flex-1 font-mono text-sm text-foreground">
                {seller?.api_key_prefix
                  ? `${seller.api_key_prefix}${"•".repeat(32)}`
                  : "No API key generated yet"}
              </code>
            </div>

            <Button
              variant={seller?.api_key_hash ? "outline" : "default"}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Generating...
                </>
              ) : seller?.api_key_hash ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Key
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" /> Generate API Key
                </>
              )}
            </Button>

            {seller?.api_key_hash && (
              <Alert variant="destructive" className="bg-destructive/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Regenerating will <strong>revoke</strong> your current key. All existing integrations will break.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>
              Base URL: <code className="text-primary">https://bypass.cgxhub.in</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Authentication */}
            <div>
              <h3 className="mb-2 font-semibold text-foreground">Authentication</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Every request must include 3 headers. Requests are HMAC-SHA256 signed with a 30-second replay window.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium text-muted-foreground">Header</th>
                      <th className="p-2 text-left font-medium text-muted-foreground">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border/30">
                      <td className="p-2 font-mono text-foreground">Authorization</td>
                      <td className="p-2 font-mono text-muted-foreground">Bearer &lt;your_api_key&gt;</td>
                    </tr>
                    <tr className="border-t border-border/30">
                      <td className="p-2 font-mono text-foreground">X-Api-Timestamp</td>
                      <td className="p-2 font-mono text-muted-foreground">UNIX timestamp (seconds)</td>
                    </tr>
                    <tr className="border-t border-border/30">
                      <td className="p-2 font-mono text-foreground">X-Api-Signature</td>
                      <td className="p-2 font-mono text-muted-foreground">HMAC-SHA256 hex</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 rounded-lg bg-muted/30 p-3">
                <p className="text-xs font-mono text-muted-foreground">
                  sign_payload = "&lt;timestamp&gt;:&lt;METHOD&gt;:&lt;path&gt;:&lt;body&gt;"
                  <br />
                  signature = HMAC-SHA256(api_key, sign_payload)
                </p>
              </div>
            </div>

            {/* Endpoints */}
            <div>
              <h3 className="mb-3 font-semibold text-foreground">Endpoints</h3>
              <div className="space-y-3">
                {[
                  {
                    method: "POST",
                    path: "/api/v2/users/add",
                    desc: "Add a user",
                    cost: "1 credit",
                    fields: "username (required), hwid, duration_days (1-365)",
                  },
                  {
                    method: "POST",
                    path: "/api/v2/users/bulk-add",
                    desc: "Bulk add users",
                    cost: "1 credit/user",
                    fields: "prefix (required), count (1-50), duration_days",
                  },
                  {
                    method: "POST",
                    path: "/api/v2/users/extend",
                    desc: "Extend a user",
                    cost: "1 credit",
                    fields: "username (required), duration_days",
                  },
                  {
                    method: "POST",
                    path: "/api/v2/users/reset-hwid",
                    desc: "Reset HWID",
                    cost: "Free",
                    fields: "username (required), new_hwid (required)",
                  },
                  {
                    method: "POST",
                    path: "/api/v2/users/remove",
                    desc: "Remove a user",
                    cost: "Free",
                    fields: "username (required)",
                  },
                  {
                    method: "GET",
                    path: "/api/v2/users/list",
                    desc: "List your users",
                    cost: "Free",
                    fields: "No body",
                  },
                  {
                    method: "GET",
                    path: "/api/v2/key/info",
                    desc: "Key info & credits",
                    cost: "Free",
                    fields: "No body",
                  },
                ].map((ep) => (
                  <div
                    key={ep.path}
                    className="flex flex-col gap-1 rounded-lg border border-border/30 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                          ep.method === "GET"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent-foreground"
                        }`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-sm font-mono text-foreground">{ep.path}</code>
                      <span className="ml-auto text-xs text-muted-foreground">{ep.cost}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ep.desc} — {ep.fields}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Notes */}
            <div>
              <h3 className="mb-2 font-semibold text-foreground">⚠️ Security</h3>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                <li>Never expose your API key in client-side/public code</li>
                <li>HMAC signature prevents replay attacks (30-second window)</li>
                <li>You can only manage users that YOUR key created</li>
                <li>Credits deduct from your portal balance when using the API</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SellerApiKey;
