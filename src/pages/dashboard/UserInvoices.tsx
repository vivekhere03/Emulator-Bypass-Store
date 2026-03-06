import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";

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
    const invoiceNum = `INV-${order.id.slice(0, 8).toUpperCase()}`;
    const dateStr = new Date(order.created_at).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("CGX Hub • cgxhub.in", pageWidth / 2, 38, { align: "center" });

    // Line separator
    doc.setDrawColor(200);
    doc.line(20, 44, pageWidth - 20, 44);

    // Invoice details
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(invoiceNum, 20, 55);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, pageWidth - 20, 55, { align: "right" });

    // Item details section
    let y = 72;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Item Details", 20, y);
    y += 4;
    doc.setDrawColor(220);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const addRow = (label: string, value: string) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(label, 25, y);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - 25, y, { align: "right" });
      y += 9;
    };

    if (isCreditPurchase) {
      addRow("Package", order.invoice_data.package_name || "N/A");
      addRow("Credits", `${order.invoice_data.credits} credits`);
      addRow("Type", "Credit Purchase");
    } else {
      addRow("Product", order.products?.name || "N/A");
      addRow("Duration", order.product_durations?.duration_label || "N/A");
      addRow("Username", order.username_created || "N/A");
    }

    // Payment section
    y += 4;
    doc.setDrawColor(220);
    doc.line(20, y, pageWidth - 20, y);
    y += 12;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Payment Details", 20, y);
    y += 14;

    doc.setFontSize(11);
    addRow("Amount Paid", `$${Number(order.amount).toFixed(2)} USDT`);
    addRow("Payment Method", "Crypto (Binance)");
    addRow("Transaction ID", order.transaction_id || "N/A");
    addRow("Status", "Completed");

    // Footer
    y += 8;
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Thank you for your purchase!", pageWidth / 2, y, { align: "center" });

    doc.save(`${invoiceNum}.pdf`);
    toast.success("Invoice PDF downloaded!");
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
