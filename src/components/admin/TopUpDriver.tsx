import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Loader2,
  Eye,
  Filter,
  Calendar,
  DollarSign,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DriverTopUpRequest {
  id: string;
  user_id: string;
  reference_no: string | null;
  amount: number;
  payment_method: string;
  bank_name: string | null;
  status: string;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  note: string | null;
  request_by_role?: string | null;
  driver_name?: string;
  driver_email?: string;
  driver_phone?: string;
  admin_name?: string;
  admin_email?: string;
  saldo_sebelum?: number;
  saldo_sesudah?: number;
}

interface HistoriTransaksi {
  id: string;
  user_id: string | null;
  code_booking: string;
  nominal: number;
  saldo_akhir: number;
  jenis_transaksi: string | null;
  admin_name: string | null;
  trans_date: string | null;
  driver_name?: string;
  driver_email?: string;
  driver_phone?: string;
}

interface Driver {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  saldo: number | null;
}

interface TopUpDriverProps {
  filterByRole?: string | null;
  title?: string;
  description?: string;
}

const TopUpDriver = ({ 
  filterByRole = null, 
  title = "Top Up Driver", 
  description = "Manage driver top-up requests and view transaction history" 
}: TopUpDriverProps) => {
  const [pendingRequests, setPendingRequests] = useState<DriverTopUpRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<DriverTopUpRequest[]>([]);
  const [adminTopupHistory, setAdminTopupHistory] = useState<HistoriTransaksi[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DriverTopUpRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [isManualTopupModalOpen, setIsManualTopupModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [manualTopupAmount, setManualTopupAmount] = useState("");
  const [manualTopupNote, setManualTopupNote] = useState("");
  const [driverSearchOpen, setDriverSearchOpen] = useState(false);
  const [driverSearchValue, setDriverSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from localStorage or default to "pending"
    return localStorage.getItem('topup-driver-active-tab') || 'pending';
  });
  const { toast } = useToast();
  const { userId } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('topup-driver-active-tab', value);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPendingRequests(),
        fetchHistoryRequests(),
        fetchAdminTopupHistory(),
        fetchDrivers()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch driver top-up data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
  try {
    console.log("[TopUpDriver] Fetching pending requests...");

    // Step 1: Ambil semua pending requests
    let query = supabase
      .from("topup_requests")
      .select(`
        id,
        proof_url,
        reference_no,
        amount,
        payment_method,
        bank_name,
        created_at,
        status,
        note,
        verified_at,
        verified_by,
        user_id,
        request_by_role
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const { data: requests, error: requestsError } = await query;

    if (requestsError) {
      console.error("Error fetching pending requests:", requestsError);
      throw requestsError;
    }

    console.log("[TopUpDriver] Raw pending data:", requests);

    // Step 2: Ambil user data
    const userIds = requests?.map((r: any) => r.user_id).filter(Boolean) || [];
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, role")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      usersMap = (users || []).reduce((acc: any, user: any) => {
        acc[user.id] = user;
        return acc;
      }, {});
    }

    // Step 3: Filter berdasarkan role
    const filteredRequests =
      requests
        ?.filter((request: any) => {
          const user = usersMap[request.user_id];

          if (filterByRole) {
            console.log(
              `[TopUpDriver] Filtering by role: ${filterByRole}, request_by_role: ${request.request_by_role}, user_role: ${user?.role}`
            );
            if (filterByRole === "Agent") {
              return (
                request.request_by_role === "Agent" || user?.role === "Agent"
              );
            }
            return request.request_by_role === filterByRole;
          }

          // Default: semua jenis driver
          const role = request.request_by_role || user?.role;
          return (
            role === "driver" ||
            role === "Driver Perusahaan" ||
            role === "Driver Mitra"
          );
        })
        .map((request: any) => {
          const user = usersMap[request.user_id] || {};
          return {
            ...request,
            driver_name: user.full_name || "Unknown Driver",
            driver_email: user.email || "Unknown",
            driver_phone: user.phone_number || "-",
          };
        }) || [];

    console.log("[TopUpDriver] Filtered requests:", filteredRequests);
    setPendingRequests(filteredRequests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    toast({
      title: "Error",
      description: "Failed to fetch pending requests",
      variant: "destructive",
    });
  }
};


  const fetchHistoryRequests = async () => {
  try {
    console.log("[TopUpDriver] Fetching history requests...");

    // Step 1: Ambil history requests dari view
    let query = supabase
      .from("v_topup_requests")
      .select(`
        id,
        user_id,
        amount,
        payment_method,
        bank_name,
        destination_account,
        proof_url,
        reference_no,
        status,
        note,
        created_at,
        verified_at,
        verified_by,
        sender_bank,
        request_by_role,
        account_holder_received,
        sender_account,
        sender_name,
        user_email,
        user_full_name,
        admin_email,
        admin_full_name
      `)
      .in("status", ["verified", "rejected"])
      .order("created_at", { ascending: false });

    if (filterByRole) {
      query = query.eq("request_by_role", filterByRole);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error("Error fetching history requests:", error);
      throw error;
    }

    console.log("[TopUpDriver] Raw history data (from view):", requests);

    // Step 2: Ambil admin names dari users table berdasarkan admin_id
    const adminIds = requests?.map((r: any) => r.admin_id).filter(Boolean) || [];
    let adminNamesMap: Record<string, any> = {};

    if (adminIds.length > 0) {
      const { data: admins, error: adminsError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", adminIds);

      if (adminsError) {
        console.error("Error fetching admin names:", adminsError);
        // Don't throw error, just continue without admin names
      } else {
        adminNamesMap = (admins || []).reduce((acc: any, admin: any) => {
          acc[admin.id] = admin;
          return acc;
        }, {});
      }
    }

    // Step 3: Ambil phone numbers dari users table
    const userIds = requests?.map((r: any) => r.user_id).filter(Boolean) || [];
    let usersPhoneMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, phone_number")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching user phone numbers:", usersError);
        // Don't throw error, just continue without phone numbers
      } else {
        usersPhoneMap = (users || []).reduce((acc: any, user: any) => {
          acc[user.id] = user.phone_number || "-";
          return acc;
        }, {});
      }
    }

    // Step 4: Filter + map dengan admin names dan phone numbers
    const filteredHistory =
      requests
        ?.filter((request: any) => {
          if (filterByRole) {
            console.log(
              `[TopUpDriver] History filtering by role: ${filterByRole}, request_by_role: ${request.request_by_role}`
            );
            if (filterByRole === "Agent") {
              return (
                request.request_by_role === "Agent"
              );
            }
            return request.request_by_role === filterByRole;
          }

          // Default behavior: filter drivers
          return (
            request.request_by_role === "driver" ||
            request.request_by_role === "Driver Perusahaan" ||
            request.request_by_role === "Driver Mitra"
          );
        })
        .map((request: any) => {
          const adminInfo = adminNamesMap[request.admin_id];
          return {
            ...request,
            driver_name: request.users?.full_name || "Unknown Driver",
            driver_email: request.users?.email || "Unknown",
            driver_phone: request.users?.phone_number || "-",
            admin_name: adminInfo?.full_name || request.admin_name || "System Admin", // Prioritas: dari users table, lalu dari kolom admin_name
            admin_email: adminInfo?.email || "Unknown",
          };
        });

    console.log("[TopUpDriver] Filtered history with admin names:", filteredHistory);
    setHistoryRequests(filteredHistory);
  } catch (error) {
    console.error("Error fetching history requests:", error);
    toast({
      title: "Error",
      description: "Failed to fetch history requests",
      variant: "destructive",
    });
  }
};



  const fetchAdminTopupHistory = async () => {
    try {
      console.log("[TopUpDriver] Fetching admin topup history from histori_transaksi...");

      // Fetch from histori_transaksi table filtered by jenis_transaksi
      const { data: historiData, error: historiError } = await supabase
        .from("histori_transaksi")
        .select(`
          id,
          user_id,
          code_booking,
          nominal,
          saldo_akhir,
          jenis_transaksi,
          admin_name,
          trans_date
        `)
        .ilike("jenis_transaksi", "%Topup Manual Driver%")
        .order("trans_date", { ascending: false });

      if (historiError) {
        console.error("Error fetching admin topup history:", historiError);
        throw historiError;
      }

      console.log("[TopUpDriver] Raw admin topup history data:", historiData);

      // Get user data for driver names
      const userIds = historiData?.map((h: any) => h.user_id).filter(Boolean) || [];
      let usersMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, phone_number")
          .in("id", userIds);

        if (usersError) {
          console.error("Error fetching users for admin topup history:", usersError);
        } else {
          usersMap = (users || []).reduce((acc: any, user: any) => {
            acc[user.id] = user;
            return acc;
          }, {});
        }
      }

      // Map the data with user information
      const mappedHistory = (historiData || []).map((item: any) => {
        const user = usersMap[item.user_id] || {};
        return {
          ...item,
          driver_name: user.full_name || "Unknown Driver",
          driver_email: user.email || "Unknown",
          driver_phone: user.phone_number || "-",
        };
      });

      console.log("[TopUpDriver] Mapped admin topup history:", mappedHistory);
      setAdminTopupHistory(mappedHistory);
    } catch (error) {
      console.error("Error fetching admin topup history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch admin topup history",
        variant: "destructive",
      });
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, email, phone_number, saldo")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const handleApprove = async (request: DriverTopUpRequest, note: string = "Approved by admin") => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      
      console.log("[TopUpDriver] Approving request:", request.id);
      
      // Use the verify_topup function with correct parameters
      const { error: verifyError } = await supabase.rpc('verify_topup', {
        p_request_id: request.id,
        p_note: note
      });

      if (verifyError) {
        console.error("Error verifying topup request:", verifyError);
        throw verifyError;
      }
      
      toast({
        title: "Success",
        description: `Top-up request for ${request.driver_name} has been approved`,
      });
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve top-up request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request: DriverTopUpRequest, reason: string) => {
    if (!reason.trim() || !userId) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      
      console.log("[TopUpDriver] Rejecting request:", request.id);
      
      // Use the reject_topup function if available, otherwise update directly
      const { error: rejectError } = await supabase.rpc('reject_topup', {
        p_request_id: request.id,
        p_admin: userId,
        p_reason: reason
      });

      if (rejectError) {
        console.error("Error with reject_topup function, trying direct update:", rejectError);
        
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from("topup_requests")
          .update({
            status: "rejected",
            verified_by: userId,
            verified_at: new Date().toISOString(),
            note: reason
          })
          .eq("id", request.id);

        if (updateError) {
          console.error("Error updating topup request:", updateError);
          throw updateError;
        }
      }
      
      toast({
        title: "Success",
        description: `Top-up request for ${request.driver_name} has been rejected`,
      });
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject top-up request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDetailModal = (request: DriverTopUpRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const openRejectModal = (request: DriverTopUpRequest) => {
    setSelectedRequest(request);
    setIsRejectModalOpen(true);
  };

  const openReviewModal = (request: DriverTopUpRequest) => {
    setSelectedRequest(request);
    setReviewNote("");
    setReviewAction(null);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewNote.trim() || !reviewAction) {
      toast({
        title: "Error",
        description: "Please provide a note and select an action",
        variant: "destructive",
      });
      return;
    }

    if (reviewAction === 'approve') {
      await handleApprove(selectedRequest, reviewNote);
    } else {
      await handleReject(selectedRequest, reviewNote);
    }

    setIsReviewModalOpen(false);
    setReviewNote("");
    setReviewAction(null);
    setSelectedRequest(null);
  };

  // Generate booking code for manual topup
  const generateBookingCode = () => {
    const timestamp = Date.now();
    return `TOPDM-${timestamp}`;
  };

  // Filter admin topup history based on search criteria
  const filteredAdminTopupHistory = adminTopupHistory.filter((item) => {
    const matchesSearch = 
      (item.driver_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.driver_email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.code_booking || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateFilter && item.trans_date) {
      const transactionDate = new Date(item.trans_date)
        .toISOString()
        .split("T")[0];
      matchesDate = transactionDate === dateFilter;
    }

    let matchesAmount = true;
    if (amountFilter) {
      const filterAmount = parseFloat(amountFilter);
      if (!isNaN(filterAmount)) {
        matchesAmount = item.nominal >= filterAmount;
      }
    }

    return matchesSearch && matchesDate && matchesAmount;
  });

  const handleManualTopup = async () => {
  if (!selectedDriverId || !manualTopupAmount || !manualTopupNote.trim() || !userId) {
    toast({
      title: "Error",
      description: "Please fill in all required fields",
      variant: "destructive",
    });
    return;
  }

  const amount = parseFloat(manualTopupAmount);
  if (isNaN(amount) || amount <= 0) {
    toast({
      title: "Error",
      description: "Please enter a valid amount",
      variant: "destructive",
    });
    return;
  }

  try {
    setProcessing(true);

    console.log("[TopUpDriver] Creating manual topup for driver:", selectedDriverId);

    // Generate booking code
    const bookingCode = generateBookingCode();
    console.log("[TopUpDriver] Generated booking code:", bookingCode);

    // 1. Get current driver saldo and admin info
    const { data: currentDriver, error: fetchDriverError } = await supabase
      .from("drivers")
      .select("saldo, full_name")
      .eq("id", selectedDriverId)
      .single();

    if (fetchDriverError || !currentDriver) {
      throw fetchDriverError || new Error("Driver not found");
    }

    // 2. Get admin info
    const { data: adminData, error: fetchAdminError } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (fetchAdminError) {
      console.error("Error fetching admin data:", fetchAdminError);
    }

    const currentSaldo = currentDriver.saldo || 0;
    const newSaldo = currentSaldo + amount;
    const adminName = adminData?.full_name || "Admin";

    // 3. Insert into topup_requests table with booking code
    const { error: insertTopupError } = await supabase
      .from("topup_requests")
      .insert({
        user_id: selectedDriverId,
        reference_no: bookingCode,
        amount: amount,
        payment_method: "Manual Admin Topup",
        status: "verified",
        verified_by: userId,
        verified_at: new Date().toISOString(),
        note: `Manual Top-up by Admin: ${manualTopupNote}`,
        request_by_role: "Admin Manual",
        created_at: new Date().toISOString()
      });

    if (insertTopupError) {
      console.error("Error inserting to topup_requests:", insertTopupError);
      throw insertTopupError;
    }

    // 4. Insert into histori_transaksi table
    const { error: insertError } = await supabase
      .from("histori_transaksi")
      .insert({
        user_id: selectedDriverId,
        code_booking: bookingCode,
        nominal: amount,
        saldo_akhir: newSaldo,
        keterangan: `Topup Manual Driver by Admin (${bookingCode})`,
        jenis_transaksi: 'Topup Manual Driver',
        admin_name: adminName,
        trans_date: new Date().toISOString()
      });

    if (insertError) {
      console.error("Error inserting to histori_transaksi:", insertError);
      throw insertError;
    }

    // 5. Update driver saldo
    const { error: updateError } = await supabase
      .from("drivers")
      .update({ saldo: newSaldo })
      .eq("id", selectedDriverId);

    if (updateError) {
      console.error("Error updating driver saldo:", updateError);
      throw updateError;
    }

    // Success toast with booking code
    const selectedDriver = drivers.find(d => d.id === selectedDriverId);
    toast({
      title: "Success",
      description: `Manual top-up of Rp ${amount.toLocaleString()} for ${selectedDriver?.full_name || 'driver'} has been processed. Booking Code: ${bookingCode}`,
    });

    // Reset form & close modal
    setIsManualTopupModalOpen(false);
    setSelectedDriverId("");
    setManualTopupAmount("");
    setManualTopupNote("");
    setDriverSearchOpen(false);
    setDriverSearchValue("");

    // Refresh data
    await fetchData();
  } catch (error) {
    console.error("Error processing manual topup:", error);
    toast({
      title: "Error",
      description: "Failed to process manual top-up",
      variant: "destructive",
    });
  } finally {
    setProcessing(false);
  }
};


  const openManualTopupModal = () => {
    setSelectedDriverId("");
    setManualTopupAmount("");
    setManualTopupNote("");
    setDriverSearchOpen(false);
    setDriverSearchValue("");
    setIsManualTopupModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <ArrowUpCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Activity className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <ArrowDownCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600">
            <Activity className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const filteredPendingRequests = pendingRequests.filter((request) => {
    const matchesSearch = 
      (request.driver_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.driver_email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateFilter) {
      const requestDate = new Date(request.created_at)
        .toISOString()
        .split("T")[0];
      matchesDate = requestDate === dateFilter;
    }

    let matchesAmount = true;
    if (amountFilter) {
      const filterAmount = parseFloat(amountFilter);
      if (!isNaN(filterAmount)) {
        matchesAmount = request.amount >= filterAmount;
      }
    }

    return matchesSearch && matchesDate && matchesAmount;
  });

  const filteredHistoryRequests = historyRequests.filter((request) => {
    const matchesSearch = 
      (request.driver_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.driver_email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateFilter) {
      const requestDate = new Date(request.created_at)
        .toISOString()
        .split("T")[0];
      matchesDate = requestDate === dateFilter;
    }

    let matchesAmount = true;
    if (amountFilter) {
      const filterAmount = parseFloat(amountFilter);
      if (!isNaN(filterAmount)) {
        matchesAmount = request.amount >= filterAmount;
      }
    }

    return matchesSearch && matchesDate && matchesAmount;
  });

  // Calculate statistics
  const totalPendingRequests = pendingRequests.length;
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const totalApprovedRequests = historyRequests.filter(r => r.status === "verified" || r.status === "approved").length;
  const totalApprovedAmount = historyRequests
    .filter(r => r.status === "verified" || r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalRejectedRequests = historyRequests.filter(r => r.status === "rejected").length;

  return (
    <div className="space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-600 mt-2">
            {description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openManualTopupModal}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Topup Manual Driver
          </Button>
          <Button
            onClick={fetchData}
            className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests Topup Driver
            </CardTitle>
            <Activity className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              Rp {totalPendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total pending amount
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Requests
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalApprovedRequests}</div>
            <p className="text-xs text-muted-foreground">
              Successfully approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Amount
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {totalApprovedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total approved amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              type="date"
              placeholder="Filter by date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Min amount"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
            />
          </div>
          {(searchTerm || dateFilter || amountFilter) && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter("");
                  setAmountFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Requests Topup Driver</TabsTrigger>
          <TabsTrigger value="history">History Topup Driver</TabsTrigger>
          <TabsTrigger value="admin-topup">Topup Driver by Admin</TabsTrigger>
        </TabsList>
        
        {/* Pending Requests Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>
                Driver top-up requests awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading pending requests...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topup Code</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Nominal Topup</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Bukti Transfer</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            {loading
                              ? "Loading..."
                              : searchTerm || dateFilter || amountFilter
                                ? "No requests match your filters"
                                : "No pending requests found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPendingRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm">
                              {request.reference_no || request.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {request.driver_name}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {request.driver_email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
  <span className="font-medium text-green-600">
    Rp {(Number(request?.amount) || 0).toLocaleString()}
  </span>
</TableCell>


                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {request.method || "-"}
                                </span>
                                {request.bank_name && (
                                  <span className="text-sm text-gray-500">
                                    {request.bank_name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
  {request.proof_url ? (
    <a
      href={request.proof_url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src={request.proof_url}
        alt="Proof"
        className="h-12 w-12 object-cover rounded"
      />
    </a>
  ) : (
    <span>-</span>
  )}
</TableCell>
                            <TableCell>
                              {new Date(request.created_at).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                onClick={() => openReviewModal(request)}
                                disabled={processing}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>History Topup Driver</CardTitle>
              <CardDescription>
                Complete history of driver top-up transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topup Code</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Bukti Transfer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved/Rejected By</TableHead>
                        <TableHead>Decision Date</TableHead>
                        <TableHead>Note/Reason</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistoryRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            {loading
                              ? "Loading..."
                              : searchTerm || dateFilter || amountFilter
                                ? "No history matches your filters"
                                : "No history found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistoryRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm">
                              {request.reference_no || request.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
  <div className="flex flex-col">
    <span className="font-medium">{request.user_full_name}</span>
    <span className="text-sm text-gray-500">{request.user_email}</span>
  </div>
</TableCell>



                            <TableCell>
                              <span className="font-medium text-green-600">
                                Rp {(Number(request?.amount) || 0).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {request.method || "-"}
                                </span>
                                {request.bank_name && (
                                  <span className="text-sm text-gray-500">
                                    {request.bank_name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
  {request.proof_url ? (
    <a
      href={request.proof_url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src={request.proof_url}
        alt="Proof"
        className="h-12 w-12 object-cover rounded"
      />
    </a>
  ) : (
    <span>-</span>
  )}
</TableCell>

                            <TableCell>
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell>
  <div className="flex flex-col">
    <span className="font-medium">
      {request.admin_full_name || "Unknown Admin"}
    </span>
  </div>
</TableCell>


                            <TableCell>
                              {request.verified_at
                                ? new Date(request.verified_at).toLocaleDateString("id-ID", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div
                                className="truncate"
                                title={request.note || "-"}
                              >
                                {request.note || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDetailModal(request)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Topup Tab */}
        <TabsContent value="admin-topup">
          <Card>
            <CardHeader>
              <CardTitle>Topup Driver by Admin</CardTitle>
              <CardDescription>
                Manual top-ups processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading admin topups...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topup Code</TableHead>
                        <TableHead>Driver Name</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed By</TableHead>
                        <TableHead>Process Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdminTopupHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            {loading
                              ? "Loading..."
                              : searchTerm || dateFilter || amountFilter
                                ? "No admin topups match your filters"
                                : "No admin topups found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAdminTopupHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {item.code_booking}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {item.driver_name}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {item.driver_email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-green-600">
                                Rp {item.nominal.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  Manual Admin Topup
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {item.admin_name || "Admin"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.trans_date
                                ? new Date(item.trans_date).toLocaleDateString("id-ID", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div
                                className="truncate"
                                title={item.jenis_transaksi || "-"}
                              >
                                {item.jenis_transaksi || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Create a compatible object for the detail modal
                                  const detailItem = {
                                    id: item.id,
                                    user_id: item.user_id || "",
                                    reference_no: item.code_booking,
                                    amount: item.nominal,
                                    method: "Manual Admin Topup",
                                    bank_name: null,
                                    status: "verified",
                                    created_at: item.trans_date || new Date().toISOString(),
                                    verified_at: item.trans_date,
                                    verified_by: null,
                                    note: item.keterangan,
                                    driver_name: item.driver_name,
                                    driver_email: item.driver_email,
                                    driver_phone: item.driver_phone,
                                    admin_name: item.admin_name,
                                    admin_email: "",
                                    saldo_sesudah: item.saldo_akhir
                                  };
                                  openDetailModal(detailItem);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Driver Top-Up Request Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected top-up request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Driver Name</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.user_full_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Driver Email</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.user_email}
                  </p>
                </div>
               {/* <div>
                  <Label className="text-sm font-medium">Driver Phone</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.driver_phone}
                  </p>
                </div>*/}
                <div>
                  <Label className="text-sm font-medium">Request Date</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedRequest.created_at).toLocaleString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-bold text-green-600">
                    Rp {(selectedRequest.amount ?? 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {selectedRequest.verified_at && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Verified Date</Label>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedRequest.verified_at).toLocaleString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Verified By</Label>
                      <p className="text-sm text-gray-600">
                        {selectedRequest.admin_full_name || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.note && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Note/Reason</Label>
                  <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedRequest.note}
                  </p>
                </div>
              )}

              {selectedRequest.saldo_sebelum !== undefined && selectedRequest.saldo_sesudah !== undefined && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Saldo Sebelum</Label>
                      <p className="text-lg font-bold">
                        Rp {selectedRequest.saldo_sebelum.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Saldo Sesudah</Label>
                      <p className="text-lg font-bold text-green-600">
                        Rp {selectedRequest.saldo_sesudah.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Top-Up Request</DialogTitle>
            <DialogDescription>
              Please review the request and provide a note for your decision.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
                <div>
                  <Label className="text-sm font-medium">Driver Name</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.driver_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-bold text-green-600">
                    Rp {(selectedRequest.amount ?? 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Method</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.method || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Request Date</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedRequest.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reviewNote">Review Note</Label>
                <Textarea
                  id="reviewNote"
                  placeholder="Enter your note for this decision..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Action</Label>
                <div className="flex gap-2">
                  <Button
                    variant={reviewAction === 'approve' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('approve')}
                    className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewAction === 'reject' ? 'destructive' : 'outline'}
                    onClick={() => setReviewAction('reject')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReviewModalOpen(false);
                setReviewNote("");
                setReviewAction(null);
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={processing || !reviewNote.trim() || !reviewAction}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Top-Up Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this top-up request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Rejection</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for rejecting this request..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectReason("");
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedRequest) {
                  handleReject(selectedRequest, rejectReason);
                  setIsRejectModalOpen(false);
                  setRejectReason("");
                  setSelectedRequest(null);
                }
              }}
              disabled={processing || !rejectReason.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Topup Modal */}
      <Dialog open={isManualTopupModalOpen} onOpenChange={setIsManualTopupModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manual Top-Up Driver</DialogTitle>
            <DialogDescription>
              Create a manual top-up for a driver. This will immediately add the amount to their balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="driverSelect">Select Driver</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setDriverSearchOpen(!driverSearchOpen)}
                  className="w-full justify-between"
                >
                  {selectedDriverId
                    ? (() => {
                        const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId);
                        return selectedDriver
                          ? `${selectedDriver.full_name || selectedDriver.email || "Unknown Driver"} - Saldo: Rp ${(selectedDriver.saldo || 0).toLocaleString()}`
                          : "Choose a driver...";
                      })()
                    : "Choose a driver..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                
                {driverSearchOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-hidden">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search drivers..."
                        value={driverSearchValue}
                        onChange={(e) => setDriverSearchValue(e.target.value)}
                        className="w-full"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-auto">
                      {drivers
                        .filter((driver) => {
                          const searchTerm = driverSearchValue.toLowerCase();
                          const driverName = (driver.full_name || "").toLowerCase();
                          const driverEmail = (driver.email || "").toLowerCase();
                          const driverPhone = (driver.phone_number || "").toLowerCase();
                          return (
                            driverName.includes(searchTerm) ||
                            driverEmail.includes(searchTerm) ||
                            driverPhone.includes(searchTerm)
                          );
                        })
                        .map((driver) => (
                          <div
                            key={driver.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSelectedDriverId(driver.id);
                              setDriverSearchOpen(false);
                              setDriverSearchValue("");
                            }}
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {driver.full_name || "Unknown Driver"}
                                </span>
                                <span className="text-sm font-bold text-green-600">
                                  Rp {(driver.saldo || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>{driver.email || "No email"}</span>
                                <span>{driver.phone_number || "No phone"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      {drivers.filter((driver) => {
                        const searchTerm = driverSearchValue.toLowerCase();
                        const driverName = (driver.full_name || "").toLowerCase();
                        const driverEmail = (driver.email || "").toLowerCase();
                        const driverPhone = (driver.phone_number || "").toLowerCase();
                        return (
                          driverName.includes(searchTerm) ||
                          driverEmail.includes(searchTerm) ||
                          driverPhone.includes(searchTerm)
                        );
                      }).length === 0 && (
                        <div className="p-3 text-center text-gray-500">
                          No driver found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="amount">Top-up Amount (Rp)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount..."
                value={manualTopupAmount}
                onChange={(e) => setManualTopupAmount(e.target.value)}
                min="1"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="note">Description</Label>
              <Textarea
                id="note"
                placeholder="Enter reason for manual top-up..."
                value={manualTopupNote}
                onChange={(e) => setManualTopupNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsManualTopupModalOpen(false);
                setSelectedDriverId("");
                setManualTopupAmount("");
                setManualTopupNote("");
                setDriverSearchOpen(false);
                setDriverSearchValue("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualTopup}
              disabled={processing || !selectedDriverId || !manualTopupAmount || !manualTopupNote.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Top-up"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopUpDriver;