import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Users, ArrowRight, Clock, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  durations: { id: string; duration_label: string; duration_days: number; price: number }[];
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (prods) {
        const withDurations = await Promise.all(
          prods.map(async (p) => {
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
    fetchProducts();
  }, []);

  const lowestPrice = (durations: Product["durations"]) => {
    if (!durations.length) return null;
    return Math.min(...durations.map((d) => d.price));
  };

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(239_84%_67%/0.15),transparent_60%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 border-primary/30 bg-primary/10 text-primary">
              <Zap className="mr-1 h-3 w-3" /> Premium License Provider
            </Badge>
            <h1 className="mb-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
              <span className="text-gradient">CGX Regedit</span>
              <br />
              <span className="text-foreground">License Portal</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
              Get premium access to the best tools. Purchase individual licenses or become a seller
              and manage your own reseller business with our powerful API.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="gap-2 text-base" asChild>
                <a href="#products">
                  Browse Products <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base" asChild>
                <Link to="/become-seller">Become a Seller</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="container mx-auto mt-20 px-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Shield, label: "Secure Payments", desc: "Binance Pay verified" },
              { icon: Users, label: "Seller Program", desc: "API-based management" },
              { icon: Zap, label: "Instant Delivery", desc: "Auto-provisioned accounts" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="glass-card rounded-xl p-6 text-center"
              >
                <stat.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                <p className="font-semibold text-foreground">{stat.label}</p>
                <p className="text-sm text-muted-foreground">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section id="products" className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold">Available Products</h2>
            <p className="text-muted-foreground">Choose a product and get started instantly</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card animate-pulse rounded-xl p-6">
                  <div className="mb-4 h-48 rounded-lg bg-secondary" />
                  <div className="mb-2 h-6 w-2/3 rounded bg-secondary" />
                  <div className="h-4 w-full rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="glass-card rounded-xl p-16 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">No Products Available</h3>
              <p className="text-muted-foreground">Check back soon for new products.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Link
                    to={`/product/${product.id}`}
                    className="group glass-card block overflow-hidden rounded-xl transition-all hover:glow-border"
                  >
                    <div className="relative aspect-video bg-secondary">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Shield className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge className="absolute right-3 top-3 bg-primary/90">Active</Badge>
                    </div>
                    <div className="p-6">
                      <h3 className="mb-2 text-lg font-bold">{product.name}</h3>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {product.description || "Premium license product"}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {product.durations.length} plan{product.durations.length !== 1 ? "s" : ""}
                        </div>
                        {lowestPrice(product.durations) !== null && (
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <DollarSign className="h-4 w-4" />
                            From ${lowestPrice(product.durations)!.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="glass-card glow-border rounded-2xl p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Become a Seller</h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              Join our seller program and get access to our powerful API. Manage users, earn from reselling, and grow your business.
            </p>
            <Button size="lg" asChild>
              <Link to="/become-seller">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
