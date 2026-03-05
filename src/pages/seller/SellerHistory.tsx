import DashboardLayout from "@/components/layout/DashboardLayout";
import { History } from "lucide-react";

const SellerHistory = () => (
  <DashboardLayout section="seller">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Credit History</h1>
      <div className="glass-card flex flex-col items-center justify-center rounded-xl p-16">
        <History className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Credit transaction history will appear here</p>
      </div>
    </div>
  </DashboardLayout>
);

export default SellerHistory;
