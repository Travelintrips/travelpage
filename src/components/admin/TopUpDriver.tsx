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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export default function TopUpDriver({ 
  filterByRole = null,
  title = "Top-Up Driver Management",
  description = "Manage driver top-up requests and view transaction history"
}: TopUpDriverProps = {}) {
  const [pendingRequests, setPendingRequests] = useState<DriverTopUpRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<DriverTopUpRequest[]>([]);
  const [adminTopupHistory, setAdminTopupHistory] = useState<HistoriTransaksi[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
  const [topupType, setTopupType] = useState<"manual" | "bank_transfer">("manual");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isTopupProcessing, setIsTopupProcessing] = useState(false);
  //const [requests, setRequests] = useState<any[]>([]);

  
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const [currentPageAdmin, setCurrentPageAdmin] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [activeTab, setActiveTab] = useState(() => {
    // Restore active tab from localStorage or default to "pending"
    return localStorage.getItem('topup-driver-active-tab') || 'pending';
  });
  const { toast } = useToast();
  const { userId } = useAuth();

  useEffect(() => {
    fetchData();
    fetchPaymentMethods();
  }, []);
  
  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .eq("provider", "bank_transfer")
        .order("bank_name", { ascending: true });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

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

    const { data: requests, error: requestsError } = await supabase
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

    if (requestsError) throw requestsError;
    console.log("[TopUpDriver] Raw pending data:", requests);

    // Ambil semua user terkait
    const userIds = requests?.map((r) => r.user_id).filter(Boolean) || [];
    let usersMap: Record<string, any> = {};
    let driversMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const [{ data: users }, { data: drivers }] = await Promise.all([
        supabase.from("users").select("id, full_name, email, phone_number, role").in("id", userIds),
        supabase.from("drivers").select("user_id, full_name, email, phone_number").in("user_id", userIds),
      ]);

      usersMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      driversMap = (drivers || []).reduce((acc, driver) => {
        acc[driver.user_id] = driver;
        return acc;
      }, {});
    }

    const filteredRequests =
      requests
        ?.filter((req: any) => {
          const user = usersMap[req.user_id];
          const driver = driversMap[req.user_id];
          const role = (req.request_by_role || user?.role || "").toLowerCase();

          // Jika ada filterByRole dari UI
          if (filterByRole) {
            return (
              role.includes(filterByRole.toLowerCase()) ||
              (user?.role || "").toLowerCase().includes(filterByRole.toLowerCase())
            );
          }

          // ✅ Jika kolom request_by_role kosong tapi user_id valid — tetap tampil
          if (!role && (user || driver)) return true;

          // Default filter semua driver-related role
          return /(driver|perusahaan|mitra|admin)/i.test(role);
        })
        .map((req: any) => {
          const user = usersMap[req.user_id] || {};
          const driver = driversMap[req.user_id] || {};

          // ✅ Prioritas nama: driver.full_name → user.full_name → "Unknown Driver"
          const driverName = driver.full_name || user.full_name || "Unknown Driver";
          const driverEmail = driver.email || user.email || "-";
          const driverPhone = driver.phone_number || user.phone_number || "-";

          return {
            ...req,
            driver_name: driverName,
            driver_email: driverEmail,
            driver_phone: driverPhone,
          };
        }) || [];

    console.log("[TopUpDriver] Filtered requests with names:", filteredRequests);
    setPendingRequests(filteredRequests);
  } catch (error) {
    console.error("❌ Error fetching pending requests:", error);
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

    // 1️⃣ Ambil data utama
    const { data: requests, error } = await supabase
      .from("topup_requests")
      .select(`
        id,
        user_id,
        name,
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
        sender_name
      `)
      .in("status", ["verified", "rejected"])
      .order("created_at", { ascending: false });

    if (error) throw error;
    console.log("[TopUpDriver] Raw history data:", requests);

    // 2️⃣ Ambil user & driver data
    const userIds = requests?.map((r) => r.user_id).filter(Boolean) || [];
    let driversMap: Record<string, any> = {};
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const [{ data: drivers }, { data: users }] = await Promise.all([
        supabase
          .from("drivers")
          .select("user_id, full_name, email, phone_number")
          .in("user_id", userIds),
        supabase
          .from("users")
          .select("id, full_name, email, phone_number, role")
          .in("id", userIds),
      ]);

      driversMap = (drivers || []).reduce((acc, d) => {
        acc[d.user_id] = d;
        return acc;
      }, {});
      usersMap = (users || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});
    }

    // 3️⃣ ✅ Ambil admin info dari verified_by (tabel users, bukan auth.users)
    const adminIds = requests?.map((r) => r.verified_by).filter(Boolean) || [];
    let adminMap: Record<string, any> = {};

    if (adminIds.length > 0) {
      const { data: admins, error: adminError } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, role")
        .in("id", adminIds);

      if (adminError) console.error("Error fetching admin info:", adminError);

      adminMap = (admins || []).reduce((acc, a) => {
        acc[a.id] = {
          id: a.id,
          email: a.email,
          full_name: a.full_name || "Admin",
          role: a.role || "Staff Admin",
          phone: a.phone_number || "-",
        };
        return acc;
      }, {});
    }

  //  console.log("[TopUpDriver] Admin map:", adminMap);

    // 4️⃣ Gabungkan semua hasil (driver, user, admin)
    const mergedRequests = (requests || []).map((r) => ({
      ...r,
      driver_info: driversMap[r.user_id],
      user_info: usersMap[r.user_id],
      admin_info: adminMap[r.verified_by],
    }));

    // 5️⃣ Filter fleksibel
    const filteredHistory =
      mergedRequests
        ?.filter((req) => {
          const user = usersMap[req.user_id];
          const driver = driversMap[req.user_id];
          const role = (req.request_by_role || user?.role || "").toLowerCase();

          if (filterByRole) {
            return (
              role.includes(filterByRole.toLowerCase()) ||
              (user?.role || "").toLowerCase().includes(filterByRole.toLowerCase())
            );
          }

          if (!role && (user || driver)) return true;

          return /(driver|mitra|perusahaan|admin)/i.test(role);
        })
        .map((req) => {
          const driver = driversMap[req.user_id] || {};
          const user = usersMap[req.user_id] || {};
          const admin = adminMap[req.verified_by] || {};

          const driverName =
            driver.full_name || user.full_name || req.user_full_name || "Unknown Driver";
          const driverEmail =
            driver.email || user.email || req.user_email || "Unknown";
          const driverPhone =
            driver.phone_number || user.phone_number || "-";

          const adminName = admin.full_name || "System";
          const adminEmail = admin.email || "-";

          return {
            ...req,
            driver_name: driverName,
            driver_email: driverEmail,
            driver_phone: driverPhone,
            admin_name: adminName,
            admin_email: adminEmail,
          };
        }) || [];

  /*  console.table(
      filteredHistory.map((r) => ({
        id: r.id,
        driver_name: r.driver_name,
        admin_name: r.admin_name,
        admin_email: r.admin_email,
        verified_by: r.verified_by,
        role: r.request_by_role,
      }))
    );*/

    // ✅ Simpan hasil akhir ke state
    setHistoryRequests(filteredHistory);
  } catch (error) {
    console.error("❌ Error fetching history requests:", error);
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
      let driversMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const [{ data: users }, { data: drivers }] = await Promise.all([
          supabase.from("users").select("id, full_name, email, phone_number").in("id", userIds),
          supabase.from("drivers").select("user_id, full_name, email, phone_number").in("user_id", userIds),
        ]);

        usersMap = (users || []).reduce((acc: any, user: any) => {
          acc[user.id] = user;
          return acc;
        }, {});

        driversMap = (drivers || []).reduce((acc: any, driver: any) => {
          acc[driver.user_id] = driver;
          return acc;
        }, {});
      }

      console.log("[TopUpDriver] Users map:", usersMap);
      console.log("[TopUpDriver] Drivers map:", driversMap);

      // Map the data with user information
      const mappedHistory = (historiData || []).map((item: any) => {
        const driver = driversMap[item.user_id] || {};
        const user = usersMap[item.user_id] || {};
        
        // ✅ Prioritas: driver.full_name → user.full_name → "Unknown Driver"
        const driverName = driver.full_name || user.full_name || "Unknown Driver";
        const driverEmail = driver.email || user.email || "Unknown";
        const driverPhone = driver.phone_number || user.phone_number || "-";

        console.log(`[TopUpDriver] Mapping user_id ${item.user_id}:`, {
          driver_name: driverName,
          driver_email: driverEmail,
          from_driver: !!driver.full_name,
          from_user: !!user.full_name
        });

        return {
          ...item,
          driver_name: driverName,
          driver_email: driverEmail,
          driver_phone: driverPhone,
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
      (item.driver_phone || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.code_booking || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesDateRange = true;
    if ((startDate || endDate) && item.trans_date) {
      const transactionDate = new Date(item.trans_date)
        .toISOString()
        .split("T")[0];
      
      if (startDate && endDate) {
        matchesDateRange = transactionDate >= startDate && transactionDate <= endDate;
      } else if (startDate) {
        matchesDateRange = transactionDate >= startDate;
      } else if (endDate) {
        matchesDateRange = transactionDate <= endDate;
      }
    }

    return matchesSearch && matchesDateRange;
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

  // ✅ Validasi untuk Bank Transfer
  if (topupType === "bank_transfer") {
    if (!selectedBankAccount) {
      toast({
        title: "Error",
        description: "Please select a bank account",
        variant: "destructive",
      });
      return;
    }
    if (!proofFile) {
      toast({
        title: "Error",
        description: "Please upload proof of transfer",
        variant: "destructive",
      });
      return;
    }
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
    setIsTopupProcessing(true);

    console.log("[TopUpDriver] Creating topup for driver:", selectedDriverId);

    // Generate booking code
    const bookingCode = generateBookingCode();
    console.log("[TopUpDriver] Generated booking code:", bookingCode);

    // 1. Get current driver saldo and admin info
    const { data: currentDriver, error: fetchDriverError } = await supabase
      .from("drivers")
      .select("saldo, full_name, user_id, role_name")
      .eq("id", selectedDriverId)
      .single();

    if (fetchDriverError || !currentDriver) {
      throw fetchDriverError || new Error("Driver not found");
    }

    // 2. Get admin info
    const adminResult = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (adminResult.error) {
      console.error("Error fetching admin data:", adminResult.error);
    }

    const currentSaldo = currentDriver.saldo || 0;
    const newSaldo = currentSaldo + amount;
    const adminName = adminResult.data?.full_name || "Admin";
    
    // ✅ Ambil role_name dari tabel drivers
    const driverRole = currentDriver.role_name || "Driver";

    console.log("[TopUpDriver] Saldo calculation:", {
      currentSaldo,
      amount,
      newSaldo,
      driverRole
    });

    let proofUrl = null;

    // ✅ Upload proof jika Bank Transfer
    if (topupType === "bank_transfer" && proofFile) {
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${bookingCode}_${Date.now()}.${fileExt}`;
      const filePath = `topup-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("transfer-proofs")
        .upload(filePath, proofFile);

      if (uploadError) {
        console.error("Error uploading proof:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("transfer-proofs")
        .getPublicUrl(filePath);

      proofUrl = urlData.publicUrl;
    }

    // 3. Insert into topup_requests table
    const topupRequestData: any = {
      user_id: selectedDriverId,
      reference_no: bookingCode,
      amount: amount,
      payment_method: topupType === "manual" ? "Manual Admin Topup" : "Bank Transfer",
      status: topupType === "manual" ? "verified" : "pending",
      note: manualTopupNote || null,
      request_by_role: driverRole,
      created_at: new Date().toISOString()
    };

    if (topupType === "manual") {
      topupRequestData.verified_by = userId;
      topupRequestData.verified_at = new Date().toISOString();
    }

    if (topupType === "bank_transfer") {
      const selectedBank = paymentMethods.find(pm => pm.account_number === selectedBankAccount);
      topupRequestData.bank_name = selectedBank?.bank_name || "";
      topupRequestData.destination_account = selectedBankAccount;
      topupRequestData.proof_url = proofUrl;
      topupRequestData.account_holder_received = selectedBank?.account_holder || "";
    }

    const { error: insertTopupError } = await supabase
      .from("topup_requests")
      .insert(topupRequestData);

    if (insertTopupError) {
      console.error("Error inserting to topup_requests:", insertTopupError);
      throw insertTopupError;
    }

    // 4. ✅ Insert ke histori_transaksi untuk Manual dan Bank Transfer
    const historiTransaksiData: any = {
      user_id: selectedDriverId,
      code_booking: bookingCode,
      nominal: amount,
      saldo_awal: currentSaldo,
      saldo_akhir: newSaldo,
      keterangan: topupType === "manual" 
        ? `Topup by Admin (${adminName})` 
        : `Bank Transfer by Admin (${adminName})`,
      jenis_transaksi: topupType === "manual" ? 'Topup Manual Driver' : 'Topup Bank Transfer Driver',
      status: topupType === "manual" ? "verified" : "pending",
      admin_name: adminName,
      admin_id: userId,
      trans_date: new Date().toISOString(),
      request_by_role: driverRole
    };

    if (topupType === "bank_transfer") {
      const selectedBank = paymentMethods.find(pm => pm.account_number === selectedBankAccount);
      historiTransaksiData.proof_url = proofUrl;
      historiTransaksiData.payment_method = "Bank Transfer";
      historiTransaksiData.bank_name = selectedBank?.bank_name || "";
      historiTransaksiData.account_holder_received = selectedBank?.account_holder || "";
      historiTransaksiData.account_number = selectedBankAccount;
    }

    const { error: insertError } = await supabase
      .from("histori_transaksi")
      .insert(historiTransaksiData);

    if (insertError) {
      console.error("Error inserting to histori_transaksi:", insertError);
      throw insertError;
    }

    // 5. Update driver saldo hanya untuk Manual
    if (topupType === "manual") {
      const { error: updateError } = await supabase
        .from("drivers")
        .update({ saldo: newSaldo })
        .eq("id", selectedDriverId);

      if (updateError) {
        console.error("Error updating driver saldo:", updateError);
        throw updateError;
      }

      // ✅ 6. Insert ke wallet_ledger untuk Manual Topup
      const { data: topupRequestData, error: fetchTopupError } = await supabase
        .from("topup_requests")
        .select("id")
        .eq("reference_no", bookingCode)
        .single();

      if (fetchTopupError) {
        console.error("Error fetching topup_request id:", fetchTopupError);
      } else if (topupRequestData) {
        const walletLedgerData = {
          user_id: selectedDriverId,
          ref_table: "topup_requests",
          ref_id: topupRequestData.id,
          entry_type: "topup",
          amount: amount,
          direction: "credit",
          balance_after: newSaldo,
          created_at: new Date().toISOString()
        };

        const { error: walletLedgerError } = await supabase
          .from("wallet_ledger")
          .insert(walletLedgerData);

        if (walletLedgerError) {
          console.error("Error inserting to wallet_ledger:", walletLedgerError);
          // Don't throw error, just log it
        }
      }
    }

    // Success toast
    const selectedDriver = drivers.find(d => d.id === selectedDriverId);
    toast({
      title: "Success",
      description: topupType === "manual" 
        ? `Manual top-up of Rp ${amount.toLocaleString()} for ${selectedDriver?.full_name || 'driver'} has been processed. Booking Code: ${bookingCode}`
        : `Bank transfer request of Rp ${amount.toLocaleString()} for ${selectedDriver?.full_name || 'driver'} has been submitted. Booking Code: ${bookingCode}`,
    });

    // Reset form & close modal
    setIsManualTopupModalOpen(false);
    setSelectedDriverId("");
    setManualTopupAmount("");
    setManualTopupNote("");
    setDriverSearchOpen(false);
    setDriverSearchValue("");
    setTopupType("manual");
    setSelectedBankAccount("");
    setProofFile(null);

    // Refresh data
    await fetchData();
  } catch (error) {
    console.error("Error processing topup:", error);
    toast({
      title: "Error",
      description: "Failed to process top-up",
      variant: "destructive",
    });
  } finally {
    setIsTopupProcessing(false);
  }
};

  const openManualTopupModal = () => {
    setSelectedDriverId("");
    setManualTopupAmount("");
    setManualTopupNote("");
    setDriverSearchOpen(false);
    setDriverSearchValue("");
    setTopupType("manual");
    setSelectedBankAccount("");
    setProofFile(null);
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
        .includes(searchTerm.toLowerCase()) ||
      (request.driver_phone || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.reference_no || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesDateRange = true;
    if (startDate || endDate) {
      const requestDate = new Date(request.created_at)
        .toISOString()
        .split("T")[0];
      
      if (startDate && endDate) {
        matchesDateRange = requestDate >= startDate && requestDate <= endDate;
      } else if (startDate) {
        matchesDateRange = requestDate >= startDate;
      } else if (endDate) {
        matchesDateRange = requestDate <= endDate;
      }
    }

    return matchesSearch && matchesDateRange;
  });

  const filteredHistoryRequests = historyRequests.filter((request) => {
    const matchesSearch = 
      (request.user_full_name || request.driver_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.user_email || request.driver_email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.driver_phone || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.reference_no || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesDateRange = true;
    if (startDate || endDate) {
      const requestDate = new Date(request.created_at)
        .toISOString()
        .split("T")[0];
      
      if (startDate && endDate) {
        matchesDateRange = requestDate >= startDate && requestDate <= endDate;
      } else if (startDate) {
        matchesDateRange = requestDate >= startDate;
      } else if (endDate) {
        matchesDateRange = requestDate <= endDate;
      }
    }

    let matchesStatus = true;
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "approved") {
        matchesStatus = request.status === "verified" || request.status === "approved";
      } else if (statusFilter === "rejected") {
        matchesStatus = request.status === "rejected";
      }
    }

    return matchesSearch && matchesDateRange && matchesStatus;
  });

  // ✅ Pagination logic for History tab
  const totalHistoryPages = Math.ceil(filteredHistoryRequests.length / rowsPerPage);
  const startIndexHistory = (currentPageHistory - 1) * rowsPerPage;
  const paginatedHistoryRequests = filteredHistoryRequests.slice(startIndexHistory, startIndexHistory + rowsPerPage);

  // ✅ Pagination logic for Admin Topup tab
  const totalAdminPages = Math.ceil(filteredAdminTopupHistory.length / rowsPerPage);
  const startIndexAdmin = (currentPageAdmin - 1) * rowsPerPage;
  const paginatedAdminTopupHistory = filteredAdminTopupHistory.slice(startIndexAdmin, startIndexAdmin + rowsPerPage);

  // ✅ Calculate filtered totals
  const filteredApprovedAmount = filteredHistoryRequests
    .filter(r => r.status === "verified" || r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);
  
  const filteredRejectedAmount = filteredHistoryRequests
    .filter(r => r.status === "rejected")
    .reduce((sum, r) => sum + r.amount, 0);

  const filteredApprovedCount = filteredHistoryRequests.filter(r => r.status === "verified" || r.status === "approved").length;
  const filteredRejectedCount = filteredHistoryRequests.filter(r => r.status === "rejected").length;

  // Calculate statistics
  const totalPendingRequests = pendingRequests.length;
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const totalApprovedRequests = historyRequests.filter(r => r.status === "verified" || r.status === "approved").length;
  const totalApprovedAmount = historyRequests
    .filter(r => r.status === "verified" || r.status === "approved")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalRejectedRequests = historyRequests.filter(r => r.status === "rejected").length;

  const formatPaymentMethod = (method?: string) => {
  if (!method) return "-";
  switch (method.toLowerCase()) {
    case "bank_transfer":
      return "Bank Transfer";
    case "ewallet":
      return "E-Wallet";
    case "cash":
      return "Cash";
    default:
      // ubah snake_case ke Capitalized
      return method.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
};


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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                placeholder="Start date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">End Date</Label>
              <Input
                type="date"
                placeholder="End date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {/* ✅ Status filter for History and Admin tabs */}
            {(activeTab === "history" || activeTab === "admin-topup") && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="By Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* ✅ Show filtered totals when status filter is applied */}
          {statusFilter && statusFilter !== "all" && activeTab === "history" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                {statusFilter === "approved" && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-green-600">Filtered Approved Count</p>
                      <p className="text-2xl font-bold text-green-600">{filteredApprovedCount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-600">Filtered Approved Amount</p>
                      <p className="text-2xl font-bold text-green-600">Rp {filteredApprovedAmount.toLocaleString()}</p>
                    </div>
                  </>
                )}
                {statusFilter === "rejected" && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-red-600">Filtered Rejected Count</p>
                      <p className="text-2xl font-bold text-red-600">{filteredRejectedCount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-600">Filtered Rejected Amount</p>
                      <p className="text-2xl font-bold text-red-600">Rp {filteredRejectedAmount.toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {(searchTerm || startDate || endDate || (statusFilter && statusFilter !== "all")) && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                  setStatusFilter("all");
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
                          <TableCell colSpan={8} className="text-center py-8">
                            {loading
                              ? "Loading..."
                              : searchTerm || startDate || endDate
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
  {formatPaymentMethod(request.payment_method)}
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
                        <TableHead>Topup Code1</TableHead>
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
                      {paginatedHistoryRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            {loading
                              ? "Loading..."
                              : searchTerm || startDate || endDate || statusFilter
                                ? "No history matches your filters"
                                : "No history found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedHistoryRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm">
                              {request.reference_no || request.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
  <div className="flex flex-col">
    <span className="font-medium">{request.name}</span>
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
  {formatPaymentMethod(request.payment_method)}
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
    {request.admin_name ? (
      <>
        <span className="font-medium text-gray-900">{request.admin_name}</span>
        <span className="text-sm text-gray-500">{request.admin_email}</span>
      </>
    ) : (
      <span className="text-gray-400 italic">Unknown Admin</span>
    )}
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
            
            {/* ✅ Pagination for History tab */}
            {!loading && filteredHistoryRequests.length > 0 && (
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows per page:</span>
                    <Select value={rowsPerPage.toString()} onValueChange={(value) => {
                      setRowsPerPage(Number(value));
                      setCurrentPageHistory(1);
                    }}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {startIndexHistory + 1}-{Math.min(startIndexHistory + rowsPerPage, filteredHistoryRequests.length)} of {filteredHistoryRequests.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageHistory(Math.max(1, currentPageHistory - 1))}
                      disabled={currentPageHistory === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageHistory(Math.min(totalHistoryPages, currentPageHistory + 1))}
                      disabled={currentPageHistory === totalHistoryPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
                        <TableHead>Driver Email</TableHead>
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
                      {paginatedAdminTopupHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            {loading
                              ? "Loading..."
                              : searchTerm || startDate
                                ? "No admin topups match your filters"
                                : "No admin topups found"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedAdminTopupHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {item.code_booking}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {item.driver_name || "Unknown Driver"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                {item.driver_email || "Unknown"}
                              </span>
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
                                    payment_method: "Manual Admin Topup",
                                    bank_name: null,
                                    status: "verified",
                                    created_at: item.trans_date || new Date().toISOString(),
                                    verified_at: item.trans_date,
                                    verified_by: null,
                                    note: item.jenis_transaksi,
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
            
            {/* ✅ Pagination for Admin Topup tab */}
            {!loading && filteredAdminTopupHistory.length > 0 && (
              <div className="px-6 py-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows per page:</span>
                    <Select value={rowsPerPage.toString()} onValueChange={(value) => {
                      setRowsPerPage(Number(value));
                      setCurrentPageAdmin(1);
                    }}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {startIndexAdmin + 1}-{Math.min(startIndexAdmin + rowsPerPage, filteredAdminTopupHistory.length)} of {filteredAdminTopupHistory.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageAdmin(Math.max(1, currentPageAdmin - 1))}
                      disabled={currentPageAdmin === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPageAdmin(Math.min(totalAdminPages, currentPageAdmin + 1))}
                      disabled={currentPageAdmin === totalAdminPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
                    {selectedRequest.name}
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
                    {selectedRequest.driver_email}
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
                        {selectedRequest.admin_name || "Unknown"}
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
                    {selectedRequest.payment_method || "-"}
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
        <DialogContent className="sm:max-w-[720px] w-full max-h-[90vh] overflow-y-auto px-6 py-4 rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle>Manual Top-Up Driver</DialogTitle>
            <DialogDescription>
              Create a manual top-up for a driver. This will immediately add the amount to their balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* ✅ Type Topup Selection */}
            <div className="grid gap-2">
              <Label>Type Topup *</Label>
              <RadioGroup
                value={topupType}
                onValueChange={(value: "manual" | "bank_transfer") => setTopupType(value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="type-manual" />
                  <Label htmlFor="type-manual" className="cursor-pointer font-normal">
                    Manual
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bank_transfer" id="type-bank" />
                  <Label htmlFor="type-bank" className="cursor-pointer font-normal">
                    Bank Transfer
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="driverSelect">Select Driver *</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setDriverSearchOpen(!driverSearchOpen)}
                  className="w-full justify-between"
                  disabled={isTopupProcessing}
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
              <Label htmlFor="amount">Top-up Amount (Rp) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount..."
                value={manualTopupAmount}
                onChange={(e) => setManualTopupAmount(e.target.value)}
                min="1"
                disabled={isTopupProcessing}
              />
            </div>

            {/* ✅ Bank Transfer Fields */}
            {topupType === "bank_transfer" && (
              <>
                <div className="grid gap-2">
                  <Label>Bank Penerima *</Label>
                  <RadioGroup
                    value={selectedBankAccount}
                    onValueChange={(value) => setSelectedBankAccount(value)}
                    className="space-y-3"
                    disabled={isTopupProcessing}
                  >
                    {paymentMethods.map((payment_method, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem
                          value={payment_method.account_number}
                          id={`bank-${index}`}
                        />
                        <Label
                          htmlFor={`bank-${index}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          <div className="font-medium">
                            {payment_method.bank_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payment_method.account_number} -{" "}
                            {payment_method.account_holder}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="proofFile">Bukti Transfer *</Label>
                  <Input
                    id="proofFile"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setProofFile(file);
                      }
                    }}
                    disabled={isTopupProcessing}
                  />
                  {proofFile && (
                    <p className="text-sm text-gray-600">
                      Selected: {proofFile.name}
                    </p>
                  )}
                </div>
              </>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="note">Description *</Label>
              <Textarea
                id="note"
                placeholder="Enter reason for top-up..."
                value={manualTopupNote}
                onChange={(e) => setManualTopupNote(e.target.value)}
                rows={3}
                disabled={isTopupProcessing}
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
                setTopupType("manual");
                setSelectedBankAccount("");
                setProofFile(null);
              }}
              disabled={isTopupProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualTopup}
              disabled={
                isTopupProcessing || 
                !selectedDriverId || 
                !manualTopupAmount || 
                !manualTopupNote.trim() ||
                (topupType === "bank_transfer" && (!selectedBankAccount || !proofFile))
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isTopupProcessing ? (
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
}