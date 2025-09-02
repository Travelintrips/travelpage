import React, { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}

const AgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [activeTab, setActiveTab] = useState("agents");
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const { isAdmin, userRole, userId } = useAuth();

  // Check if user is Super Admin
  const isSuperAdmin = userRole === "Super Admin";
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    if (activeTab === "logs") {
      fetchAgentLogs();
    }

    // Subscribe to real-time updates for memberships table
    const membershipSubscription = supabase
      .channel('memberships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships'
        },
        () => {
          console.log('Membership data changed, refreshing agents...');
          fetchAgents();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      membershipSubscription.unsubscribe();
    };
  }, [activeTab]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      console.log("Fetching agents...");

      // Fetch agents directly from users table with role = 'agent'
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
          role
        `
        )
        .eq("role", "agent")
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
          };
        }),
      );

      setAgents(agentsWithStats);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
    } finally {
      setLogsLoading(false);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.phone_number || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Agent Data
          </CardTitle>
          <CardDescription>
            Registered agents and their account information
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Persentase Diskon</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {agent.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{agent.full_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{agent.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {agent.phone_number || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.account_type ? (
                        <Badge 
                          variant={agent.account_type === "Personal" ? "secondary" : "default"}
                          className={agent.account_type === "Personal" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}
                        >
                          {agent.account_type}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {agent.nama_perusahaan || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={agent.member_is_active ? "default" : "secondary"}
                        className={agent.member_is_active ? "bg-green-500 text-white" : "bg-yellow-500 text-white"}
                      >
                        {agent.member_is_active ? "Active" : "Inactive"}
                      </Badge>
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
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {agent.total_bookings || 0}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(agent.total_revenue || 0)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(agent.saldo || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Badge 
                          variant={agent.discount_percentage && agent.discount_percentage > 0 ? "default" : "secondary"}
                          className={agent.discount_percentage && agent.discount_percentage > 0 ? "bg-green-500 text-white" : "bg-gray-500 text-white"}
                        >
                          {agent.discount_percentage || 0}%
                        </Badge>
                      </div>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/*    <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
          <Button variant="outline" onClick={fetchAgents}>
            Refresh
          </Button>
        </CardFooter>*/}
      </Card>
        </>
      )}

      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Logs Aktivasi Agent
            </CardTitle>
            <CardDescription>
              Riwayat aktivasi dan deaktivasi agent oleh admin
            </CardDescription>
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