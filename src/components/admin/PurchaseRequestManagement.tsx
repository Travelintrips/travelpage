import React, { useEffect, useState, useRef } from "react";
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
import { BrowserMultiFormatReader } from "@zxing/browser";
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
  ChevronDown,
  ChevronRight,
  Camera,
  Upload,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";



interface PurchaseRequest {
  id: string;
  request_date: string;
  requester_name: string;
  requester_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  tax?: number;
  shipping_cost: number;
  total_amount: number;
  attachment_url?: string;
  barcode: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";
  request_code?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
  verified_by?: string;
  rejected_by?: string;
  rejected_at?: string;
  completed_at?: string;
  completed_by?: string;
  received_date?: string;
  completion_notes?: string;
  completion_photo_url?: string;
}

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  tax_id? : string;
}

interface KPIData {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
}

export function CameraBarcodeScanner({
  onDetected,
  active = true,
}: {
  onDetected: (code: string) => void;
  active?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Arahkan kamera ke barcode...");
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return; // hanya aktif jika modal terbuka

    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | null = null;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          const code = result.getText();
          if (code !== lastCode) {
            setLastCode(code);
            setStatus(`✅ Barcode terdeteksi: ${code}`);
            onDetected(code);
          }
        }
      })
      .then((ctrl) => {
        controls = ctrl;
      })
      .catch((err) => console.error("Camera error:", err));

    // ✅ cleanup aman — tanpa reader.reset()
    return () => {
      if (controls && typeof controls.stop === "function") {
        controls.stop();
        console.log("📷 Kamera dimatikan dengan aman");
      }
    };
  }, [active]); // kamera hidup/mati tergantung state modal

  return (
    <div className="border rounded-lg bg-gray-50 mt-3 p-2 space-y-2">
      <video ref={videoRef} className="w-full rounded-md" muted playsInline />
      <p className="text-sm text-gray-600">{status}</p>
      {lastCode && <p className="text-green-700 text-sm font-mono">{lastCode}</p>}
    </div>
  );
}

const PurchaseRequestManagement = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PurchaseRequest[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [kpiData, setKpiData] = useState<KPIData>({
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requesterNameFilter, setRequesterNameFilter] = useState("all");
  const [requesterNames, setRequesterNames] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("pending");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [completionPhoto, setCompletionPhoto] = useState<File | null>(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState<string>("");
  const [completionData, setCompletionData] = useState({
    receivedDate: new Date(),
    notes: "",
  });
  const [isScanning, setIsScanning] = useState(false);
  

  // Form states
  const [formData, setFormData] = useState({
    date: new Date(),
    item: "",
    photo: null as File | null,
    photoPreview: "",
    quantity: 1,
    unit_price: 0,
    tax: 0,
    shipping_cost: 0,
    notes: "",
    barcode: "",
    supplier_id: "",
    supplier_name: "",
    contact_person: "",
    phone_number: "",
    email: "",
    address: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const toggleRowExpansion = (requestId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(requestId)) {
      newExpandedRows.delete(requestId);
    } else {
      newExpandedRows.add(requestId);
    }
    setExpandedRows(newExpandedRows);
  };

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
      
      // Build query with dynamic filters
      let query = supabase
        .from("purchase_requests")
        .select("*");

      // Apply requester name filter
      if (requesterNameFilter && requesterNameFilter !== "all") {
        query = query.eq("name", requesterNameFilter);
      }

      // Apply status filter
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Order by created_at desc
      query = query.order("created_at", { ascending: false });

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      // Get unique user IDs for verified_by and rejected_by
      const userIds = new Set<string>();
      requestsData?.forEach(request => {
        if (request.verified_by) userIds.add(request.verified_by);
        if (request.rejected_by) userIds.add(request.rejected_by);
        if (request.completed_by) userIds.add(request.completed_by);
      });

      // Fetch user names
      let usersMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));

        if (!usersError && usersData) {
          usersMap = usersData.reduce((acc, user) => {
            acc[user.id] = user.full_name || user.email || "Unknown User";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Map the requests with user names
      const mappedRequests = requestsData?.map(request => ({
        ...request,
        request_date: request.request_date,
        requester_name: request.name || request.requester_name,
        item_name: request.item_name,
        quantity: request.qty || request.quantity,
        unit_price: request.unit_price,
        tax: request.tax,
        shipping_cost: request.shipping_cost,
        total_amount: request.total_amount,
        status: request.status || (request.verified_at ? "APPROVED" : "PENDING"),
        verified_by: request.verified_by ? usersMap[request.verified_by] : undefined,
        rejected_by: request.rejected_by ? usersMap[request.rejected_by] : undefined,
        completed_by: request.completed_by ? usersMap[request.completed_by] : undefined,
      })) || [];

      setRequests(mappedRequests);
      calculateKPIs(mappedRequests);
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

  const fetchRequesterNames = async () => {
    try {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("name")
        .not("name", "is", null)
        .neq("name", "")
        .order("name");

      if (error) throw error;

      // Get unique names
      const uniqueNames = Array.from(new Set(data?.map(item => item.name).filter(Boolean))) as string[];
      setRequesterNames(uniqueNames);
    } catch (error) {
      console.error("Error fetching requester names:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("supplier_name");

      if (error) throw error;

      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch suppliers",
      });
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    if (!supplierId || supplierId === "none") {
      // Clear supplier fields
      setSelectedSupplier(null);
      setFormData(prev => ({
        ...prev,
        supplier_id: "",
        supplier_name: "",
        contact_person: "",
        phone_number: "",
        email: "",
        address: "",
        tax_id: "",
      }));
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData(prev => ({
        ...prev,
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name || "",
        contact_person: supplier.contact_person || "",
        phone_number: supplier.phone_number || "",
        email: supplier.email || "",
        address: supplier.address || "",
        tax_id :supplier.tax_id || "",
      }));
    }
  };

  const calculateKPIs = (data: PurchaseRequest[]) => {
    const pending = data.filter((req) => req.status === "PENDING");
    const approved = data.filter((req) => req.status === "APPROVED");

    setKpiData({
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, req) => sum + req.total_amount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, req) => sum + req.total_amount, 0),
    });
  };

  const applyFilters = () => {
    let filtered = requests;

    // Search filter - search in requester_name, item_name, and request_code
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          (req.requester_name || "").toLowerCase().includes(query) ||
          (req.item_name || "").toLowerCase().includes(query) ||
          (req.request_code && req.request_code.toLowerCase().includes(query))
      );
    }

    // Tab filter
    if (activeTab === "pending") {
      filtered = filtered.filter((req) => req.status === "PENDING");
    } else {
      filtered = filtered.filter((req) => req.status === "APPROVED" || req.status === "REJECTED" || req.status === "COMPLETED");
    }

    setFilteredRequests(filtered);
  };

  const handleCreateRequest = async () => {
    if (!user || !formData.item.trim() || formData.quantity <= 0 || formData.unit_price <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields (Item Name, Quantity, Unit Price)",
      });
      return;
    }

    try {
      let photoUrl = null;

      // Upload photo if provided
      if (formData.photo) {
        const fileExt = formData.photo.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `purchase-requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('purchase-requests')
          .upload(filePath, formData.photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('purchase-requests')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      const totalAmount = (Number(formData.quantity) * Number(formData.unit_price)) + Number(formData.tax) + Number(formData.shipping_cost);

      const { error } = await supabase.from("purchase_requests").insert({
        request_date: format(formData.date, "yyyy-MM-dd"),
        requester_id: user.id,
        name: user.user_metadata?.full_name || user.email || "Unknown",
        email: user.email || "",
        item_name: formData.item.trim(),
        qty: formData.quantity,
        unit_price: formData.unit_price,
        tax: formData.tax,
        shipping_cost: formData.shipping_cost,
        total_amount: totalAmount,
        attachment_url: photoUrl,
        notes: formData.notes.trim() || null,
        barcode: formData.barcode || null,
        status: "PENDING",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Request created",
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
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          status: "APPROVED",
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase request approved successfully",
      });
      await fetchRequests();
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
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          status: "REJECTED",
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason.trim() || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase request rejected successfully",
      });
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      await fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject purchase request",
      });
    }
  };

  const handleCompleted = async () => {
    if (!selectedRequest || !user) return;

    try {
      let photoUrl = null;

      // Upload photo if provided
      if (completionPhoto) {
        const fileExt = completionPhoto.name.split('.').pop();
        const fileName = `${selectedRequest.id}_${Date.now()}.${fileExt}`;
        const filePath = `purchase-completions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('purchase-requests')
          .upload(filePath, completionPhoto);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('purchase-requests')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Update request status to COMPLETED
      const { error } = await supabase
        .from("purchase_requests")
        .update({
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          received_date: completionData.receivedDate.toISOString(),
          completion_notes: completionData.notes.trim() || null,
          completion_photo_url: photoUrl,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase request marked as completed",
      });
      
      // Reset form
      setShowCompletedDialog(false);
      setSelectedRequest(null);
      setCompletionPhoto(null);
      setCompletionPhotoPreview("");
      setCompletionData({
        receivedDate: new Date(),
        notes: "",
      });
      
      await fetchRequests();
    } catch (error) {
      console.error("Error completing request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark purchase request as completed",
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompletionPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // You can implement a camera capture UI here
      // For now, we'll just use the file input
      toast({
        title: "Info",
        description: "Please use the upload button to select a photo from your camera",
      });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not access camera. Please use the upload button instead.",
      });
    }
  };

  const handleFormPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoPreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      item: "",
      photo: null,
      photoPreview: "",
      quantity: 1,
      unit_price: 0,
      tax: 0,
      shipping_cost: 0,
      notes: "",
      barcode: "",
      supplier_id: "",
      supplier_name: "",
      contact_person: "",
      phone_number: "",
      email: "",
      address: "",
    });
    setSelectedSupplier(null);
  };

  const handleBarcodeDetected = (code: string) => {
    setFormData(prev => ({ ...prev, barcode: code }));
    toast({
      title: "Barcode Detected",
      description: `Barcode: ${code}`,
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setRequesterNameFilter("all");
    setStatusFilter("all");
    fetchRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    fetchRequesterNames();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [requesterNameFilter, statusFilter]);

  useEffect(() => {
    applyFilters();
  }, [requests, searchTerm, activeTab]);

  const totalAmount = (Number(formData.quantity) * Number(formData.unit_price)) + Number(formData.tax) + Number(formData.shipping_cost);

  

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
                  placeholder="Search by requester name, item name, or request code..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Select value={requesterNameFilter} onValueChange={setRequesterNameFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All requesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All requesters</SelectItem>
                {requesterNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleResetFilters}
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchRequests}
              disabled={loading}
              title="Refresh"
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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Requester Name</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <React.Fragment key={request.id}>
                      {/* Master Row */}
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(request.id)}
                            className="p-1 h-6 w-6"
                          >
                            {expandedRows.has(request.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>{format(new Date(request.request_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{request.requester_name}</TableCell>
                        <TableCell>{request.item_name}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(request.total_amount)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {request.status === "PENDING" && (
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
                          {request.status === "APPROVED" && activeTab === "history" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowCompletedDialog(true);
                              }}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Completed
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Detail Row */}
                      {expandedRows.has(request.id) && (
                        <TableRow className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={6}>
                            <div className="py-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
  <Label className="text-sm font-medium text-muted-foreground">Foto Barang</Label>
  {request.attachment_url ? (
    <img
      src={request.attachment_url}
      alt="Foto Barang"
      className="mt-2 w-40 h-40 object-cover rounded-lg border"
    />
  ) : (
    <p className="text-sm text-muted-foreground">Belum ada foto</p>
  )}
</div>

                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                                  <p className="text-sm font-medium">{request.quantity}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Unit Price</Label>
                                  <p className="text-sm font-medium">{formatCurrency(request.unit_price)}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Shipping Cost</Label>
                                  <p className="text-sm font-medium">{formatCurrency(request.shipping_cost)}</p>
                                </div>
                              </div>
                              
                              {/* Verification/Rejection Details */}
                              {request.status === "APPROVED" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                                  <div>
                                    <Label className="text-sm font-medium text-green-600">Verified by</Label>
                                    <p className="text-sm font-medium">{request.verified_by || "System Admin"}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-green-600">Verified at</Label>
                                    <p className="text-sm font-medium">
                                      {request.verified_at 
                                        ? format(new Date(request.verified_at), "dd/MM/yyyy HH:mm")
                                        : "-"
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {request.status === "COMPLETED" && (
                                <div className="space-y-4 pt-2 border-t">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium text-blue-600">Completed by</Label>
                                      <p className="text-sm font-medium">{request.completed_by || "System Admin"}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-blue-600">Completed at</Label>
                                      <p className="text-sm font-medium">
                                        {request.completed_at 
                                          ? format(new Date(request.completed_at), "dd/MM/yyyy HH:mm")
                                          : "-"
                                        }
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium text-blue-600">Received Date</Label>
                                      <p className="text-sm font-medium">
                                        {request.received_date 
                                          ? format(new Date(request.received_date), "dd/MM/yyyy HH:mm")
                                          : "-"
                                        }
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {request.completion_photo_url && (
                                    <div>
                                      <Label className="text-sm font-medium text-blue-600">Foto Penerimaan</Label>
                                      <img
                                        src={request.completion_photo_url}
                                        alt="Foto Penerimaan"
                                        className="mt-2 w-full max-w-md h-auto rounded-lg border"
                                      />
                                    </div>
                                  )}
                                  
                                  {request.completion_notes && (
                                    <div>
                                      <Label className="text-sm font-medium text-blue-600">Keterangan Penerimaan</Label>
                                      <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
                                        {request.completion_notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {request.status === "REJECTED" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                                  <div>
                                    <Label className="text-sm font-medium text-red-600">Rejected by</Label>
                                    <p className="text-sm font-medium">{request.rejected_by || "System Admin"}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-red-600">Rejected at</Label>
                                    <p className="text-sm font-medium">
                                      {request.rejected_at 
                                        ? format(new Date(request.rejected_at), "dd/MM/yyyy HH:mm")
                                        : "-"
                                      }
                                    </p>
                                  </div>
                                  {request.rejection_reason && (
                                    <div className="md:col-span-2">
                                      <Label className="text-sm font-medium text-red-600">Rejection Reason</Label>
                                      <p className="text-sm bg-red-50 p-2 rounded border border-red-200">
                                        {request.rejection_reason}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {request.notes && (
                                <div className="pt-2 border-t">
                                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                                  <p className="text-sm bg-gray-50 p-2 rounded border">
                                    {request.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
            <DialogDescription>
              Create a new purchase request for approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date *</Label>
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
              <Label htmlFor="supplier">Supplier</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Pilih supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Tidak ada supplier --</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Details - Read Only */}
            {selectedSupplier && (
              <>
                <div>
                  <Label htmlFor="supplier_name">Supplier Name</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone_number}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    disabled
                    className="bg-muted"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Tax ID/No</Label>
                  <Textarea
                    id="tax_id"
                    value={formData.tax_id}
                    disabled
                    className="bg-muted"
                    rows={2}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="item">Item Name *</Label>
              <Input
                id="item"
                placeholder="Enter item name/description"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              />
            </div>

            {/* 📸 Photo Upload + Barcode Scanner Section */}
<div>
  <Label>Photo</Label>

  <div className="mt-2 space-y-2">
    {/* 🖼️ Preview Foto */}
    {formData.photoPreview && (
      <div className="relative w-full h-48 border rounded-lg overflow-hidden">
        <img
          src={formData.photoPreview}
          alt="Preview"
          className="w-full h-full object-cover"
        />
        <Button
          size="sm"
          variant="destructive"
          className="absolute top-2 right-2"
          onClick={() =>
            setFormData((prev) => ({ ...prev, photo: null, photoPreview: "" }))
          }
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )}

    {/* 🧭 Tombol Upload / Take Photo */}
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        onClick={() => document.getElementById("form-photo-upload")?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload Photo
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1"
        onClick={() => document.getElementById("form-camera-capture")?.click()}
      >
        <Camera className="h-4 w-4 mr-2" />
        Take Photo
      </Button>
    </div>

    {/* 📁 Hidden Input */}
    <input
      id="form-photo-upload"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFormPhotoChange}
    />
    <input
      id="form-camera-capture"
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={handleFormPhotoChange}
    />
  </div>

  {/* 📷 Scanner Barcode */}
  {showNewRequestDialog && (
  <div className="mt-4 border-t pt-4">
    <Label className="text-sm font-medium">Scan Barcode (Opsional)</Label>

    {!isScanning ? (
      <Button
        variant="outline"
        className="mt-2"
        onClick={() => setIsScanning(true)} // nyalakan kamera manual
      >
        <Camera className="w-4 h-4 mr-2" />
        Mulai Scan Barcode
      </Button>
    ) : (
      <>
        <CameraBarcodeScanner
          active={isScanning}
          onDetected={(code) => {
            handleBarcodeDetected(code);
            setIsScanning(false); // matikan kamera setelah berhasil
          }}
        />
        <Button
          variant="destructive"
          className="mt-2"
          onClick={() => setIsScanning(false)} // stop manual
        >
          Stop Kamera
        </Button>
      </>
    )}
  </div>
)}

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
              <Label htmlFor="tax">Tax (Rp)</Label>
              <Input
                id="tax"
                placeholder="0"
                value={formData.tax ? formatNumber(formData.tax.toString()) : ""}
                onChange={(e) => setFormData({ ...formData, tax: parseFormattedNumber(e.target.value) })}
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

      {/* Completed Dialog */}
      <Dialog open={showCompletedDialog} onOpenChange={setShowCompletedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Completed</DialogTitle>
            <DialogDescription>
              Upload proof of receipt and completion details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Photo Upload */}
            <div>
              <Label>Upload Foto</Label>
              <div className="mt-2 space-y-2">
                {completionPhotoPreview && (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                    <img
                      src={completionPhotoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setCompletionPhoto(null);
                        setCompletionPhotoPreview("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload dari Folder
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => document.getElementById('camera-capture')?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Ambil Foto
                  </Button>
                </div>
                
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <input
                  id="camera-capture"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>

            {/* Received Date */}
            <div>
              <Label>Tanggal Menerima</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !completionData.receivedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {completionData.receivedDate 
                      ? format(completionData.receivedDate, "dd/MM/yyyy HH:mm")
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={completionData.receivedDate}
                    onSelect={(date) => 
                      setCompletionData({ 
                        ...completionData, 
                        receivedDate: date || new Date() 
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="completion_notes">Keterangan</Label>
              <Textarea
                id="completion_notes"
                placeholder="Masukkan keterangan penerimaan barang..."
                value={completionData.notes}
                onChange={(e) => 
                  setCompletionData({ 
                    ...completionData, 
                    notes: e.target.value 
                  })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCompletedDialog(false);
                setSelectedRequest(null);
                setCompletionPhoto(null);
                setCompletionPhotoPreview("");
                setCompletionData({
                  receivedDate: new Date(),
                  notes: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCompleted}>
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequestManagement;