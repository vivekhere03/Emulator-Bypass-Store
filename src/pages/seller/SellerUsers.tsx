import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Clock, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SellerUsers = () => {
  const [username, setUsername] = useState("");
  const [action, setAction] = useState("add");

  const handleAction = () => {
    if (!username.trim()) {
      toast.error("Enter a username");
      return;
    }
    toast.info(`Action '${action}' for user '${username}' — API integration coming soon`);
  };

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Manage Users</h1>

        <Tabs defaultValue="add" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-secondary">
            <TabsTrigger value="add">Add User</TabsTrigger>
            <TabsTrigger value="extend">Extend</TabsTrigger>
            <TabsTrigger value="reset">Reset HWID</TabsTrigger>
            <TabsTrigger value="remove">Remove</TabsTrigger>
          </TabsList>

          {[
            { val: "add", icon: UserPlus, label: "Add New User", desc: "Create a new user account (1 credit)" },
            { val: "extend", icon: Clock, label: "Extend User", desc: "Extend user subscription (1 credit)" },
            { val: "reset", icon: RotateCcw, label: "Reset HWID", desc: "Reset user hardware ID (1 credit)" },
            { val: "remove", icon: Trash2, label: "Remove User", desc: "Remove a user account (1 credit)" },
          ].map((tab) => (
            <TabsContent key={tab.val} value={tab.val}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <tab.icon className="h-5 w-5 text-primary" /> {tab.label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{tab.desc}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  {tab.val === "add" && (
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="30">1 Month</SelectItem>
                          <SelectItem value="90">3 Months</SelectItem>
                          <SelectItem value="180">6 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {tab.val === "extend" && (
                    <div className="space-y-2">
                      <Label>Extend By</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 Days</SelectItem>
                          <SelectItem value="30">1 Month</SelectItem>
                          <SelectItem value="90">3 Months</SelectItem>
                          <SelectItem value="180">6 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleAction}>
                    <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SellerUsers;
