import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

const AdminSellers = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [creditDialog, setCreditDialog] = useState<{ open: boolean; seller: any | null; action: "add" | "deduct" }>({
    open: false,
    seller: null,
    action: "add",
  });
  const [creditAmount, setCreditAmount] = useState("");

  const fetchSellers = async () => {
    const { data: sellersData } = await supabase
      .from("sellers")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellersData) {
      const userIds = sellersData.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
      const merged = sellersData.map((s) => ({
        ...s,
        profile: profileMap.get(s.user_id) || null,
      }));
      setSellers(merged);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleApprove = async (seller: any) => {
    await supabase.from("sellers").update({ status: "active" }).eq("id", seller.id);
    toast.success(`Seller ${seller.profile?.display_name || ""} approved`);
    fetchSellers();
  };

  const handleSuspend = async (seller: any) => {
    const newStatus = seller.status === "active" ? "suspended" : "active";
    await supabase.from("sellers").update({ status: newStatus }).eq("id", seller.id);
    toast.success(`Seller ${newStatus}`);
    fetchSellers();
  };

  const handleCreditAction = async () => {
    const amount = parseInt(creditAmount);
    if (!amount || amount < 1) {
      toast.error("Enter a valid amount");
      return;
    }

    const seller = creditDialog.seller;
    if (!seller) return;

    const newBalance =
      creditDialog.action === "add"
        ? seller.credit_balance + amount
        : Math.max(0, seller.credit_balance - amount);

    const { error } = await supabase
      .from("sellers")
      .update({ credit_balance: newBalance })
      .eq("id", seller.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Log the transaction
    await supabase.from("credit_transactions").insert({
      seller_id: seller.id,
      amount: creditDialog.action === "add" ? amount : -amount,
      type: creditDialog.action === "add" ? "admin_credit" : "admin_debit",
      description: `Admin ${creditDialog.action === "add" ? "added" : "deducted"} ${amount} credits`,
    });

    toast.success(`${creditDialog.action === "add" ? "Added" : "Deducted"} ${amount} credits`);
    setCreditDialog({ open: false, seller: null, action: "add" });
    setCreditAmount("");
    fetchSellers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "suspended":
        return "bg-destructive/10 text-destructive";
      default:
        return "";
    }
  };

  const pendingSellers = sellers.filter((s) => s.status === "pending");
  const otherSellers = sellers.filter((s) => s.status !== "pending");

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Sellers</h1>

        {/* Pending Approvals */}
        {pendingSellers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-yellow-500">
              ⏳ Pending Approvals ({pendingSellers.length})
            </h2>
            <div className="glass-card rounded-xl overflow-hidden border border-yellow-500/20">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSellers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.profile?.display_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" onClick={() => handleApprove(s)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await supabase.from("sellers").delete().eq("id", s.id);
                            await supabase
                              .from("user_roles")
                              .delete()
                              .eq("user_id", s.user_id)
                              .eq("role", "seller");
                            toast.success("Application rejected");
                            fetchSellers();
                          }}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Active / Suspended Sellers */}
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
              {otherSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No active sellers yet
                  </TableCell>
                </TableRow>
              ) : (
                otherSellers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.profile?.display_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-lg font-bold">{s.credit_balance}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(s.status)}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCreditDialog({ open: true, seller: s, action: "add" })
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" /> Credits
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCreditDialog({ open: true, seller: s, action: "deduct" })
                          }
                        >
                          <Minus className="mr-1 h-3 w-3" /> Credits
                        </Button>
                        <Button
                          variant={s.status === "active" ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleSuspend(s)}
                        >
                          {s.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Credit Dialog */}
      <Dialog
        open={creditDialog.open}
        onOpenChange={(o) => {
          if (!o) {
            setCreditDialog({ open: false, seller: null, action: "add" });
            setCreditAmount("");
          }
        }}
      >
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>
              {creditDialog.action === "add" ? "Add" : "Deduct"} Credits —{" "}
              {creditDialog.seller?.profile?.display_name || "Seller"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current balance:{" "}
              <span className="font-mono font-bold text-foreground">
                {creditDialog.seller?.credit_balance ?? 0}
              </span>
            </p>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter credit amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleCreditAction}>
              {creditDialog.action === "add" ? "Add" : "Deduct"} Credits
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminSellers;
