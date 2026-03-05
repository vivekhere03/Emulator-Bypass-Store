import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText } from "lucide-react";

const UserInvoices = () => (
  <DashboardLayout section="user">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <div className="glass-card flex flex-col items-center justify-center rounded-xl p-16">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Invoices will appear here after completed purchases</p>
      </div>
    </div>
  </DashboardLayout>
);

export default UserInvoices;
