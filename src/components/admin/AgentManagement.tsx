import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  Loader2,
  User,
  MapPin,
  MoreHorizontal,
  UserCheck,
  UserX,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building,
  Users,
  DollarSign,
  Percent,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Agent {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  status?: string;
  last_login?: string;
  total_bookings?: number;
  total_revenue?: number;
  commission_rate?: number;
  saldo?: number;
  membership_status?: string;
  member_is_active?: boolean;
  discount_percentage?: number;
  account_type?: string;
  nama_perusahaan?: string;
  handling_discount_active?: boolean;
  handling_discount_value?: number; // Changed from percentage to value (nominal)
}

const AgentManagement = () => {
  const { userName, userRole } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [paginatedAgents, setPaginatedAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Add refs to prevent duplicate fetches and track initialization
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const isInitialized = useRef(false);
  const logsFetched = useRef(false);
  const transactionsFetched = useRef(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusToggleLoading, setStatusToggleLoading] = useState<string | null>(
    null,
  );
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [agentToSuspend, setAgentToSuspend] = useState<Agent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    nama_perusahaan: "",
  });
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [membershipForm, setMembershipForm] = useState({
    agent_id: "",
    start_date: "",
    end_date: "",
    discount_percentage: 0,
    status: "inactive",
  });
  const [handlingDiscountDialogOpen, setHandlingDiscountDialogOpen] = useState(false);
  const [handlingDiscountForm, setHandlingDiscountForm] = useState({
    agent_id: "",
    discount_value: 0, // Changed from discount_percentage to discount_value (nominal)
    is_active: false,
  });
  const [activeTab, setActiveTab] = useState("agents");
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const { isAdmin, userId } = useAuth();

  // Check if user is Super Admin
  const isSuperAdmin = userRole === "Super Admin";
  const { toast } = useToast();

  // Calculate pagination info
  const totalPages = Math.ceil(filteredAgents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredAgents.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const toggleRowExpansion = (agentId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(agentId)) {
      newExpandedRows.delete(agentId);
    } else {
      newExpandedRows.add(agentId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Filter effect
  useEffect(() => {
    let filtered = agents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (agent) =>
          agent.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (agent.phone_number || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredAgents(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [agents, searchTerm]);

  // Pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPaginatedAgents(filteredAgents.slice(startIndex, endIndex));
  }, [filteredAgents, currentPage, pageSize]);

  // FIXED: Add useEffect to fetch data when tab changes
  useEffect(() => {
    if (activeTab === "logs" && !logsFetched.current && !logsLoading) {
      console.log('[AgentManagement] Logs tab activated, fetching agent logs...');
      logsFetched.current = true;
      fetchAgentLogs();
    } else if (activeTab === "transactions" && !transactionsFetched.current && !transactionLoading) {
      console.log('[AgentManagement] Transactions tab activated, fetching transaction history...');
      transactionsFetched.current = true;
      fetchTransactionHistory();
    }
  }, [activeTab]);

  // FIXED: Single useEffect to handle all initialization logic with caching
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[AgentManagement] Already initialized, skipping...');
      return;
    }

    if (isAdmin || userRole) {
      console.log('[AgentManagement] Auth ready, initializing component...');
      isInitialized.current = true;
      
      // Check for cached data first
      const cachedData = sessionStorage.getItem('agentManagement_cachedAgents');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && parsedData.length > 0) {
            setAgents(parsedData);
            console.log('[AgentManagement] Loaded cached data, NO LOADING SCREEN');
            
            // Background refresh to get latest data
            setTimeout(() => fetchAgents(true), 100);
            return;
          }
        } catch (error) {
          console.warn('[AgentManagement] Failed to parse cached data:', error);
        }
      }

      // Fetch data if no cache or cache is empty
      console.log('[AgentManagement] No cached data, fetching fresh data...');
      fetchAgents();
    }
  }, [isAdmin, userRole]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (isAdmin || userRole)) {
        const now = Date.now();
        // Only refetch if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[AgentManagement] Tab became visible, doing background refresh...');
          fetchAgents(true); // Background refresh without loading spinner
        } else {
          console.log('[AgentManagement] Skipping refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAdmin, userRole]);

  // FIXED: Modified fetchAgents with caching and proper loading state management
  const fetchAgents = async (isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) {
      console.log('[AgentManagement] Fetch already in progress, skipping...');
      return;
    }

    // Additional check: don't fetch if we just fetched recently (less than 5 seconds ago)
    const now = Date.now();
    if (now - lastFetchTime.current < 5000 && agents.length > 0) {
      console.log('[AgentManagement] Recent fetch detected, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = now;

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && agents.length === 0) {
        console.log('[AgentManagement] Showing loading spinner for initial load');
        setLoading(true);
      } else {
        console.log('[AgentManagement] Background refresh, no loading spinner');
      }

      setIsFetching(true);
      console.log("Fetching agents...");

      // Fetch agents directly from users table with role = 'agent' OR role_id = 11
      const { data: agentsData, error } = await supabase
        .from("users")
        .select(
          `
          id,
          created_at,
          full_name,
          email,
          phone_number,
          nama_perusahaan,
          account_type,
          status,
          saldo,
          role,
          handling_discount_active,
          handling_discount_value
        `
        )
        .or("role.eq.Agent,role_id.eq.11")
        .order("created_at", { ascending: false });

      // Fetch active memberships to get discount percentages and membership status
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select("agent_id, discount_percentage, is_active")
        .eq("status", "active")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching agents:", error);
        throw error;
      }

      console.log("Fetched agents:", agentsData);

      if (!agentsData || agentsData.length === 0) {
        console.log("No agents found in database");
        setAgents([]);
        return;
      }

      // Calculate total bookings and revenue for each agent
      const agentsWithStats = await Promise.all(
        agentsData.map(async (agent) => {
          let totalBookings = 0;
          let totalRevenue = 0;

          try {
            // Get bookings from bookings_trips table which has user_id for the agent
            const bookingsTripsResult = await supabase
              .from("bookings_trips")
              .select("id, total_amount, total_price", { count: "exact" })
              .eq("user_id", agent.id);

            // Get airport transfer bookings where this agent is involved
            const airportTransferResult = await supabase
              .from("airport_transfer")
              .select("id, price", { count: "exact" })
              .or(`customer_id.eq.${agent.id},driver_id.eq.${agent.id}`);

            // Get baggage bookings where this agent is involved
            const baggageBookingResult = await supabase
              .from("baggage_booking")
              .select("id, total_amount", { count: "exact" })
              .eq("user_id", agent.id);

            // Get handling bookings where this agent is involved
            const handlingBookingResult = await supabase
              .from("handling_bookings")
              .select("id, total_price", { count: "exact" })
              .eq("user_id", agent.id);

            // Get regular bookings where this agent is involved
            const regularBookingResult = await supabase
              .from("bookings")
              .select("id, total_amount", { count: "exact" })
              .eq("user_id", agent.id);

            // Calculate total bookings
            totalBookings =
              (bookingsTripsResult.count || 0) +
              (airportTransferResult.count || 0) +
              (baggageBookingResult.count || 0) +
              (handlingBookingResult.count || 0) +
              (regularBookingResult.count || 0);

            // Calculate total revenue
            const bookingsTripsRevenue =
              bookingsTripsResult.data?.reduce((sum, booking) => {
                return sum + (booking.total_amount || booking.total_price || 0);
              }, 0) || 0;

            const airportRevenue =
              airportTransferResult.data?.reduce(
                (sum, booking) => sum + (booking.price || 0),
                0,
              ) || 0;
            const baggageRevenue =
              baggageBookingResult.data?.reduce(
                (sum, booking) => sum + (booking.total_amount || 0),
                0,
              ) || 0;
            const handlingRevenue =
              handlingBookingResult.data?.reduce(
                (sum, booking) => sum + (booking.total_price || 0),
                0,
              ) || 0;
            const regularRevenue =
              regularBookingResult.data?.reduce(
                (sum, booking) => sum + (booking.total_amount || 0),
                0,
              ) || 0;

            totalRevenue =
              bookingsTripsRevenue +
              airportRevenue +
              baggageRevenue +
              handlingRevenue +
              regularRevenue;
          } catch (statsError) {
            console.error(
              `Error fetching stats for agent ${agent.id}:`,
              statsError,
            );
          }

          // Get membership status and discount percentage from memberships data
          const activeMembership = membershipsData?.find(m => m.agent_id === agent.id);
          const membershipStatus = activeMembership?.is_active ? "Active" : "Inactive";
          const discountPercentage = activeMembership?.discount_percentage || 0;

          // Get handling discount info from users table
          const handlingDiscountActive = agent.handling_discount_active || false;
          const handlingDiscountValue = agent.handling_discount_value || 0;

          // Get account_type and nama_perusahaan directly from agent data
          const rawAccountType = agent.account_type;
          const normalizedAccountType = rawAccountType ? rawAccountType.toLowerCase() : null;
          
          // Map account type for display
          let displayAccountType;
          if (normalizedAccountType === 'corporate') {
            displayAccountType = 'Corporate';
          } else if (normalizedAccountType === 'personal') {
            displayAccountType = 'Personal';
          } else {
            displayAccountType = null;
          }

          // Get company name directly from agent data
          const companyName = agent.nama_perusahaan || null;

          return {
            ...agent,
            status: agent.status || "active", // Use status from users table, fallback to active
            total_bookings: totalBookings,
            total_revenue: totalRevenue,
            commission_rate: 10, // Default 10%
            saldo: agent.saldo || 0,
            membership_status: membershipStatus,
            member_is_active: activeMembership?.is_active || false,
            discount_percentage: discountPercentage,
            account_type: displayAccountType,
            nama_perusahaan: companyName,
            handling_discount_active: handlingDiscountActive,
            handling_discount_value: handlingDiscountValue,
          };
        }),
      );

      setAgents(agentsWithStats);
      
      // ✅ Cache the data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('agentManagement_cachedAgents', JSON.stringify(agentsWithStats));
        console.log('[AgentManagement] Data cached successfully');
      } catch (cacheError) {
        console.warn('[AgentManagement] Failed to cache data:', cacheError);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      setIsFetching(false);
      fetchInProgress.current = false;
    }
  };

  const fetchAgentLogs = async () => {
    try {
      setLogsLoading(true);
      console.log("Fetching agent logs...");

      const { data: logsData, error } = await supabase
        .from("agent_logs")
        .select(`
          id,
          action,
          created_at,
          agent:agent_id(id, full_name, email),
          activator:activated_by(id, full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching agent logs:", error);
        throw error;
      }

      console.log("Fetched agent logs:", logsData);
      setAgentLogs(logsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent logs. Please try again.",
        variant: "destructive",
      });
      // Set empty array to prevent infinite retries
      setAgentLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      setTransactionLoading(true);
      console.log("Fetching transaction history...");

      // Get all agent IDs
      const agentIds = agents.map(agent => agent.id);
      
      if (agentIds.length === 0) {
        console.log("No agents found, setting empty transaction history");
        setTransactionHistory([]);
        return;
      }

      // Fetch transactions from multiple tables
      const [bookingsTrips, airportTransfers, baggageBookings, handlingBookings, regularBookings, historiTransaksi] = await Promise.all([
        // Bookings trips
        supabase
          .from("bookings_trips")
          .select(`
            id,
            created_at,
            total_amount,
            total_price,
            status,
            user:user_id(id, full_name, email)
          `)
          .in("user_id", agentIds)
          .order("created_at", { ascending: false }),
        
        // Airport transfers
        supabase
          .from("airport_transfer")
          .select(`
            id,
            created_at,
            price,
            status,
            customer:customer_id(id, full_name, email),
            driver:driver_id(id, full_name, email)
          `)
          .or(agentIds.map(id => `customer_id.eq.${id},driver_id.eq.${id}`).join(","))
          .order("created_at", { ascending: false }),
        
        // Baggage bookings
        supabase
          .from("baggage_booking")
          .select(`
            id,
            created_at,
            total_amount,
            status,
            user:user_id(id, full_name, email)
          `)
          .in("user_id", agentIds)
          .order("created_at", { ascending: false }),
        
        // Handling bookings
        supabase
          .from("handling_bookings")
          .select(`
            id,
            created_at,
            total_price,
            status,
            user:user_id(id, full_name, email)
          `)
          .in("user_id", agentIds)
          .order("created_at", { ascending: false }),
        
        // Regular bookings
        supabase
          .from("bookings")
          .select(`
            id,
            created_at,
            total_amount,
            status,
            user:user_id(id, full_name, email)
          `)
          .in("user_id", agentIds)
          .order("created_at", { ascending: false }),

        //histori transaksi
supabase
  .from("histori_transaksi")
  .select(`
    id,
    created_at,
    nominal,
    saldo_awal,
    saldo_akhir,
    jenis_transaksi,
    status,
    keterangan,
    code_booking,
    user:user_id(id, full_name, email)
  `)
  .in("user_id", agentIds)
  .order("created_at", { ascending: false })

         
      ]);

      // Combine all transactions
      const allTransactions = [
        ...(bookingsTrips.data || []).map(t => ({ ...t, type: "Trip Booking", amount: t.total_amount || t.total_price })),
        ...(airportTransfers.data || []).map(t => ({ ...t, type: "Airport Transfer", amount: t.price, user: t.customer || t.driver })),
        ...(baggageBookings.data || []).map(t => ({ ...t, type: "Baggage Booking", amount: t.total_amount })),
        ...(handlingBookings.data || []).map(t => ({ ...t, type: "Handling Service", amount: t.total_price })),
        ...(regularBookings.data || []).map(t => ({ ...t, type: "Regular Booking", amount: t.total_amount })),
        ...(historiTransaksi.data || []).map(t => ({
  ...t,
  type: t.keterangan || "Transaction History", // fallback kalau null
  amount: t.nominal
}))
      ];

      // Sort by created_at descending
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log("Fetched transaction history:", allTransactions);
      setTransactionHistory(allTransactions);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history. Please try again.",
        variant: "destructive",
      });
      // Set empty array to prevent infinite retries
      setTransactionHistory([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "destructive";
      case "confirmed":
        return "default";
      case "in_progress":
        return "secondary";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleActivateAgent = async (agentId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only Super Admin can perform this action.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(agentId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: "active" })
        .eq("id", agentId);

      if (error) throw error;

      // Insert log entry for activation
      const { error: logError } = await supabase
        .from("agent_logs")
        .insert({
          agent_id: agentId,
          activated_by: userId,
          action: "activate"
        });

      if (logError) {
        console.error("Error logging agent activation:", logError);
      }

      toast({
        title: "Success",
        description: "Agent has been activated successfully.",
      });

      // Refresh the agents list
      await fetchAgents();
    } catch (error) {
      console.error("Error activating agent:", error);
      toast({
        title: "Error",
        description: "Failed to activate agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateAgent = async (agentId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only Super Admin can perform this action.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(agentId);
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: "inactive" })
        .eq("id", agentId);

      if (error) throw error;

      // Insert log entry for deactivation
      const { error: logError } = await supabase
        .from("agent_logs")
        .insert({
          agent_id: agentId,
          activated_by: userId,
          action: "deactivate"
        });

      if (logError) {
        console.error("Error logging agent deactivation:", logError);
      }

      toast({
        title: "Success",
        description:
          "Agent has been deactivated successfully. They will not be able to login.",
      });

      // Refresh the agents list
      await fetchAgents();
    } catch (error) {
      console.error("Error deactivating agent:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setEditForm({
      full_name: agent.full_name || "",
      email: agent.email || "",
      phone_number: agent.phone_number || "",
      nama_perusahaan: agent.nama_perusahaan || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAgent) return;

    if (!isAdmin && userRole !== "Admin") {
      toast({
        title: "Access Denied",
        description: "Only Admin or Super Admin can perform this action.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(editingAgent.id);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone_number: editForm.phone_number,
          nama_perusahaan: editForm.nama_perusahaan,
        })
        .eq("id", editingAgent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent details have been updated successfully.",
      });

      setEditDialogOpen(false);
      setEditingAgent(null);
      // Refresh the agents list
      await fetchAgents();
    } catch (error) {
      console.error("Error updating agent:", error);
      toast({
        title: "Error",
        description: "Failed to update agent details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusToggle = async (agent: Agent) => {
  if (!userRole || !["Super Admin", "Admin", "Staff Admin"].includes(userRole)) {
    toast({
      title: "Access Denied",
      description: "Only Super Admin, Admin, and Staff Admin can perform this action.",
      variant: "destructive",
    });
    return;
  }

  // toggle langsung active <-> suspended
  const newStatus: "active" | "suspended" =
    agent.status === "active" ? "suspended" : "active";

  if (newStatus === "suspended") {
    setAgentToSuspend(agent);
    setSuspendDialogOpen(true);
    return;
  }

  await updateAgentStatus(agent, newStatus);
};

const updateAgentStatus = async (agent: Agent, newStatus: "active" | "suspended") => {
  if (!userRole || !["Super Admin", "Admin", "Staff Admin"].includes(userRole)) {
    toast({
      title: "Access Denied",
      description: "Only Super Admin, Admin, and Staff Admin can update agent status.",
      variant: "destructive",
    });
    return;
  }

  setStatusToggleLoading(agent.id);

  try {
    const statusValue = newStatus; // sudah konsisten "active" | "suspended"
    const targetId = (agent.id || "").trim();

    console.log("Updating agent status:", {
      agentId: targetId,
      agentEmail: agent.email,
      currentStatus: agent.status,
      newStatus: statusValue,
      userRole,
      userId,
      timestamp: new Date().toISOString(),
    });

    // 1) Coba update
    // 1) Coba update langsung
const { data: upd, error: updErr, status: httpStatus } = await supabase
  .from("users")
  .update({
    status: statusValue,
    updated_at: new Date().toISOString(),
  })
  .eq("id", targetId)
  .select("id, status, email, updated_at");

console.log("Supabase update raw result:", { upd, updErr, httpStatus });

if (updErr) {
  console.error("Supabase update error:", updErr);
  throw new Error(`Update failed: ${updErr.message}`);
}

// 2) Ambil row hasil update atau fallback cek ulang
let updatedRow:
  | { id: string; status: string; email?: string; updated_at?: string }
  | null = null;

if (upd && upd.length > 0) {
  updatedRow = upd[0];
} else {
  console.warn("Update returned no rows, doing fallback fetch…");

  const { data: checkUser, error: checkErr } = await supabase
    .from("users")
    .select("id, status, email, updated_at")
    .eq("id", targetId)
    .maybeSingle();

  if (checkErr) throw new Error(`User check failed: ${checkErr.message}`);
  if (!checkUser) throw new Error(`User with ID ${targetId} not found.`);
  updatedRow = checkUser;
}

// 3) Validasi hasil update
if ((updatedRow?.status || "").toLowerCase() !== statusValue.toLowerCase()) {
  console.warn("Status not reflected as expected.", {
    expected: statusValue,
    actual: updatedRow?.status,
  });
}


    // 4) Log
    const { error: logErr } = await supabase.from("agent_logs").insert({
      agent_id: targetId, // sama dengan users.id (dari view agent_users)
      activated_by: userId,
      action: newStatus === "active" ? "activate" : "suspend",
      created_at: new Date().toISOString(),
    });
    if (logErr) console.error("Error logging agent status change:", logErr);

    // 5) Update state UI
    setAgents((prev) =>
      prev.map((a) => (a.id === targetId ? { ...a, status: statusValue } : a)),
    );

    toast({
      title: "Success",
      description: `Agent ${agent.full_name} has been ${
        newStatus === "active" ? "activated" : "suspended"
      } successfully.`,
    });

    await fetchAgents();
  } catch (err: any) {
    console.error("Error updating agent status:", err);
    toast({
      title: "Error",
      description: `Failed to update agent status: ${err?.message ?? "Unknown error"}`,
      variant: "destructive",
    });
  } finally {
    setStatusToggleLoading(null);
  }
};

const handleConfirmSuspend = async () => {
  if (agentToSuspend) {
    await updateAgentStatus(agentToSuspend, "suspended");
    setSuspendDialogOpen(false);
    setAgentToSuspend(null);
  }
};

  const handleActivateMembership = async () => {
    if (!membershipForm.agent_id) {
      toast({
        title: "Error",
        description: "Please select an agent.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(membershipForm.agent_id);
    try {
      const newStatus = membershipForm.status === "active";
      const agentId = membershipForm.agent_id;

      // Execute both queries simultaneously
      const [membershipResult, logResult] = await Promise.all([
        // Update memberships table
        supabase
          .from("memberships")
          .upsert({
            agent_id: agentId,
            is_active: newStatus,
            start_date: newStatus ? new Date().toISOString() : (membershipForm.start_date || null),
            end_date: !newStatus ? new Date().toISOString() : (membershipForm.end_date || null),
            discount_percentage: membershipForm.discount_percentage,
            status: membershipForm.status,
            activated_by: userId,
            activated_at: new Date().toISOString(),
          }, {
            onConflict: "agent_id"
          }),
        
        // Insert log entry
        supabase
          .from("agent_logs")
          .insert({
            agent_id: agentId,
            activated_by: userId,
            action: newStatus ? "Membership Activated" : "Membership Deactivated",
            created_at: new Date().toISOString()
          })
      ]);

      if (membershipResult.error) throw membershipResult.error;
      if (logResult.error) {
        console.error("Error logging membership action:", logResult.error);
      }

      toast({
        title: "Success",
        description: `Agent membership has been ${newStatus ? "activated" : "deactivated"} successfully.`,
      });

      setMembershipDialogOpen(false);
      setMembershipForm({
        agent_id: "",
        start_date: "",
        end_date: "",
        discount_percentage: 0,
        status: "inactive",
      });
      
      // Refresh the agents list to show updated membership status
      await fetchAgents();
      
      // Refresh logs if we're on the logs tab
      if (activeTab === "logs") {
        await fetchAgentLogs();
      }
    } catch (error) {
      console.error("Error activating membership:", error);
      toast({
        title: "Error",
        description: "Failed to activate membership. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async (agentId: string, agentEmail: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only Super Admin can perform this action.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(agentId);
    try {
      // First, delete from users table
      const { error: usersError } = await supabase
        .from("users")
        .delete()
        .eq("id", agentId);

      if (usersError) throw usersError;

      // Delete from agent_users table if it exists
      const { error: agentUsersError } = await supabase
        .from("agent_users")
        .delete()
        .eq("user_id", agentId);

      // Don't throw error if agent_users table doesn't exist or no records found
      if (
        agentUsersError &&
        !agentUsersError.message.includes("does not exist")
      ) {
        console.warn("Error deleting from agent_users:", agentUsersError);
      }

      // Delete from Supabase Auth
      const { error: authError } =
        await supabase.auth.admin.deleteUser(agentId);

      if (authError) {
        console.warn("Error deleting from auth:", authError);
        // Continue even if auth deletion fails, as the user record is already deleted
      }

      toast({
        title: "Success",
        description: "Agent has been deleted successfully from all systems.",
      });

      // Refresh the agents list
      await fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        title: "Error",
        description: "Failed to delete agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateHandlingDiscount = async () => {
    if (!handlingDiscountForm.agent_id) {
      toast({
        title: "Error",
        description: "Please select an agent.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(handlingDiscountForm.agent_id);
    try {
      const agentId = handlingDiscountForm.agent_id;

      // Update users table with handling discount info
      const { error: userError } = await supabase
        .from("users")
        .update({
          handling_discount_active: handlingDiscountForm.is_active,
          handling_discount_value: handlingDiscountForm.discount_value, // Save as nominal value
        })
        .eq("id", agentId);

      if (userError) throw userError;

      // Insert log entry
      const { error: logError } = await supabase
        .from("agent_logs")
        .insert({
          agent_id: agentId,
          activated_by: userId,
          action: handlingDiscountForm.is_active ? "Handling Discount Activated" : "Handling Discount Deactivated",
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error("Error logging handling discount action:", logError);
      }

      toast({
        title: "Success",
        description: `Handling discount has been ${handlingDiscountForm.is_active ? "activated" : "deactivated"} successfully.`,
      });

      setHandlingDiscountDialogOpen(false);
      setHandlingDiscountForm({
        agent_id: "",
        discount_value: 0,
        is_active: false,
      });
      
      // Refresh the agents list
      await fetchAgents();
      
    } catch (error) {
      console.error("Error updating handling discount:", error);
      toast({
        title: "Error",
        description: "Failed to update handling discount. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg">Loading agents...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Fetching data from users table
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Agent Data Management
          </h1>
          <p className="text-muted-foreground">
            Manage agent accounts and information ({agents.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          {(userRole === "Super Admin" || userRole === "Admin" || userRole === "Staff Admin") && (
            <Button 
              onClick={() => setMembershipDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Aktifkan Member
            </Button>
          )}
          <Button variant="outline" onClick={fetchAgents} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("agents")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "agents"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Data Agent
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "logs"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Logs Aktivasi Agent
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "transactions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Agent Transaction History
          </button>
        </nav>
      </div>

      {activeTab === "agents" && (
        <>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Page Size Selector */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries per page</span>
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredAgents.length > 0 ? startIndex : 0} to {endIndex} of {filteredAgents.length} entries
            </div>
          </div>

          {filteredAgents.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No agents match your search."
                  : agents.length === 0
                    ? "No agents available in the database."
                    : "All agents are filtered out."}
              </p>
              {agents.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>Total agents in database: {agents.length}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAgents}
                    className="mt-2"
                  >
                    Refresh Data
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Agent ID</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Diskon Handling</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAgents.map((agent) => {
                    const isExpanded = expandedRows.has(agent.id);
                    return [
                      // Master Row
                      <TableRow key={agent.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(agent.id)}
                            className="p-1"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {agent.id.slice(0, 8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => navigate(`/admin/agent-details/${agent.id}`)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                          >
                            {agent.full_name}
                          </button>
                        </TableCell>
                        <TableCell>
                          {userRole && ["Super Admin", "Admin", "Staff Admin"].includes(userRole) ? (
                            <Button
                              variant={agent.handling_discount_active ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setHandlingDiscountForm({
                                  agent_id: agent.id,
                                  discount_value: agent.handling_discount_value || 0, // Changed to value
                                  is_active: !agent.handling_discount_active,
                                });
                                setHandlingDiscountDialogOpen(true);
                              }}
                              className={agent.handling_discount_active ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            >
                              {agent.handling_discount_active ? (
                                <>
                                  <span className="mr-1">✓</span>
                                  {formatCurrency(agent.handling_discount_value || 0)}
                                </>
                              ) : (
                                "Aktifkan"
                              )}
                            </Button>
                          ) : (
                            <Badge variant={agent.handling_discount_active ? "default" : "secondary"}>
                              {agent.handling_discount_active ? formatCurrency(agent.handling_discount_value || 0) : "Tidak Aktif"} {/* Show as currency */}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {userRole && ["Super Admin", "Admin", "Staff Admin"].includes(userRole) ? (
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={agent.status === "active"}
                                onCheckedChange={() => handleStatusToggle(agent)}
                                disabled={statusToggleLoading === agent.id}
                                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                              />
                              <span
                                className={`text-sm font-medium ${
                                  agent.status === "active"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {statusToggleLoading === agent.id ? (
                                  <div className="flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    Updating...
                                  </div>
                                ) : agent.status === "active" ? (
                                  "ACTIVE"
                                ) : (
                                  "SUSPENDED"
                                )}
                              </span>
                            </div>
                          ) : (
                            <Badge variant={getStatusBadgeVariant(agent.status)}>
                              {agent.status === "active" ? "ACTIVE" : "SUSPENDED"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(agent.saldo || 0)}
                        </TableCell>
                        <TableCell>
                          {userRole && ["Super Admin", "Admin", "Staff Admin"].includes(userRole) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={actionLoading === agent.id}
                                >
                                  {actionLoading === agent.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditAgent(agent)}
                                  className="text-blue-600"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {isSuperAdmin && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Agent
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete agent "
                                          {agent.full_name}"? This action will
                                          permanently remove the agent from:
                                          <br />• Authentication system
                                          <br />• Users table
                                          <br />• Agent users table
                                          <br />
                                          <br />
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteAgent(
                                              agent.id,
                                              agent.email,
                                            )
                                          }
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No Access
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>,

                      // Detail Row - Expandable (conditionally rendered)
                      ...(isExpanded ? [
                        <TableRow key={`${agent.id}-detail`} className="bg-gray-50/50">
                          <TableCell colSpan={7}>
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Email */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Email
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {agent.email}
                                    </p>
                                  </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-green-100 p-2 rounded-lg">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Phone
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {agent.phone_number || "N/A"}
                                    </p>
                                  </div>
                                </div>

                                {/* Account Type */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-purple-100 p-2 rounded-lg">
                                    <Building className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Account Type
                                    </p>
                                    {agent.account_type ? (
                                      <Badge 
                                        variant={agent.account_type === "Personal" ? "secondary" : "default"}
                                        className={agent.account_type === "Personal" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}
                                      >
                                        {agent.account_type}
                                      </Badge>
                                    ) : (
                                      <span className="text-sm text-gray-600">-</span>
                                    )}
                                  </div>
                                </div>

                                {/* Company */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-orange-100 p-2 rounded-lg">
                                    <Building className="h-4 w-4 text-orange-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Company
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {agent.nama_perusahaan || "-"}
                                    </p>
                                  </div>
                                </div>

                                {/* Member */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Member Status
                                    </p>
                                    <Badge 
                                      variant={agent.member_is_active ? "default" : "secondary"}
                                      className={agent.member_is_active ? "bg-green-500 text-white" : "bg-yellow-500 text-white"}
                                    >
                                      {agent.member_is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Total Bookings */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-teal-100 p-2 rounded-lg">
                                    <Calendar className="h-4 w-4 text-teal-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Total Bookings
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {agent.total_bookings || 0} bookings
                                    </p>
                                  </div>
                                </div>

                                {/* Total Revenue */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-emerald-100 p-2 rounded-lg">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Total Revenue
                                    </p>
                                    <p className="text-sm text-gray-600 font-medium">
                                      {formatCurrency(agent.total_revenue || 0)}
                                    </p>
                                  </div>
                                </div>

                                {/* Persentase Diskon */}
                                <div className="flex items-start space-x-3">
                                  <div className="bg-yellow-100 p-2 rounded-lg">
                                    <Percent className="h-4 w-4 text-yellow-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Discount Percentage
                                    </p>
                                    <Badge 
                                      variant={agent.discount_percentage && agent.discount_percentage > 0 ? "default" : "secondary"}
                                      className={agent.discount_percentage && agent.discount_percentage > 0 ? "bg-green-500 text-white" : "bg-gray-500 text-white"}
                                    >
                                      {agent.discount_percentage || 0}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ] : [])
                    ];
                  }).flat()}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredAgents.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Logs Aktivasi Agent
                </CardTitle>
                <CardDescription>
                  Riwayat aktivasi dan deaktivasi agent oleh admin
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  logsFetched.current = false;
                  fetchAgentLogs();
                }} 
                disabled={logsLoading}
                size="sm"
              >
                {logsLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-lg">Loading logs...</div>
                </div>
              </div>
            ) : agentLogs.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No logs found</h3>
                <p className="text-muted-foreground mb-4">
                  Belum ada aktivitas aktivasi agent yang tercatat.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal & Waktu</TableHead>
                    <TableHead>Nama Agent</TableHead>
                    <TableHead>Email Agent</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Diaktifkan Oleh</TableHead>
                    <TableHead>Email Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(log.created_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {log.agent?.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.agent?.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.action === "activate" ? "default" : log.action === "deactivate" || log.action === "suspend" ? "destructive" : "secondary"}
                        >
                          {log.action === "activate" ? "Aktivasi" : 
                           log.action === "deactivate" ? "Deaktivasi" :
                           log.action === "suspend" ? "Suspend" : log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {log.activator?.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.activator?.email || "N/A"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "transactions" && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histori Transaksi Agent
                </CardTitle>
                <CardDescription>
                  Riwayat semua transaksi yang dilakukan oleh agent
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  transactionsFetched.current = false;
                  fetchTransactionHistory();
                }} 
                disabled={transactionLoading}
                size="sm"
              >
                {transactionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transactionLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-lg">Loading transactions...</div>
                </div>
              </div>
            ) : transactionHistory.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground mb-4">
                  Belum ada transaksi yang tercatat untuk agent.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal & Waktu</TableHead>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Jenis Transaksi</TableHead>
                    <TableHead>Nama Agent</TableHead>
                    <TableHead>Email Agent</TableHead>
                    <TableHead>Jumlah Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionHistory.map((transaction) => (
                    <TableRow key={`${transaction.type}-${transaction.id}`}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(transaction.created_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleTimeString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {transaction.code_booking}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {transaction.user?.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transaction.user?.email || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status || "N/A"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Agent Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Agent Details</DialogTitle>
            <DialogDescription>
              Update the agent's information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="full_name" className="text-right">
                Agent Name
              </Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone_number" className="text-right">
                Phone
              </Label>
              <Input
                id="phone_number"
                value={editForm.phone_number}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone_number: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nama_perusahaan" className="text-right">
                Company Name
              </Label>
              <Input
                id="nama_perusahaan"
                value={editForm.nama_perusahaan}
                onChange={(e) =>
                  setEditForm({ ...editForm, nama_perusahaan: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={actionLoading === editingAgent?.id}
            >
              {actionLoading === editingAgent?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Membership Activation Dialog */}
      <Dialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aktifkan Member Agent</DialogTitle>
            <DialogDescription>
              Aktifkan membership untuk agent dengan mengisi form di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent_select" className="text-right">
                Pilih Agent
              </Label>
              <div className="col-span-3">
                <Select
                  value={membershipForm.agent_id}
                  onValueChange={(value) =>
                    setMembershipForm({ ...membershipForm, agent_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.full_name} ({agent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Tanggal Mulai
              </Label>
              <Input
                id="start_date"
                type="date"
                value={membershipForm.start_date}
                onChange={(e) =>
                  setMembershipForm({ ...membershipForm, start_date: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                Tanggal Berakhir
              </Label>
              <Input
                id="end_date"
                type="date"
                value={membershipForm.end_date}
                onChange={(e) =>
                  setMembershipForm({ ...membershipForm, end_date: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount_percentage" className="text-right">
                Persentase Diskon (%)
              </Label>
              <Input
                id="discount_percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={membershipForm.discount_percentage}
                onChange={(e) =>
                  setMembershipForm({ ...membershipForm, discount_percentage: parseFloat(e.target.value) || 0 })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status_select" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <Select
                  value={membershipForm.status}
                  onValueChange={(value) =>
                    setMembershipForm({ ...membershipForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMembershipDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleActivateMembership}
              disabled={actionLoading === membershipForm.agent_id}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === membershipForm.agent_id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Aktifkan Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handling Discount Dialog */}
      <Dialog open={handlingDiscountDialogOpen} onOpenChange={setHandlingDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Diskon Handling</DialogTitle>
            <DialogDescription>
              Aktifkan atau nonaktifkan diskon handling untuk agent dengan mengatur persentase diskon.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent_name" className="text-right">
                Agent
              </Label>
              <div className="col-span-3">
                <Input
                  id="agent_name"
                  value={agents.find(a => a.id === handlingDiscountForm.agent_id)?.full_name || ""}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount_value" className="text-right">
                Nominal Diskon (IDR)
              </Label>
              <Input
                id="discount_value"
                type="number"
                min="0"
                step="1000"
                value={handlingDiscountForm.discount_value}
                onChange={(e) =>
                  setHandlingDiscountForm({ ...handlingDiscountForm, discount_value: parseFloat(e.target.value) || 0 })
                }
                className="col-span-3"
                placeholder="Masukkan nominal diskon dalam Rupiah"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                Status
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={handlingDiscountForm.is_active}
                  onCheckedChange={(checked) =>
                    setHandlingDiscountForm({ ...handlingDiscountForm, is_active: checked })
                  }
                />
                <span className="text-sm">
                  {handlingDiscountForm.is_active ? "Aktif" : "Tidak Aktif"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHandlingDiscountDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleActivateHandlingDiscount}
              disabled={actionLoading === handlingDiscountForm.agent_id}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === handlingDiscountForm.agent_id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend agent "
              {agentToSuspend?.full_name}"? This will prevent them from
              accessing the system until they are reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSuspendDialogOpen(false);
                setAgentToSuspend(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSuspend}
              className="bg-red-600 hover:bg-red-700"
            >
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentManagement;