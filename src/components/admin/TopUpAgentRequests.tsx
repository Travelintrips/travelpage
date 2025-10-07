import React, { useEffect, useState, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Loader2,
  Eye,
  Check,
  X,
  Filter,
  Calendar,
  DollarSign,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Helper function to safely handle null/undefined values for string operations
const norm = (v: unknown) => (v ?? "").toString().toLowerCase();

interface TopUpRequest {
  id: string;
  reference_no: string;
  user_id: string | null;
  amount: number;
  method: string;
  bank_name: string | null;
  sender_name: string;
  sender_account: string;
  sender_bank: string | null;
  proof_url: string | null;
  status: "pending" | "verified" | "rejected";
  note: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: string | null;
  user_full_name?: string;
  user_email?: string;
  verified_by_name?: string;
}



const TopUpAgentRequests = () => {
  const [requests, setRequests] = useState<TopUpRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<TopUpRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Add refs to prevent duplicate fetches and track initialization
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const isInitialized = useRef(false);
  
  const [activeTab, setActiveTab] = useState("requests");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const [agentFilter, setAgentFilter] = useState<string>("");


  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TopUpRequest | null>(
    null,
  );
  const [verificationNote, setVerificationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const { userId, userRole } = useAuth();

  // FIXED: Single useEffect to handle all initialization logic with caching
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[TopUpAgentRequests] Already initialized, skipping...');
      return;
    }

    if (userId && userRole) {
      console.log('[TopUpAgentRequests] Auth ready, initializing component...');
      isInitialized.current = true;
      
      // Check for cached data first
      const cachedRequests = sessionStorage.getItem('topUpAgentRequests_cachedRequests');
      
      if (cachedRequests) {
        try {
          const parsedRequests = JSON.parse(cachedRequests);
          
          if (parsedRequests && parsedRequests.length > 0) {
            setRequests(parsedRequests);
            console.log('[TopUpAgentRequests] Loaded cached data, NO LOADING SCREEN');
            
            // Background refresh to get latest data
            setTimeout(() => fetchRequests(true), 100);
            return;
          }
        } catch (error) {
          console.warn('[TopUpAgentRequests] Failed to parse cached data:', error);
        }
      }

      // Fetch data if no cache or cache is empty
      console.log('[TopUpAgentRequests] No cached data, fetching fresh data...');
      fetchRequests();
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryRequests();
    }
  }, [activeTab]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userId && userRole) {
        const now = Date.now();
        // Only refetch if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[TopUpAgentRequests] Tab became visible, doing background refresh...');
          fetchRequests(true);
          if (activeTab === "history") {
            fetchHistoryRequests(true);
          }
        } else {
          console.log('[TopUpAgentRequests] Skipping refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, userRole, activeTab]);

  // FIXED: Modified fetchRequests with caching and proper loading state management
  const fetchRequests = async (isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) {
      console.log('[TopUpAgentRequests] Requests fetch already in progress, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = Date.now();

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && requests.length === 0) {
        console.log('[TopUpAgentRequests] Showing loading spinner for initial load');
        setLoading(true);
      } else {
        console.log('[TopUpAgentRequests] Background refresh, no loading spinner');
      }

      const { data, error } = await supabase
        .from("topup_requests")
        .select("*")
        .eq("request_by_role", "Agent")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const requestData = (data ?? []).map((r: any) => ({
        ...r,
        // kolom dari view dengan default empty strings:
        user_full_name: r.user_full_name ?? "",
        user_email: r.user_email ?? "",
        verified_by_name: r.verifier_full_name ?? "",
        status: r.status ?? "",
        payment_method: r.payment_method ?? "",
        bank_name: r.bank_name ?? "",
        reference_no: r.reference_no ?? "",
        sender_name: r.sender_name ?? "",
        sender_account: r.sender_account ?? "",
        sender_bank: r.sender_bank ?? "",
      }));

      setRequests(requestData);
      
      // ✅ Cache the data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('topUpAgentRequests_cachedRequests', JSON.stringify(requestData));
        console.log('[TopUpAgentRequests] Requests data cached successfully');
      } catch (cacheError) {
        console.warn('[TopUpAgentRequests] Failed to cache requests data:', cacheError);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch top-up requests",
        variant: "destructive",
      });
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const fetchHistoryRequests = async () => {
    try {
      setHistoryLoading(true);

      console.log("[TopUpAgentRequests] Fetching history from v_topup_requests view...");

      // ✅ Fetch dari v_topup_requests view sesuai permintaan user
      const { data: historyData, error: historyError } = await supabase
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
        .eq("request_by_role", "Agent")
        .in("status", ["verified", "rejected"])
        .order("created_at", { ascending: false });

      if (historyError) {
        console.error("[TopUpAgentRequests] History error:", historyError);
        throw historyError;
      }

      console.log("[TopUpAgentRequests] Raw data from v_topup_requests:", historyData);
      console.log("[TopUpAgentRequests] Found", historyData?.length || 0, "Agent history records");

      // ✅ If no Agent data found, try alternative role names
      let finalHistoryData = historyData;
      if (!historyData || historyData.length === 0) {
        console.log("[TopUpAgentRequests] No 'Agent' data found, trying alternative role names...");
        
        const { data: altHistoryData, error: altHistoryError } = await supabase
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
          .or("request_by_role.eq.agent,request_by_role.ilike.%agent%")
          .in("status", ["verified", "rejected"])
          .order("created_at", { ascending: false });

        if (!altHistoryError && altHistoryData) {
          finalHistoryData = altHistoryData;
          console.log("[TopUpAgentRequests] Found alternative agent data:", altHistoryData.length);
        }
      }

      // ✅ Transform data sesuai dengan struktur v_topup_requests
      const transformedHistory = (finalHistoryData || []).map((request: any) => {
        return {
          id: request.id,
          reference_no: request.reference_no || `TOP-${request.id}`,
          user_id: request.user_id,
          amount: request.amount || 0,
          payment_method: request.payment_method || "bank_transfer",
          bank_name: request.bank_name || "BCA",
          sender_name: request.sender_name || request.user_full_name || "Unknown Sender",
          sender_account: request.sender_account || "-",
          sender_bank: request.sender_bank || "BCA",
          proof_url: request.proof_url,
          status: request.status,
          note: request.note,
          created_at: request.created_at,
          verified_at: request.verified_at || request.created_at,
          verified_by: request.verified_by,
          // ✅ Data langsung dari v_topup_requests view
          user_full_name: request.user_full_name || "Unknown Agent",
          user_email: request.user_email || "unknown@email.com",
          admin_full_name: request.admin_full_name || "System Admin",
          admin_email: request.admin_email || "system@admin.com",
          verified_by_name: request.admin_full_name || "System Admin",
        };
      });

      console.log("[TopUpAgentRequests] Final transformed history:", transformedHistory);
      setHistoryRequests(transformedHistory);

    } catch (error) {
      console.error("Error fetching history requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch top-up history",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc("verify_topup", {
        p_request_id: selectedRequest.id,
        p_note: verificationNote || null,
      });
      if (error) throw error;

      toast({
        title: "Success",
        description: "Top-up request verified successfully",
      });

      setIsVerifyModalOpen(false);
      setVerificationNote("");
      setSelectedRequest(null);
      fetchRequests();
      if (activeTab === "history") {
        fetchHistoryRequests();
      }
    } catch (error: any) {
      console.error("Error verifying request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !userId || !verificationNote.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc("reject_topup", {
        p_request_id: selectedRequest.id,
        p_admin: userId,
        p_reason: verificationNote,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Top-up request rejected successfully",
      });

      setIsVerifyModalOpen(false);
      setVerificationNote("");
      setSelectedRequest(null);
      fetchRequests();
      if (activeTab === "history") {
        fetchHistoryRequests();
      }
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyModal = (request: TopUpRequest) => {
    setSelectedRequest(request);
    setVerificationNote("");
    setIsVerifyModalOpen(true);
  };

  const openProofModal = (request: TopUpRequest) => {
    setSelectedRequest(request);
    setIsProofModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = (() => {
    const q = norm(searchTerm); // pastikan searchTerm default "" di useState
    const currentRequests = activeTab === "history" ? historyRequests : requests;
    return (currentRequests ?? []).filter((request: any) => {
      const matchesSearch =
        norm(request.reference_no).includes(q) ||
        norm(request.user_full_name).includes(q) ||
        norm(request.user_email).includes(q) ||
        norm(request.sender_name).includes(q);

      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;
      const matchesBank =
        bankFilter === "all" || request.bank_name === bankFilter;
      const matchesAgent =
        !agentFilter || norm(request.user_full_name).includes(norm(agentFilter));

      let matchesDate = true;
      if (dateFilter) {
        const requestDate = new Date(request.created_at)
          .toISOString()
          .split("T")[0];
        matchesDate = requestDate === dateFilter;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesBank &&
        matchesAgent &&
        matchesDate
      );
    });
  })();



  const allRequests = [...requests, ...historyRequests];
  const uniqueBanks = [
    ...new Set(allRequests.map((r) => r.bank_name).filter(Boolean)),
  ];
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const verifiedCount = historyRequests.filter((r) => r.status === "verified").length;
  const rejectedCount = historyRequests.filter((r) => r.status === "rejected").length;
  const totalAmount = historyRequests
    .filter((r) => r.status === "verified")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Top Up Agent Requests</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Top Up Agent Requests
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Topup History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* Current requests content */}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {verifiedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {rejectedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Verified Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold break-words">
              Rp {totalAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              placeholder="Agent"
              className="text-sm"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Banks</SelectItem>
                {uniqueBanks.map((bank) => (
                  <SelectItem key={bank} value={bank || ""}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Date"
              className="text-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Up Agent Requests</CardTitle>
          <CardDescription>
            Manage agent top-up requests and verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading requests...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px] text-xs font-medium">
                      Code/Ref
                    </TableHead>
                    <TableHead className="min-w-[140px] text-xs font-medium">
                      Agent
                    </TableHead>
                    <TableHead className="min-w-[100px] text-xs font-medium">
                      Amount
                    </TableHead>
                    <TableHead className="min-w-[120px] text-xs font-medium">
                      Method/Bank
                    </TableHead>
                    <TableHead className="min-w-[140px] text-xs font-medium">
                      Sender
                    </TableHead>
                    <TableHead className="min-w-[80px] text-xs font-medium">
                      Proof
                    </TableHead>
                    <TableHead className="min-w-[90px] text-xs font-medium">
                      Status
                    </TableHead>
                    <TableHead className="min-w-[120px] text-xs font-medium">
                      Created At
                    </TableHead>
                    <TableHead className="min-w-[140px] text-xs font-medium">
                      Verified By/At
                    </TableHead>
                    <TableHead className="min-w-[100px] text-xs font-medium">
                      Note
                    </TableHead>
                    <TableHead className="min-w-[80px] text-xs font-medium text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <span className="ml-2">Loading requests...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        No pending requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-xs p-2">
                          <div className="break-all">
                            {request.reference_no}
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex flex-col space-y-1">
                            <span
                              className="font-medium text-xs truncate max-w-[120px]"
                              title={request.sender_name}
                            >
                              {request.sender_name}
                            </span>
                            <span
                              className="text-xs text-gray-500 truncate max-w-[120px]"
                              title={request.user_email}
                            >
                              {request.user_email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs p-2">
                          <div className="whitespace-nowrap">
                            Rp {request.amount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs">{request.payment_method}</span>
                            {request.bank_name && (
                              <span
                                className="text-xs text-gray-500 truncate max-w-[100px]"
                                title={request.bank_name}
                              >
                                {request.bank_name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex flex-col space-y-1">
                            <span
                              className="font-medium text-xs truncate max-w-[120px]"
                              title={request.sender_name}
                            >
                              {request.sender_name}
                            </span>
                            {request.sender_bank && (
                              <span
                                className="text-xs text-gray-600 truncate max-w-[120px]"
                                title={request.sender_bank}
                              >
                                {request.sender_bank}
                              </span>
                            )}
                            <span
                              className="text-xs text-gray-500 truncate max-w-[120px]"
                              title={request.sender_account}
                            >
                              {request.sender_account}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          {request.proof_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openProofModal(request)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="text-xs whitespace-nowrap">
                            {new Date(request.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                year: "2-digit",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          {request.verified_at ? (
                            <div className="flex flex-col space-y-1">
                              <span
                                className="text-xs font-medium truncate max-w-[120px]"
                                title={request.verified_by_name || "Unknown"}
                              >
                                {request.verified_by_name || "Unknown"}
                              </span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {new Date(
                                  request.verified_at,
                                ).toLocaleDateString("id-ID", {
                                  year: "2-digit",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="p-2">
                          <div
                            className="text-xs truncate max-w-[80px]"
                            title={request.note || "-"}
                          >
                            {request.note || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex justify-center">
                            {request.status === "pending" && (userRole === "Super Admin" || userRole === "Admin" || userRole === "Staff Admin") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => openVerifyModal(request)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            )}
                          </div>
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

        <TabsContent value="history" className="space-y-6">
          {/* History requests content */}
          
          {/* Filters for History Tab */}
       {/*   <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Agent"
                  className="text-sm"
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                />
                <Input
                  placeholder="Admin Name"
                  className="text-sm"
                  value={adminNameFilter}
                  onChange={(e) => setAdminNameFilter(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bankFilter} onValueChange={setBankFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Banks</SelectItem>
                    {uniqueBanks.map((bank) => (
                      <SelectItem key={bank} value={bank || ""}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="Date"
                  className="text-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>*/}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Top-Up Request History
              </CardTitle>
              <CardDescription>
                View processed agent top-up requests (verified and rejected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] text-xs font-medium">
                          Code/Ref1
                        </TableHead>
                        <TableHead className="min-w-[140px] text-xs font-medium">
                          Agent
                        </TableHead>
                        <TableHead className="min-w-[100px] text-xs font-medium">
                          Amount
                        </TableHead>
                        <TableHead className="min-w-[120px] text-xs font-medium">
                          Method/Bank
                        </TableHead>
                        <TableHead className="min-w-[140px] text-xs font-medium">
                          Sender
                        </TableHead>
                        <TableHead className="min-w-[80px] text-xs font-medium">
                          Proof
                        </TableHead>
                        <TableHead className="min-w-[90px] text-xs font-medium">
                          Status
                        </TableHead>
                        <TableHead className="min-w-[120px] text-xs font-medium">
                          Created At
                        </TableHead>
                        <TableHead className="min-w-[140px] text-xs font-medium">
                          Verified By/At
                        </TableHead>
                        <TableHead className="min-w-[100px] text-xs font-medium">
                          Note
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            No history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-xs p-2">
                              <div className="break-all">
                                {request.reference_no}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="flex flex-col space-y-1">
                                <span
                                  className="font-medium text-xs truncate max-w-[120px]"
                                  title={request.user_full_name}
                                >
                                  {request.user_full_name}
                                </span>
                                <span
                                  className="text-xs text-gray-500 truncate max-w-[120px]"
                                  title={request.user_email}
                                >
                                  {request.user_email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-xs p-2">
                              <div className="whitespace-nowrap">
                                Rp {request.amount.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs">{request.method}</span>
                                {request.bank_name && (
                                  <span
                                    className="text-xs text-gray-500 truncate max-w-[100px]"
                                    title={request.bank_name}
                                  >
                                    {request.bank_name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="flex flex-col space-y-1">
                                <span
                                  className="font-medium text-xs truncate max-w-[120px]"
                                  title={request.sender_name}
                                >
                                  {request.sender_name}
                                </span>
                                {request.sender_bank && (
                                  <span
                                    className="text-xs text-gray-600 truncate max-w-[120px]"
                                    title={request.sender_bank}
                                  >
                                    {request.sender_bank}
                                  </span>
                                )}
                                <span
                                  className="text-xs text-gray-500 truncate max-w-[120px]"
                                  title={request.sender_account}
                                >
                                  {request.sender_account}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="p-2 text-center">
                              {request.proof_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => openProofModal(request)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="p-2">
                              {getStatusBadge(request.status)}
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="text-xs whitespace-nowrap">
                                {new Date(request.created_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    year: "2-digit",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              {request.verified_at ? (
                                <div className="flex flex-col space-y-1">
                                  <span
                                    className="text-xs font-medium truncate max-w-[120px]"
                                    title={request.admin_full_name || "Unknown"}
                                  >
                                    {request.admin_full_name || "Unknown"}
                                  </span>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {new Date(
                                      request.verified_at,
                                    ).toLocaleDateString("id-ID", {
                                      year: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="p-2">
                              <div
                                className="text-xs truncate max-w-[80px]"
                                title={request.note || "-"}
                              >
                                {request.note || "-"}
                              </div>
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

      {/* Verification Modal */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Verify Top-Up Request</DialogTitle>
            <DialogDescription>
              Review and verify the top-up request from{" "}
              {selectedRequest?.agent_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Request Code</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.reference_no}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm text-gray-600">
                    Rp {selectedRequest.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Agent</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.payment_method}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sender Name</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.sender_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sender Account</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.sender_account}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="note">Note/Reason</Label>
                <Textarea
                  id="note"
                  placeholder="Add a note or reason for verification/rejection"
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVerifyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button
              onClick={handleVerify}
              disabled={submitting}
              className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Modal */}
      <Dialog open={isProofModalOpen} onOpenChange={setIsProofModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Transfer Proof</DialogTitle>
            <DialogDescription>
              Transfer proof for request {selectedRequest?.reference_no}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest?.proof_url ? (
            <div className="flex justify-center">
              <img
                src={selectedRequest.proof_url}
                alt="Transfer proof"
                className="max-w-full h-auto max-h-96 rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No proof image available
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsProofModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopUpAgentRequests;