import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import MediaUpload from "@/components/MediaUpload";

interface DurationForm {
  id?: string;
  duration_label: string;
  duration_days: number;
  price: number;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", image_url: "", video_url: "" });
  const [durations, setDurations] = useState<DurationForm[]>([]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("sort_order");
    if (data) {
      // Fetch durations for each product
      const withDurations = await Promise.all(
        data.map(async (p) => {
          const { data: durs } = await supabase
            .from("product_durations")
            .select("*")
            .eq("product_id", p.id)
            .order("sort_order");
          return { ...p, durations: durs ?? [] };
        })
      );
      setProducts(withDurations);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    let productId = editingId;

    if (editingId) {
      const { error } = await supabase.from("products").update({
        name: form.name,
        description: form.description,
        image_url: form.image_url,
        video_url: form.video_url,
      }).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("products").insert({
        name: form.name,
        description: form.description,
        image_url: form.image_url,
        video_url: form.video_url,
      }).select().single();
      if (error) { toast.error(error.message); return; }
      productId = data.id;
    }

    // Save durations
    if (productId) {
      // Delete existing durations for this product
      await supabase.from("product_durations").delete().eq("product_id", productId);

      // Insert new durations
      if (durations.length > 0) {
        const durationsToInsert = durations.map((d, i) => ({
          product_id: productId!,
          duration_label: d.duration_label,
          duration_days: d.duration_days,
          price: d.price,
          sort_order: i,
        }));
        const { error: durError } = await supabase.from("product_durations").insert(durationsToInsert);
        if (durError) { toast.error("Failed to save durations: " + durError.message); return; }
      }
    }

    toast.success(editingId ? "Product updated" : "Product created");
    setDialogOpen(false);
    resetForm();
    fetchProducts();
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      image_url: product.image_url || "",
      video_url: product.video_url || "",
    });
    setDurations(
      (product.durations || []).map((d: any) => ({
        id: d.id,
        duration_label: d.duration_label,
        duration_days: d.duration_days,
        price: Number(d.price),
      }))
    );
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Delete durations first
    await supabase.from("product_durations").delete().eq("product_id", id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    fetchProducts();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", description: "", image_url: "", video_url: "" });
    setDurations([]);
  };

  const addDuration = () => {
    setDurations([...durations, { duration_label: "", duration_days: 1, price: 0 }]);
  };

  const updateDuration = (index: number, field: keyof DurationForm, value: string | number) => {
    const updated = [...durations];
    (updated[index] as any)[field] = value;
    setDurations(updated);
  };

  const removeDuration = (index: number) => {
    setDurations(durations.filter((_, i) => i !== index));
  };

  return (
    <DashboardLayout section="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products</h1>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="glass-card max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BYPASS EXE" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <MediaUpload
                    bucket="product-media"
                    folder="images"
                    accept="image/*"
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                    label="Image"
                    type="image"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Video</Label>
                  <MediaUpload
                    bucket="product-media"
                    folder="videos"
                    accept="video/*"
                    value={form.video_url}
                    onChange={(url) => setForm({ ...form, video_url: url })}
                    label="Video"
                    type="video"
                  />
                </div>

                {/* Duration / Pricing Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Duration & Pricing</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addDuration}>
                      <Plus className="mr-1 h-3 w-3" /> Add Duration
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the price for each duration (e.g. 1 Day = $2, 15 Days = $5, 30 Days = $8)
                  </p>

                  {durations.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      <Clock className="mx-auto mb-2 h-6 w-6" />
                      No durations added. Click "Add Duration" to set prices.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {durations.map((d, i) => (
                        <div key={i} className="flex items-end gap-2 rounded-lg border border-border bg-secondary/30 p-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              placeholder="e.g. 1 Day, 15 Days, 1 Month"
                              value={d.duration_label}
                              onChange={(e) => updateDuration(i, "duration_label", e.target.value)}
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            <Label className="text-xs">Days</Label>
                            <Input
                              type="number"
                              min="1"
                              value={d.duration_days}
                              onChange={(e) => updateDuration(i, "duration_days", parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="w-28 space-y-1">
                            <Label className="text-xs">Price ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={d.price}
                              onChange={(e) => updateDuration(i, "price", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeDuration(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? "Update" : "Create"} Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Durations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-10 w-14 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-14 rounded bg-secondary flex items-center justify-center text-muted-foreground text-xs">No img</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(p.durations || []).map((d: any) => (
                        <Badge key={d.id} variant="secondary" className="text-xs">
                          {d.duration_label}: ${Number(d.price).toFixed(2)}
                        </Badge>
                      ))}
                      {(!p.durations || p.durations.length === 0) && (
                        <span className="text-xs text-muted-foreground">No durations</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={p.is_active ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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

export default AdminProducts;
