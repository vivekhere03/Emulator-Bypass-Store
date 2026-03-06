import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Package, CreditCard, User, Clock, Hash, FileText, DollarSign, AlertTriangle } from "lucide-react";

const PAYMENT_TIMEOUT_MINUTES = 10;

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name), product_durations(duration_label, duration_days)")
        .order("created_at", { ascending: false });

      let orderList = data ?? [];

      // Fetch profiles for all unique user IDs
      const userIds = [...new Set(orderList.map((o) => o.user_id).filter(Boolean))];
      let profilesByUserId: Record<string, { email: string; display_name: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, display_name")
          .in("user_id", userIds);
        if (profiles) {
          profilesByUserId = Object.fromEntries(
            profiles.map((p) => [p.user_id, { email: p.email || "", display_name: p.display_name || "" }])
          );
        }
      }

      // Merge profiles into orders
      orderList = orderList.map((o) => ({
        ...o,
        profiles: profilesByUserId[o.user_id] || null,
      }));

      // Auto-expire old pending orders (older than 10 minutes)
      const now = Date.now();
      const expiredIds: string[] = [];
      orderList = orderList.map((o) => {
        if (o.status === "pending") {
          const createdAt = new Date(o.created_at).getTime();
          const elapsed = now - createdAt;
          if (elapsed > PAYMENT_TIMEOUT_MINUTES * 60 * 1000) {
            expiredIds.push(o.id);
            return { ...o, status: "expired" };
          }
        }
        return o;
      });

      // Batch update expired orders in DB
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
  }, []);

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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Stats
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const failedOrders = orders.filter((o) => o.status === "failed" || o.status === "expired" || o.status === "cancelled").length;
  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.amount), 0);

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">All Orders</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 p-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{totalOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{completedOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{pendingOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Failed/Expired</p>
                <p className="text-xl font-bold">{failedOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Product / Package</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet</TableCell>
                  </TableRow>
                ) : orders.map((o) => {
                  const isCreditPurchase = o.invoice_data?.type === "credit_purchase";
                  const isExpanded = expandedId === o.id;
                  const userEmail = o.profiles?.email || "—";
                  const userName = o.profiles?.display_name || o.username_created || "—";

                  return (
                    <>
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-secondary/30 transition-colors"
                        onClick={() => toggleExpand(o.id)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {isCreditPurchase ? (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-primary" />
                              <span>{o.invoice_data.package_name}</span>
                              <span className="text-xs text-muted-foreground">({o.invoice_data.credits} credits)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span>{o.products?.name || "—"}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{userName}</span>
                            <span className="text-xs text-muted-foreground">{userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">${Number(o.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColor(o.status)}>{statusLabel(o.status)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[160px] truncate">
                          {o.transaction_id || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(o.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <TableRow key={`${o.id}-detail`}>
                          <TableCell colSpan={7} className="bg-secondary/20 p-0">
                            <div className="px-6 py-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Order Info */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Order Details
                                  </h4>
                                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Order ID</span>
                                      <span className="font-mono text-xs">{o.id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Type</span>
                                      <span>{isCreditPurchase ? "Credit Purchase" : "Product Purchase"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Amount</span>
                                      <span className="font-semibold text-primary">${Number(o.amount).toFixed(2)} USDT</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Status</span>
                                      <Badge variant="secondary" className={`${statusColor(o.status)} text-xs`}>{statusLabel(o.status)}</Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Invoice / Item Details */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-primary" /> Invoice Details
                                  </h4>
                                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1.5 text-sm">
                                    {isCreditPurchase ? (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Package</span>
                                          <span>{o.invoice_data.package_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Credits</span>
                                          <span>{o.invoice_data.credits} credits</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Seller ID</span>
                                          <span className="font-mono text-xs">{(o.invoice_data.seller_id || "—").toString().slice(0, 8)}...</span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Product</span>
                                          <span>{o.products?.name || "—"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Duration</span>
                                          <span>{o.product_durations?.duration_label || "—"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Username</span>
                                          <span className="font-mono">{o.username_created || "—"}</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Invoice #</span>
                                      <span className="font-mono text-xs">INV-{o.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment & User Info */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" /> Payment & User
                                  </h4>
                                  <div className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">User Email</span>
                                      <span className="text-xs">{userEmail}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Display Name</span>
                                      <span>{o.profiles?.display_name || "—"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Transaction ID</span>
                                      <span className="font-mono text-xs break-all">{o.transaction_id || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Created</span>
                                      <span className="text-xs">{format(new Date(o.created_at), "MMM dd, yyyy HH:mm:ss")}</span>
                                    </div>
                                    {o.updated_at && o.updated_at !== o.created_at && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Updated</span>
                                        <span className="text-xs">{format(new Date(o.updated_at), "MMM dd, yyyy HH:mm:ss")}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Warning for expired/failed */}
                              {(o.status === "expired" || o.status === "failed" || o.status === "cancelled") && (
                                <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-2 text-sm text-destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  {o.status === "expired"
                                    ? "This order expired because payment was not completed within 10 minutes."
                                    : o.status === "cancelled"
                                      ? "This order was cancelled by the user."
                                      : "Payment verification failed for this order."}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;
