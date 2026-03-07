import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";

const SellerLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!seller) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("api_usage_logs")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(200);

      setLogs(data ?? []);
      setLoading(false);
    };

    fetchLogs();
  }, [user]);

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">API Usage Logs</h1>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> API Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 opacity-30" />
                <p>No API logs yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Credits Used</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                      <TableCell className="font-semibold">{log.credits_used}</TableCell>
                      <TableCell>{log.response_status ?? 200}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SellerLogs;
