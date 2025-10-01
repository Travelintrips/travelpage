import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  CalendarIcon,
  RefreshCw,
  Check,
  X,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PurchaseRequest {
  id: string;
  date: string;
  requester_id: string;
  requester_name: string;
  item: string;
  quantity: number;
  unit_price: number;
  shipping_cost: number;
  total_amount: number;
  status: "pending" | "approved" | "rejected";
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface KPIData {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
}

const PurchaseRequestManagement = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PurchaseRequest[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>({
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("pending");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    date: new Date(),
    item: "",
    quantity: 1,
    unit_price: 0,
    shipping_cost: 0,
    notes: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, "");
    return new Intl.NumberFormat("id-ID").format(Number(number));
  };

  const parseFormattedNumber = (value: string) => {
    return Number(value.replace(/\./g, ""));
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      calculateKPIs(data || []);
    } catch (error) {
      console.error("Error fetching purchase requests:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch purchase requests",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (data: PurchaseRequest[]) => {
    const pending = data.filter((req) => req.status === "pending");
    const approved = data.filter((req) => req.status === "approved");

    setKpiData({
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, req) => sum + req.total_amount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, req) => sum + req.total_amount, 0),
    });
  };

  const applyFilters = () => {
    let filtered = requests;

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.item.toLowerCase().includes(query) ||
          req.requester_name.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((req) => req.date === filterDate);
    }

    // Tab filter
    if (activeTab === "pending") {
      filtered = filtered.filter((req) => req.status === "pending");
    } else {
      filtered = filtered.filter((req) => req.status !== "pending");
    }

    setFilteredRequests(filtered);
  };

  const handleCreateRequest = async () => {
    if (!user || !formData.item.trim() || formData.quantity <= 0 || formData.unit_price <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      const { error } = await supabase.from("purchase_requests").insert({
        date: format(formData.date, "yyyy-MM-dd"),
        requester_id: user.id,
        requester_name: user.user_metadata?.full_name || user.email || "Unknown",
        item: formData.item.trim(),
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        shipping_cost: formData.shipping_cost,
        notes: formData.notes.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase request created successfully",
      });

      setShowNewRequestDialog(false);
      resetForm();
      await fetchRequests();
    } catch (error) {
      console.error("Error creating purchase request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create purchase request",
      });
    }
  };

  const handleApprove = async (request: PurchaseRequest) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("approve_purchase_request", {
        request_id: request.id,
        approver_id: user.id,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Purchase request approved successfully",
        });
        await fetchRequests();
      } else {
        throw new Error(data?.message || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve purchase request",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;

    try {
      const { data, error } = await supabase.rpc("reject_purchase_request", {
        request_id: selectedRequest.id,
        approver_id: user.id,
        reason: rejectionReason.trim() || null,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Purchase request rejected successfully",
        });
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason("");
        await fetchRequests();
      } else {
        throw new Error(data?.message || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject purchase request",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      item: "",
      quantity: 1,
      unit_price: 0,
      shipping_cost: 0,
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, searchTerm, statusFilter, dateFilter, activeTab]);

  const totalAmount = formData.quantity * formData.unit_price + formData.shipping_cost;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Requests</h1>
          <p className="text-muted-foreground">Manage purchase requests and approvals</p>
        </div>
        <Button onClick={() => setShowNewRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Request
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(kpiData.pendingAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {kpiData.pendingCount} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(kpiData.approvedAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.approvedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {kpiData.approvedCount} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item or requester..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="min-w-[120px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchRequests}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No purchase requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{format(new Date(request.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{request.requester_name}</TableCell>
                      <TableCell>{request.item}</TableCell>
                      <TableCell>{request.quantity}</TableCell>
                      <TableCell>{formatCurrency(request.unit_price)}</TableCell>
                      <TableCell>{formatCurrency(request.shipping_cost)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(request.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => handleApprove(request)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectDialog(true);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
            <DialogDescription>
              Create a new purchase request for approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "dd/MM/yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="requester">Requester</Label>
              <Input
                id="requester"
                value={user?.user_metadata?.full_name || user?.email || "Unknown"}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="item">Item *</Label>
              <Input
                id="item"
                placeholder="Enter item description"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <Label htmlFor="unit_price">Unit Price (Rp) *</Label>
              <Input
                id="unit_price"
                placeholder="0"
                value={formData.unit_price ? formatNumber(formData.unit_price.toString()) : ""}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFormattedNumber(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="shipping_cost">Shipping Cost (Rp)</Label>
              <Input
                id="shipping_cost"
                placeholder="0"
                value={formData.shipping_cost ? formatNumber(formData.shipping_cost.toString()) : ""}
                onChange={(e) => setFormData({ ...formData, shipping_cost: parseFormattedNumber(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="total">Total Amount</Label>
              <Input
                id="total"
                value={formatCurrency(totalAmount)}
                disabled
                className="bg-muted font-medium"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest}>
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Purchase Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this purchase request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejection_reason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectDialog(false);
              setSelectedRequest(null);
              setRejectionReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PurchaseRequestManagement;