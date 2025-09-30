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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  History,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TopUpTransaction {
  id: string;
  user_id: string;
  reference_no: string | null;
  amount: number;
  method: string;
  status: string;
  created_at: string | null;
  verified_at: string | null;
  note: string | null;
  bank_name?: string | null;
  destination_account?: string | null;
  sender_account?: string | null;
  sender_bank?: string | null;
  sender_name?: string | null;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
}

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  saldo: number | null;
  role_name: string | null;
}

interface HistoriTransaksi {
  id: string;
  keterangan: string | null;
  code_booking: string;
  nominal: number;
  saldo_akhir: number;
  trans_date: string | null;
  user_id: string | null;
  admin_name: string | null;
  user_name: string | null;
  user_email: string | null;
}

const HistoryTopUp = () => {
  const [transactions, setTransactions] = useState<TopUpTransaction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [historiTransaksi, setHistoriTransaksi] = useState<HistoriTransaksi[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Add refs to prevent duplicate fetches and track initialization
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const isInitialized = useRef(false);
  
  const [activeTab, setActiveTab] = useState("history");
  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  const [adminNameFilter, setAdminNameFilter] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TopUpTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  // FIXED: Single useEffect to handle all initialization logic with caching
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[HistoryTopUp] Already initialized, skipping...');
      return;
    }

    console.log('[HistoryTopUp] Initializing component...');
    isInitialized.current = true;
    
    // Check for cached data first
    const cachedTransactions = sessionStorage.getItem('historyTopUp_cachedTransactions');
    const cachedAgents = sessionStorage.getItem('historyTopUp_cachedAgents');
    
    if (cachedTransactions && cachedAgents) {
      try {
        const parsedTransactions = JSON.parse(cachedTransactions);
        const parsedAgents = JSON.parse(cachedAgents);
        
        if (parsedTransactions && parsedAgents) {
          setTransactions(parsedTransactions);
          setAgents(parsedAgents);
          console.log('[HistoryTopUp] Loaded cached data, NO LOADING SCREEN');
          
          // Background refresh to get latest data
          setTimeout(() => {
            fetchTransactions(true);
            fetchAgents(true);
          }, 100);
          return;
        }
      } catch (error) {
        console.warn('[HistoryTopUp] Failed to parse cached data:', error);
      }
    }

    // Fetch data if no cache or cache is empty
    console.log('[HistoryTopUp] No cached data, fetching fresh data...');
    fetchTransactions();
    fetchAgents();
  }, []);

  useEffect(() => {
    if (activeTab === "topup-by-admin") {
      fetchHistoriTransaksi();
    }
  }, [activeTab]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        // Only refetch if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[HistoryTopUp] Tab became visible, doing background refresh...');
          fetchTransactions(true);
          fetchAgents(true);
          if (activeTab === "topup-by-admin") {
            fetchHistoriTransaksi(true);
          }
        } else {
          console.log('[HistoryTopUp] Skipping refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab]);

  // FIXED: Modified fetchTransactions with caching and proper loading state management
  const fetchTransactions = async (isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) {
      console.log('[HistoryTopUp] Transactions fetch already in progress, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = Date.now();

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && transactions.length === 0) {
        console.log('[HistoryTopUp] Showing loading spinner for initial load');
        setLoading(true);
      } else {
        console.log('[HistoryTopUp] Background refresh, no loading spinner');
      }

      // Fetch top-up requests without foreign key joins
      const { data: topupData, error: topupError } = await supabase
        .from("v_topup_requests")
        .select("*, bank_name, sender_account, sender_name")
        .order("created_at", { ascending: false });

      if (topupError) {
        console.error("Error fetching topup_requests:", topupError);
        throw topupError;
      }

      console.log("Fetched topup_requests data:", topupData);

      if (!topupData || topupData.length === 0) {
        console.log("No topup_requests data found");
        setTransactions([]);
        return;
      }

      // Get unique user IDs from top-up requests
      const userIds = [
        ...new Set(topupData.map((t) => t.user_id).filter(Boolean)),
      ];

      console.log("User IDs from topup_requests:", userIds);

      // Fetch user data separately
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, role, role_id")
        .in("id", userIds);

      if (userError) {
        console.error("Error fetching users:", userError);
        throw userError;
      }

      console.log("Fetched users data:", userData);

      // Get unique role IDs to fetch role names
      const roleIds = [
        ...new Set(userData?.map((u) => u.role_id).filter(Boolean) || []),
      ];

      console.log("Role IDs from users:", roleIds);

      // Fetch roles data separately if we have role IDs
      let rolesData = [];
      if (roleIds.length > 0) {
        const { data: rolesResult, error: rolesError } = await supabase
          .from("roles")
          .select("role_id, role_name")
          .in("role_id", roleIds);

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
        } else {
          rolesData = rolesResult || [];
        }
      }

      console.log("Fetched roles data:", rolesData);

      // Create a map of role data for quick lookup
      const roleMap = new Map();
      rolesData.forEach((role: any) => {
        roleMap.set(role.role_id, role);
      });

      // Create a map of user data for quick lookup
      const userMap = new Map();
      userData?.forEach((user: any) => {
        const role = roleMap.get(user.role_id);
        userMap.set(user.id, {
          ...user,
          role_name: role?.role_name || user.role || null,
        });
      });

      console.log("User map with roles:", Array.from(userMap.entries()));

      // Combine the data and filter for agents
      const transactionData = topupData
        .map((transaction: any) => {
          const user = userMap.get(transaction.user_id);
          return {
            ...transaction,
            agent_name: user?.full_name || "Unknown Agent",
            agent_email: user?.email || "Unknown",
            agent_phone: user?.phone_number || "-",
            user_role: user?.role_name || user?.role || null,
          };
        })
        .filter((transaction: any) => {
          // Filter for agents - check both role_name and role fields
          const isAgent =
            transaction.user_role === "Agent" ||
            transaction.user_role === "agent" ||
            (transaction.user_role &&
              transaction.user_role.toLowerCase().includes("agent"));
          console.log(
            `Transaction ${transaction.id}: user_role=${transaction.user_role}, isAgent=${isAgent}`,
          );
          return isAgent;
        });

      console.log("Final filtered transaction data:", transactionData);
      setTransactions(transactionData);
      
      // ✅ Cache the data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('historyTopUp_cachedTransactions', JSON.stringify(transactionData));
        console.log('[HistoryTopUp] Transactions data cached successfully');
      } catch (cacheError) {
        console.warn('[HistoryTopUp] Failed to cache transactions data:', cacheError);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent top-up history",
        variant: "destructive",
      });
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const fetchHistoriTransaksi = async () => {
  try {
    setLoading(true);

    // Fetch histori_transaksi data
    const { data: historiData, error: historiError } = await supabase
      .from("histori_transaksi")
      .select("*")
      .not("admin_id", "is", null)     // hanya ambil yang ada admin_id
      .not("admin_name", "is", null)   // hanya ambil yang ada admin_name
      .order("trans_date", { ascending: false });

    if (historiError) throw historiError;

    if (!historiData || historiData.length === 0) {
      setHistoriTransaksi([]);
      return;
    }

    // Get unique user IDs from histori_transaksi
    const userIds = [
      ...new Set(historiData.map((h) => h.user_id).filter(Boolean)),
    ];

    console.log("User IDs from histori_transaksi:", userIds);

    // Fetch user data separately if we have user IDs
    let userData = [];
    if (userIds.length > 0) {
      const { data: usersResult, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds);

      if (usersError) {
        console.error("Error fetching users for histori_transaksi:", usersError);
      } else {
        userData = usersResult || [];
      }
    }

    console.log("Fetched users for histori_transaksi:", userData);

    // Create a map of user data for quick lookup
    const userMap = new Map();
    userData.forEach((user: any) => {
      userMap.set(user.id, user);
    });

    // Combine the data
    const enrichedHistoriData = historiData.map((item: any) => {
      const user = userMap.get(item.user_id);
      return {
        ...item,
        user_name: user?.full_name || null,
        user_email: user?.email || null,
      };
    });

    console.log("Final enriched histori_transaksi data:", enrichedHistoriData);
    setHistoriTransaksi(enrichedHistoriData);
  } catch (error) {
    console.error("Error fetching histori transaksi:", error);
    toast({
      title: "Error",
      description: "Failed to fetch transaction history",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};


  const fetchAgents = async () => {
    try {
      // Fetch users without foreign key joins
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, saldo, role_id, role")
        .order("full_name", { ascending: true });

      if (usersError) {
        console.error("Error fetching users for agents:", usersError);
        throw usersError;
      }

      console.log("Fetched users for agents:", usersData);

      if (!usersData || usersData.length === 0) {
        setAgents([]);
        return;
      }

      // Get unique role IDs
      const roleIds = [
        ...new Set(usersData.map((u) => u.role_id).filter(Boolean)),
      ];

      console.log("Role IDs for agents:", roleIds);

      // Fetch roles data separately if we have role IDs
      let rolesData = [];
      if (roleIds.length > 0) {
        const { data: rolesResult, error: rolesError } = await supabase
          .from("roles")
          .select("role_id, role_name")
          .in("role_id", roleIds);

        if (rolesError) {
          console.error("Error fetching roles for agents:", rolesError);
        } else {
          rolesData = rolesResult || [];
        }
      }

      console.log("Fetched roles for agents:", rolesData);

      // Create a map of role data for quick lookup
      const roleMap = new Map();
      rolesData.forEach((role: any) => {
        roleMap.set(role.role_id, role);
      });

      // Filter for Agent role only
      const agentData = usersData
        .map((user: any) => {
          const role = roleMap.get(user.role_id);
          return {
            ...user,
            role_name: role?.role_name || user.role || null,
          };
        })
        .filter((user: any) => {
          // Filter for agents - check both role_name and role fields
          const isAgent =
            user.role_name === "Agent" ||
            user.role_name === "agent" ||
            user.role === "Agent" ||
            user.role === "agent" ||
            (user.role_name &&
              user.role_name.toLowerCase().includes("agent")) ||
            (user.role && user.role.toLowerCase().includes("agent"));
          return isAgent;
        });

      console.log("Filtered agent data:", agentData);
      setAgents(agentData);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const openDetailModal = (transaction: TopUpTransaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "verified":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <ArrowUpCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
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

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      (transaction.reference_no || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (transaction.agent_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (transaction.agent_email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (transaction.note || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAgent =
      !agentFilter ||
      (transaction.agent_name || "")
        .toLowerCase()
        .includes(agentFilter.toLowerCase());

    let matchesDate = true;
    if (dateFilter) {
      const transactionDate = new Date(transaction.created_at || "")
        .toISOString()
        .split("T")[0];
      matchesDate = transactionDate === dateFilter;
    }

    let matchesAmount = true;
    if (amountFilter) {
      const filterAmount = parseFloat(amountFilter);
      if (!isNaN(filterAmount)) {
        matchesAmount = transaction.amount >= filterAmount;
      }
    }

    return matchesSearch && matchesAgent && matchesDate && matchesAmount;
  });

  // Helper function to safely handle null/undefined values for string operations
  const norm = (v: unknown) => (v ?? "").toString().toLowerCase();

  const filteredHistoriTransaksi = (() => {
    const q = norm(searchTerm);
    return (historiTransaksi ?? []).filter((item: HistoriTransaksi) => {
      const matchesSearch =
        norm(item.code_booking).includes(q) ||
        norm(item.keterangan).includes(q) ||
        norm(item.admin_name).includes(q);

      const matchesAdminName =
        !adminNameFilter || norm(item.admin_name).includes(norm(adminNameFilter));

      let matchesDate = true;
      if (dateFilter && item.trans_date) {
        const transDate = new Date(item.trans_date)
          .toISOString()
          .split("T")[0];
        matchesDate = transDate === dateFilter;
      }

      return matchesSearch && matchesAdminName && matchesDate;
    });
  })();

  // Calculate statistics
  const totalTransactions = transactions.length;
  const approvedTransactions = transactions.filter(
    (t) =>
      t.status.toLowerCase() === "approved" ||
      t.status.toLowerCase() === "verified",
  );
  const pendingTransactions = transactions.filter(
    (t) => t.status.toLowerCase() === "pending",
  );
  const rejectedTransactions = transactions.filter(
    (t) => t.status.toLowerCase() === "rejected",
  );

  const totalApprovedAmount = approvedTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const totalPendingAmount = pendingTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const totalRejectedAmount = rejectedTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );
  const uniqueAgents = new Set(transactions.map((t) => t.user_id)).size;

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTransactions = transactions.filter(
    (t) => new Date(t.created_at || "") >= thirtyDaysAgo,
  );
  const recentApprovedAmount = recentTransactions
    .filter(
      (t) =>
        t.status.toLowerCase() === "approved" ||
        t.status.toLowerCase() === "verified",
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">History Top Up</h1>
          <p className="text-gray-600 mt-2">
            View detailed history of top-up requests created by agents
          </p>
        </div>
        <Button
          onClick={fetchTransactions}
          className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
        >
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Topup History Agent
          </TabsTrigger>
          <TabsTrigger value="topup-by-admin" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Topup Agent By Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Amount
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Amount
            </CardTitle>
            <Activity className="h-4 w-4 text-yellow-600" />
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
              Rejected Amount
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rp {totalRejectedAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total rejected amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Agent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Agents:</span>
                <span className="font-medium">{uniqueAgents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg per Agent:</span>
                <span className="font-medium">
                  Rp{" "}
                  {uniqueAgents > 0
                    ? Math.round(
                        totalApprovedAmount / uniqueAgents,
                      ).toLocaleString()
                    : "0"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Transactions:</span>
                <span className="font-medium">{recentTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-medium text-green-600">
                  Rp {recentApprovedAmount.toLocaleString()}
                </span>
              </div>
            </div>
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
                placeholder="Search transactions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              placeholder="Filter by agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            />
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
          {(searchTerm || agentFilter || dateFilter || amountFilter) && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setAgentFilter("");
                  setDateFilter("");
                  setAmountFilter("");
                }}
              >
                Clear Filters
              </Button>
              <span className="text-sm text-gray-600 self-center">
                Showing {filteredTransactions.length} of {totalTransactions}{" "}
                transactions
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Topup History</CardTitle>
          <CardDescription>
            Detailed history of top-up requests created by agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading transaction history...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status1</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        {loading
                          ? "Loading..."
                          : searchTerm ||
                              agentFilter ||
                              dateFilter ||
                              amountFilter
                            ? "No transactions match your filters"
                            : "No transactions found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.reference_no || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {transaction.agent_name}
                            </span>
                            <span className="text-sm text-gray-500">
                              {transaction.agent_email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            Rp {transaction.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                        <span>{transaction.payment_method? transaction.payment_method.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()): "N/A"}</span>
                        <span>{transaction.bank_name || "N/A"}</span>
                        <span>{transaction.account_number}</span>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="truncate"
                            title={transaction.note || "-"}
                          >
                            {transaction.note || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.created_at
                            ? new Date(
                                transaction.created_at,
                              ).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(transaction)}
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

      {/* Transaction Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Top-Up Request Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected top-up request
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Code</Label>
                  <p className="text-sm text-gray-600 font-mono">
                    {selectedTransaction.reference_no || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Agent Name</Label>
                  <p className="text-sm text-gray-600">
                    {selectedTransaction.agent_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Agent Email</Label>
                  <p className="text-sm text-gray-600">
                    {selectedTransaction.agent_email}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Agent Phone</Label>
                  <p className="text-sm text-gray-600">
                    {selectedTransaction.agent_phone}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Request Date</Label>
                  <p className="text-sm text-gray-600">
                    {selectedTransaction.created_at
                      ? new Date(selectedTransaction.created_at).toLocaleString(
                          "id-ID",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          },
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Amount</Label>
                    <p className="text-lg font-bold text-green-600">
                      Rp {selectedTransaction.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Method</Label>
                    <p className="text-lg font-bold">
                      {selectedTransaction.method}
                    </p>
                  </div>
                </div>
              </div>

              {selectedTransaction.verified_at && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Verified Date</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedTransaction.verified_at).toLocaleString(
                      "id-ID",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )}
                  </p>
                </div>
              )}

              {/* Bank Information Section */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Bank Penerima</Label>
                    <p className="text-sm text-gray-600">
                      {selectedTransaction.bank_name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Destination Account
                    </Label>
                    <p className="text-sm text-gray-600 font-mono">
                      {selectedTransaction.destination_account || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sender Bank</Label>
                    <p className="text-sm text-gray-600">
                      {selectedTransaction.sender_bank ||
                        selectedTransaction.bank_name ||
                        "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Sender Account
                    </Label>
                    <p className="text-sm text-gray-600 font-mono">
                      {selectedTransaction.sender_account || "-"}
                    </p>
                  </div>

                  {/*{" "}
                  {selectedTransaction.sender_name && (
                    <div className="col-span-2">
                      <Label className="text-sm font-medium">Sender Name</Label>
                      <p className="text-sm text-gray-600">
                        {selectedTransaction.sender_name}
                      </p>
                    </div>
                  )}{" "}
                  */}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Note</Label>
                <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedTransaction.note || "No note provided"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="topup-by-admin" className="space-y-6">
          {/* Topup By Admin content */}
          
          {/* Filters for Topup By Admin Tab */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                  placeholder="Admin Name"
                  className="text-sm"
                  value={adminNameFilter}
                  onChange={(e) => setAdminNameFilter(e.target.value)}
                />
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
          
          {/* Histori Transaksi Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Topup By Admin
              </CardTitle>
              <CardDescription>
                Transaction history Topup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading transaction history...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] text-xs font-medium">
                          Code Topup
                        </TableHead>
                        <TableHead className="min-w-[140px] text-xs font-medium">
                          Recipient User/Agent
                        </TableHead>
                        <TableHead className="min-w-[100px] text-xs font-medium">
                          Nominal
                        </TableHead>
                        <TableHead className="min-w-[100px] text-xs font-medium">
                          Ending Balance
                        </TableHead>
                        <TableHead className="min-w-[140px] text-xs font-medium">
                          Admin Name
                        </TableHead>
                        <TableHead className="min-w-[120px] text-xs font-medium">
                          Date & Time
                        </TableHead>
                        <TableHead className="min-w-[200px] text-xs font-medium">
                          Description
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistoriTransaksi.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No transaction history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistoriTransaksi.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs p-2">
                              <div className="break-all">
                                {item.code_booking}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="flex flex-col">
                                <span
                                  className="text-xs font-medium truncate max-w-[120px]"
                                  title={item.user_name || item.user_id || "-"}
                                >
                                  {item.user_name || "-"}
                                </span>
                                {item.user_email && (
                                  <span
                                    className="text-xs text-gray-500 truncate max-w-[120px]"
                                    title={item.user_email}
                                  >
                                    {item.user_email}
                                  </span>
                                )}
                                {!item.user_name && item.user_id && (
                                  <span
                                    className="text-xs text-gray-400 font-mono truncate max-w-[120px]"
                                    title={item.user_id}
                                  >
                                    ID: {item.user_id}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-xs p-2">
                              <div className="whitespace-nowrap">
                                Rp {item.nominal.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-xs p-2">
                              <div className="whitespace-nowrap">
                                Rp {item.saldo_akhir.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <span
                                className="text-xs truncate max-w-[120px]"
                                title={item.admin_name || "-"}
                              >
                                {item.admin_name || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="text-xs whitespace-nowrap">
                                {item.trans_date
                                  ? new Date(item.trans_date).toLocaleDateString(
                                      "id-ID",
                                      {
                                        year: "2-digit",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "-"}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div
                                className="text-xs truncate max-w-[180px]"
                                title={item.keterangan || "-"}
                              >
                                {item.keterangan || "-"}
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
    </div>
  );
};

export default HistoryTopUp;