import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, ShoppingBag, User, LogOut, LayoutDashboard, Menu, X, Coins } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, isAdmin, isSeller, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-gradient">CGX Regedit</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ShoppingBag className="mr-1.5 h-4 w-4" /> Products
            </Link>
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/buy-credits">
                  <Coins className="mr-1.5 h-4 w-4" /> Buy Credits
                </Link>
              </Button>
              {isSeller && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/seller">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" /> Seller Panel
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">
                    <Shield className="mr-1.5 h-4 w-4" /> Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <User className="mr-1.5 h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-1.5 h-4 w-4" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-border/50 bg-card p-4 md:hidden">
          <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/">Products</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/buy-credits">Buy Credits</Link>
              </Button>
              {isSeller && (
                <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/seller">Seller Panel</Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
