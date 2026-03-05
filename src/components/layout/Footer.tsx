import { Shield } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 bg-card/30 py-8">
    <div className="container mx-auto flex flex-col items-center gap-4 px-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between md:text-left">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">CGX Regedit</span>
      </div>
      <p>© {new Date().getFullYear()} CGX Regedit. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
