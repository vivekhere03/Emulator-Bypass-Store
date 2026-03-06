import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UserInvoices = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("orders")
        .select("*, products(name), product_durations(duration_label, duration_days)")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    fetchInvoices();
  }, [user]);

  const downloadInvoice = (order: any) => {
    const isCreditPurchase = order.invoice_data?.type === "credit_purchase";

    const lines = [
      "═══════════════════════════════════════",
      "               INVOICE                 ",
      "═══════════════════════════════════════",
      "",
      `Invoice #: INV-${order.id.slice(0, 8).toUpperCase()}`,
      `Date: ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      "───────────────────────────────────────",
      "  Item Details",
      "───────────────────────────────────────",
    ];

    if (isCreditPurchase) {
      lines.push(
        `  Package: ${order.invoice_data.package_name}`,
        `  Credits: ${order.invoice_data.credits}`,
        `  Type: Credit Purchase`,
      );
    } else {
      lines.push(
        `  Product: ${order.products?.name || "N/A"}`,
        `  Duration: ${order.product_durations?.duration_label || "N/A"}`,
        `  Username: ${order.username_created || "N/A"}`,
      );
    }

    lines.push(
      "",
      "───────────────────────────────────────",
      `  Amount Paid: $${Number(order.amount).toFixed(2)} USDT`,
      `  Payment Method: Crypto (Binance)`,
      `  Transaction ID: ${order.transaction_id || "N/A"}`,
      `  Status: Completed`,
      "",
      "═══════════════════════════════════════",
      "  Thank you for your purchase!",
      "  CGX Hub - cgxhub.in",
      "═══════════════════════════════════════",
    );

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded!");
  };

  return (
    <DashboardLayout section="user">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Invoices</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center rounded-xl p-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Invoices will appear here after completed purchases</p>
          </div>
        ) : (
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isCreditPurchase = order.invoice_data?.type === "credit_purchase";
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          INV-{order.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          {isCreditPurchase
                            ? `${order.invoice_data.package_name} (${order.invoice_data.credits} credits)`
                            : order.products?.name || "Product"}
                        </TableCell>
                        <TableCell>${Number(order.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadInvoice(order)}
                          >
                            <Download className="mr-1 h-4 w-4" /> Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserInvoices;
