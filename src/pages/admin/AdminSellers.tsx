import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { toast } from "sonner";

const AdminSellers = () => {
  const [sellers, setSellers] = useState<any[]>([]);

  const fetchSellers = async () => {
    const { data } = await supabase
      .from("sellers")
      .select("*, profiles(email, display_name)")
      .order("created_at", { ascending: false });
    setSellers(data ?? []);
  };

  useEffect(() => { fetchSellers(); }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await supabase.from("sellers").update({ status: newStatus }).eq("id", id);
    toast.success(`Seller ${newStatus}`);
    fetchSellers();
  };

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Sellers</h1>
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sellers yet</TableCell>
                </TableRow>
              ) : sellers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{(s.profiles as any)?.display_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{(s.profiles as any)?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{s.credit_balance}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={s.status === "active" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(s.id, s.status)}
                    >
                      {s.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSellers;
