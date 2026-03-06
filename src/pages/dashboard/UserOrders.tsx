import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const PAYMENT_TIMEOUT_MINUTES = 10;

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

      let orderList = data ?? [];

      // Auto-expire old pending orders
      const now = Date.now();
      const expiredIds: string[] = [];
      orderList = orderList.map((o) => {
        if (o.status === "pending") {
          const createdAt = new Date(o.created_at).getTime();
          if (now - createdAt > PAYMENT_TIMEOUT_MINUTES * 60 * 1000) {
            expiredIds.push(o.id);
            return { ...o, status: "expired" };
          }
        }
        return o;
      });

      if (expiredIds.length > 0) {
        await supabase
          .from("orders")
          .update({ status: "expired" })
          .in("id", expiredIds)
          .eq("status", "pending");
      }

      setOrders(orderList);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500";
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "failed": return "bg-destructive/10 text-destructive";
      case "expired": return "bg-orange-500/10 text-orange-500";
      case "cancelled": return "bg-gray-500/10 text-gray-400";
      default: return "";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "pending": return "Pending";
      case "failed": return "Failed";
      case "expired": return "Expired";
      case "cancelled": return "Cancelled";
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
                orders.map((order) => {
                  const isCreditPurchase = order.invoice_data?.type === "credit_purchase";
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {isCreditPurchase
                          ? `${order.invoice_data.package_name} (${order.invoice_data.credits} cr)`
                          : order.products?.name || "—"}
                      </TableCell>
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
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/payment/${order.id}`)}
                          >
                            Pay Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserOrders;
