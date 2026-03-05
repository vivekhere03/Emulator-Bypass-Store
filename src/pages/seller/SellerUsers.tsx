import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, Clock, RotateCcw, Trash2, RefreshCw, Users, Coins, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ManagedUser {
  username: string;
  hwid: string;
  expiry: string;
  expired: boolean;
}

const SellerUsers = () => {
  const { user } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [addUsername, setAddUsername] = useState("");
  const [addHwid, setAddHwid] = useState("");
  const [addDays, setAddDays] = useState("7");
  const [extendUsername, setExtendUsername] = useState("");
  const [extendDays, setExtendDays] = useState("7");
  const [resetUsername, setResetUsername] = useState("");
  const [resetHwid, setResetHwid] = useState("");
  const [removeUsername, setRemoveUsername] = useState("");

  const fetchSeller = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sellers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setSeller(data);
  }, [user]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-api?action=list-users`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await resp.json();
      if (resp.ok && result.users) {
        setUsers(result.users);
      }
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSeller();
    fetchUsers();
  }, [fetchSeller, fetchUsers]);

  const callSellerApi = async (action: string, body: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-api?action=${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || `Action failed`);
        setActionLoading(false);
        return null;
      }
      return data;
    } catch (err: any) {
      toast.error(err.message || "Network error");
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!addUsername.trim()) { toast.error("Enter username"); return; }
    const data = await callSellerApi("add-user", {
      username: addUsername.trim(),
      hwid: addHwid.trim(),
      duration_days: parseInt(addDays),
    });
    if (data) {
      toast.success(`User "${addUsername}" added! Expires: ${data.expiry || "set"}`);
      setAddUsername("");
      setAddHwid("");
      fetchUsers();
      fetchSeller();
    }
  };

  const handleExtendUser = async () => {
    if (!extendUsername.trim()) { toast.error("Enter username"); return; }
    const data = await callSellerApi("extend-user", {
      username: extendUsername.trim(),
      duration_days: parseInt(extendDays),
    });
    if (data) {
      toast.success(`User "${extendUsername}" extended! New expiry: ${data.new_expiry || "updated"}`);
      setExtendUsername("");
      fetchUsers();
      fetchSeller();
    }
  };

  const handleResetHwid = async () => {
    if (!resetUsername.trim()) { toast.error("Enter username"); return; }
    const data = await callSellerApi("reset-hwid", {
      username: resetUsername.trim(),
      new_hwid: resetHwid.trim(),
    });
    if (data) {
      toast.success(`HWID reset for "${resetUsername}"`);
      setResetUsername("");
      setResetHwid("");
      fetchUsers();
    }
  };

  const handleRemoveUser = async () => {
    if (!removeUsername.trim()) { toast.error("Enter username"); return; }
    const data = await callSellerApi("remove-user", {
      username: removeUsername.trim(),
    });
    if (data) {
      toast.success(`User "${removeUsername}" removed`);
      setRemoveUsername("");
      fetchUsers();
    }
  };

  const creditBalance = seller?.credit_balance ?? 0;

  return (
    <DashboardLayout section="seller">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manage Users</h1>
            <p className="text-muted-foreground">Add, extend, reset HWID, or remove users</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">{creditBalance} credits</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => { fetchUsers(); fetchSeller(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {creditBalance === 0 && seller && (
          <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500">
              No credits remaining! <a href="/buy-credits" className="underline font-semibold">Buy more credits</a> to manage users.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="add" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-secondary">
            <TabsTrigger value="add"><UserPlus className="mr-1 h-3.5 w-3.5" /> Add</TabsTrigger>
            <TabsTrigger value="extend"><Clock className="mr-1 h-3.5 w-3.5" /> Extend</TabsTrigger>
            <TabsTrigger value="reset"><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset HWID</TabsTrigger>
            <TabsTrigger value="remove"><Trash2 className="mr-1 h-3.5 w-3.5" /> Remove</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-primary" /> Add New User
                </CardTitle>
                <p className="text-sm text-muted-foreground">Create a user account (costs 1 credit)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input placeholder="e.g. player123" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>HWID (optional)</Label>
                    <Input placeholder="Leave empty for auto-bind" value={addHwid} onChange={(e) => setAddHwid(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={addDays} onValueChange={setAddDays}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="15">15 Days</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                      <SelectItem value="90">3 Months</SelectItem>
                      <SelectItem value="180">6 Months</SelectItem>
                      <SelectItem value="365">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddUser} disabled={actionLoading || creditBalance < 1}>
                  {actionLoading ? "Adding..." : <><UserPlus className="mr-2 h-4 w-4" /> Add User</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extend">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" /> Extend User
                </CardTitle>
                <p className="text-sm text-muted-foreground">Extend subscription (costs 1 credit)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="Username to extend" value={extendUsername} onChange={(e) => setExtendUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Extend By</Label>
                  <Select value={extendDays} onValueChange={setExtendDays}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="15">15 Days</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                      <SelectItem value="90">3 Months</SelectItem>
                      <SelectItem value="180">6 Months</SelectItem>
                      <SelectItem value="365">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExtendUser} disabled={actionLoading || creditBalance < 1}>
                  {actionLoading ? "Extending..." : <><Clock className="mr-2 h-4 w-4" /> Extend User</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reset">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RotateCcw className="h-5 w-5 text-primary" /> Reset HWID
                </CardTitle>
                <p className="text-sm text-muted-foreground">Reset hardware ID (free, no credit cost)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="Username" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>New HWID</Label>
                  <Input placeholder="New hardware ID (or empty to clear)" value={resetHwid} onChange={(e) => setResetHwid(e.target.value)} className="font-mono text-sm" />
                </div>
                <Button onClick={handleResetHwid} disabled={actionLoading}>
                  {actionLoading ? "Resetting..." : <><RotateCcw className="mr-2 h-4 w-4" /> Reset HWID</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="remove">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <Trash2 className="h-5 w-5" /> Remove User
                </CardTitle>
                <p className="text-sm text-muted-foreground">Permanently delete a user (free, no credit cost)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="Username to remove" value={removeUsername} onChange={(e) => setRemoveUsername(e.target.value)} />
                </div>
                <Button variant="destructive" onClick={handleRemoveUser} disabled={actionLoading}>
                  {actionLoading ? "Removing..." : <><Trash2 className="mr-2 h-4 w-4" /> Remove User</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Users Table */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Your Users
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="mb-3 h-10 w-10 opacity-30" />
                <p>No users yet. Add your first user above.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>HWID</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.username}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {u.hwid ? (u.hwid.length > 20 ? u.hwid.slice(0, 20) + "…" : u.hwid) : (
                            <Badge variant="outline" className="text-xs">auto-bind</Badge>
                          )}
                        </TableCell>
                        <TableCell>{u.expiry}</TableCell>
                        <TableCell>
                          <Badge variant={u.expired ? "destructive" : "default"} className="text-xs">
                            {u.expired ? "Expired" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              title="Extend"
                              onClick={() => { setExtendUsername(u.username); }}
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              title="Remove"
                              onClick={() => { setRemoveUsername(u.username); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SellerUsers;
