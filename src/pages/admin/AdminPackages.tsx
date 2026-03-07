import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_INR_RATE = 90;

const AdminPackages = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", credits: "", price: "", price_inr: "" });

  const fetchPackages = async () => {
    const { data } = await supabase.from("credit_packages").select("*").order("sort_order");
    setPackages(data ?? []);
  };

  useEffect(() => { fetchPackages(); }, []);

  const handleSave = async () => {
    const usdPrice = parseFloat(form.price);
    const inrPrice = form.price_inr ? parseFloat(form.price_inr) : Math.ceil(usdPrice * DEFAULT_INR_RATE);
    const payload = {
      name: form.name,
      credits: parseInt(form.credits),
      price: usdPrice,
      price_inr: inrPrice,
    };
    if (editingId) {
      await supabase.from("credit_packages").update(payload).eq("id", editingId);
      toast.success("Package updated");
    } else {
      await supabase.from("credit_packages").insert(payload);
      toast.success("Package created");
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm({ name: "", credits: "", price: "", price_inr: "" });
    fetchPackages();
  };

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Credit Packages</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Package</Button>
            </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Add"} Package</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Price (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => {
                        const usd = e.target.value;
                        setForm({
                          ...form,
                          price: usd,
                          price_inr: form.price_inr || (usd ? String(Math.ceil(parseFloat(usd) * DEFAULT_INR_RATE)) : ""),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹ INR) <span className="text-xs text-muted-foreground">Override</span></Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder={form.price ? String(Math.ceil(parseFloat(form.price) * DEFAULT_INR_RATE)) : "Auto"}
                      value={form.price_inr}
                      onChange={(e) => setForm({ ...form, price_inr: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto: ${form.price || "0"} × {DEFAULT_INR_RATE} = ₹{form.price ? Math.ceil(parseFloat(form.price) * DEFAULT_INR_RATE) : 0}
                    </p>
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>USD</TableHead>
                <TableHead>INR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.credits}</TableCell>
                  <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell>₹{p.price_inr ? Number(p.price_inr).toFixed(0) : Math.ceil(Number(p.price) * DEFAULT_INR_RATE)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={p.is_active ? "bg-green-500/10 text-green-500" : ""}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(p.id); setForm({ name: p.name, credits: String(p.credits), price: String(p.price), price_inr: p.price_inr ? String(p.price_inr) : "" }); setDialogOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={async () => { await supabase.from("credit_packages").delete().eq("id", p.id); fetchPackages(); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
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

export default AdminPackages;
