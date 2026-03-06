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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Clock, RotateCcw, Trash2, RefreshCw, Users, Coins, AlertTriangle, MinusCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface ManagedUser {
  username: string;
  hwid: string;
  expiry: string;
  expired: boolean;
}

const DURATION_OPTIONS = [
  { value: "1", label: "1 Day", credits: 1 },
  { value: "3", label: "3 Days", credits: 2 },
  { value: "7", label: "7 Days", credits: 5 },
  { value: "15", label: "15 Days", credits: 8 },
  { value: "30", label: "1 Month", credits: 15 },
  { value: "90", label: "3 Months", credits: 30 },
];

function getCreditsForDays(days: string): number {
  return DURATION_OPTIONS.find(o => o.value === days)?.credits ?? 5;
}

function generateRandomSuffix(length = 5) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const SellerUsers = () => {
  const { user } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("add");

  // Add single user
  const [addUsername, setAddUsername] = useState("");
  const [addHwid, setAddHwid] = useState("");
  const [addDays, setAddDays] = useState("7");

  // Bulk add
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkCount, setBulkCount] = useState("5");
  const [bulkDays, setBulkDays] = useState("7");
  const [bulkResults, setBulkResults] = useState<string[]>([]);

  // Dialogs for table actions
  const [extendDialog, setExtendDialog] = useState<{ open: boolean; username: string }>({ open: false, username: "" });
  const [extendDialogDays, setExtendDialogDays] = useState("7");
  const [reduceDialog, setReduceDialog] = useState<{ open: boolean; username: string }>({ open: false, username: "" });
  const [reduceDialogDays, setReduceDialogDays] = useState("7");
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; username: string }>({ open: false, username: "" });
  const [resetDialog, setResetDialog] = useState<{ open: boolean; username: string }>({ open: false, username: "" });
  const [resetDialogHwid, setResetDialogHwid] = useState("");

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
      if (resp.ok && result.users) setUsers(result.users);
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
      toast.success(`User "${addUsername}" added!`);
      setAddUsername("");
      setAddHwid("");
      fetchUsers();
      fetchSeller();
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkPrefix.trim()) { toast.error("Enter a prefix"); return; }
    const count = Math.min(parseInt(bulkCount) || 1, 50);
    const days = parseInt(bulkDays) || 7;
    const created: string[] = [];

    for (let i = 0; i < count; i++) {
      const username = `${bulkPrefix.trim()}_${generateRandomSuffix()}`;
      const data = await callSellerApi("add-user", {
        username,
        hwid: "",
        duration_days: days,
      });
      if (data) {
        created.push(username);
      } else {
        break; // stop on error (likely out of credits)
      }
      // Re-fetch seller to get updated balance
      await fetchSeller();
      if ((seller?.credit_balance ?? 0) < getCreditsForDays(bulkDays)) break;
    }

    if (created.length > 0) {
      setBulkResults(created);
      toast.success(`Created ${created.length} users!`);
      fetchUsers();
      fetchSeller();
    }
  };

  // Table action handlers
  const handleExtendFromTable = async () => {
    const data = await callSellerApi("extend-user", {
      username: extendDialog.username,
      duration_days: parseInt(extendDialogDays),
    });
    if (data) {
      toast.success(`Extended "${extendDialog.username}"`);
      setExtendDialog({ open: false, username: "" });
      fetchUsers();
      fetchSeller();
    }
  };

  const handleReduceFromTable = async () => {
    const data = await callSellerApi("reduce-user", {
      username: reduceDialog.username,
      duration_days: parseInt(reduceDialogDays),
    });
    if (data) {
      toast.success(`Reduced "${reduceDialog.username}" by ${reduceDialogDays} days`);
      setReduceDialog({ open: false, username: "" });
      fetchUsers();
    }
  };

  const handleResetFromTable = async () => {
    const data = await callSellerApi("reset-hwid", {
      username: resetDialog.username,
      new_hwid: resetDialogHwid.trim(),
    });
    if (data) {
      toast.success(`HWID reset for "${resetDialog.username}"`);
      setResetDialog({ open: false, username: "" });
      setResetDialogHwid("");
      fetchUsers();
    }
  };

  const handleRemoveFromTable = async () => {
    const data = await callSellerApi("remove-user", {
      username: removeDialog.username,
    });
    if (data) {
      toast.success(`Removed "${removeDialog.username}"`);
      setRemoveDialog({ open: false, username: "" });
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
            <p className="text-muted-foreground">Add, extend, reduce, reset HWID, or remove users</p>
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
              No credits remaining! Buy more credits to manage users.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger value="add"><UserPlus className="mr-1 h-3.5 w-3.5" /> Add Single</TabsTrigger>
            <TabsTrigger value="bulk"><Users className="mr-1 h-3.5 w-3.5" /> Bulk Add</TabsTrigger>
            <TabsTrigger value="reset"><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset HWID</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-primary" /> Add New User
                </CardTitle>
                <p className="text-sm text-muted-foreground">Create a user account (costs vary by duration)</p>
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
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label} — {o.credits} credit{o.credits > 1 ? "s" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This will cost {getCreditsForDays(addDays)} credit{getCreditsForDays(addDays) > 1 ? "s" : ""}</p>
                </div>
                <Button onClick={handleAddUser} disabled={actionLoading || creditBalance < getCreditsForDays(addDays)}>
                  {actionLoading ? "Adding..." : <><UserPlus className="mr-2 h-4 w-4" /> Add User ({getCreditsForDays(addDays)} credits)</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" /> Bulk Create Users
                </CardTitle>
                <p className="text-sm text-muted-foreground">Create multiple users with a prefix + random suffix (credit cost varies by duration)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Username Prefix</Label>
                    <Input placeholder="e.g. team" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} />
                    <p className="text-xs text-muted-foreground">e.g. team_a8x2k, team_m3f9p</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Count</Label>
                    <Input type="number" min="1" max="50" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={bulkDays} onValueChange={setBulkDays}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label} — {o.credits} credit{o.credits > 1 ? "s" : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Total: {getCreditsForDays(bulkDays) * (parseInt(bulkCount) || 1)} credits</p>
                  </div>
                </div>
                <Button onClick={handleBulkAdd} disabled={actionLoading || creditBalance < getCreditsForDays(bulkDays)}>
                  {actionLoading ? "Creating..." : <><Users className="mr-2 h-4 w-4" /> Create {bulkCount} Users</>}
                </Button>

                {bulkResults.length > 0 && (
                  <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Created {bulkResults.length} users:</p>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(bulkResults.join("\n"));
                        toast.success("Copied to clipboard!");
                      }}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy All
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto font-mono text-xs space-y-1">
                      {bulkResults.map(u => <div key={u} className="text-muted-foreground">{u}</div>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reset">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RotateCcw className="h-5 w-5 text-primary" /> Reset HWID
                </CardTitle>
                <p className="text-sm text-muted-foreground">Reset hardware ID (free)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input placeholder="Username" id="reset-username" />
                  </div>
                  <div className="space-y-2">
                    <Label>New HWID</Label>
                    <Input placeholder="New HWID (or empty to clear)" className="font-mono text-sm" id="reset-hwid" />
                  </div>
                </div>
                <Button onClick={async () => {
                  const un = (document.getElementById("reset-username") as HTMLInputElement)?.value;
                  const hw = (document.getElementById("reset-hwid") as HTMLInputElement)?.value;
                  if (!un?.trim()) { toast.error("Enter username"); return; }
                  const data = await callSellerApi("reset-hwid", { username: un.trim(), new_hwid: hw?.trim() || "" });
                  if (data) { toast.success(`HWID reset for "${un}"`); fetchUsers(); }
                }} disabled={actionLoading}>
                  {actionLoading ? "Resetting..." : <><RotateCcw className="mr-2 h-4 w-4" /> Reset HWID</>}
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
                      <TableHead className="w-[160px]">Actions</TableHead>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Extend"
                              onClick={() => { setExtendDialogDays("7"); setExtendDialog({ open: true, username: u.username }); }}>
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Reduce"
                              onClick={() => { setReduceDialogDays("7"); setReduceDialog({ open: true, username: u.username }); }}>
                              <MinusCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Reset HWID"
                              onClick={() => { setResetDialogHwid(""); setResetDialog({ open: true, username: u.username }); }}>
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remove"
                              onClick={() => setRemoveDialog({ open: true, username: u.username })}>
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

      {/* Extend Dialog */}
      <Dialog open={extendDialog.open} onOpenChange={(o) => setExtendDialog({ ...extendDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend User: {extendDialog.username}</DialogTitle>
            <DialogDescription>Add more days to this user's subscription (costs 1 credit)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Extend By</Label>
            <Select value={extendDialogDays} onValueChange={setExtendDialogDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog({ open: false, username: "" })}>Cancel</Button>
            <Button onClick={handleExtendFromTable} disabled={actionLoading || creditBalance < 1}>
              {actionLoading ? "Extending..." : "Extend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reduce Dialog */}
      <Dialog open={reduceDialog.open} onOpenChange={(o) => setReduceDialog({ ...reduceDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reduce User: {reduceDialog.username}</DialogTitle>
            <DialogDescription>Shorten this user's subscription (free, no credit cost)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reduce By</Label>
            <Select value={reduceDialogDays} onValueChange={setReduceDialogDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReduceDialog({ open: false, username: "" })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReduceFromTable} disabled={actionLoading}>
              {actionLoading ? "Reducing..." : "Reduce"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset HWID Dialog */}
      <Dialog open={resetDialog.open} onOpenChange={(o) => setResetDialog({ ...resetDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset HWID: {resetDialog.username}</DialogTitle>
            <DialogDescription>Change or clear this user's hardware ID (free)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New HWID</Label>
            <Input placeholder="Leave empty to clear" value={resetDialogHwid} onChange={(e) => setResetDialogHwid(e.target.value)} className="font-mono text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog({ open: false, username: "" })}>Cancel</Button>
            <Button onClick={handleResetFromTable} disabled={actionLoading}>
              {actionLoading ? "Resetting..." : "Reset HWID"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(o) => setRemoveDialog({ ...removeDialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User: {removeDialog.username}</DialogTitle>
            <DialogDescription>This will permanently delete the user. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, username: "" })}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveFromTable} disabled={actionLoading}>
              {actionLoading ? "Removing..." : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SellerUsers;
