import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const UserOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("*, products(name), product_durations(duration_label)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "failed": return "bg-destructive/10 text-destructive";
      default: return "";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "pending": return "Pending";
      case "failed": return "Failed";
      default: return status;
    }
  };

  return (
    <DashboardLayout section="user">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet</TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.products?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{order.username_created || "—"}</TableCell>
                    <TableCell>{order.product_durations?.duration_label || "—"}</TableCell>
                    <TableCell>${Number(order.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {(order.status === "pending" || order.status === "failed") && (
                        <Button
                          size="sm"
                          variant={order.status === "failed" ? "destructive" : "default"}
                          onClick={() => navigate(`/payment/${order.id}`)}
                        >
                          {order.status === "failed" ? "Retry Payment" : "Pay Now"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserOrders;
