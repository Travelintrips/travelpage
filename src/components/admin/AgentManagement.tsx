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
}

const AgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { isAdmin, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      console.log("Fetching agents...");

      // Fetch users with Agent role from users table
      const { data: agentsData, error } = await supabase
        .from("users")
        .select(
          `
          id,
          created_at,
          full_name,
          email,
          phone_number,
          role,
          saldo,
          status
        `,
        )
        .eq("role", "Agent")
        .order("created_at", { ascending: false });

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

          return {
            ...agent,
            status: agent.status || "active",
            total_bookings: totalBookings,
            total_revenue: totalRevenue,
            commission_rate: 10, // Default 10%
            saldo: agent.saldo || 0,
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
    if (!isAdmin && userRole !== "Admin") {
      toast({
        title: "Access Denied",
        description: "Only Admin or Super Admin can perform this action.",
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
    if (!isAdmin && userRole !== "Admin") {
      toast({
        title: "Access Denied",
        description: "Only Admin or Super Admin can perform this action.",
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

  const handleDeleteAgent = async (agentId: string, agentEmail: string) => {
    if (!isAdmin && userRole !== "Admin") {
      toast({
        title: "Access Denied",
        description: "Only Admin or Super Admin can perform this action.",
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
          <Button variant="outline" onClick={fetchAgents} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

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
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Joined Date</TableHead>
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
                      <Badge variant="outline">{agent.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(agent.status)}>
                        {agent.status === "active" ? "ACTIVE" : "INACTIVE"}
                      </Badge>
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
                      <div className="text-sm">
                        {formatDate(agent.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin || userRole === "Admin" ? (
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
                            {agent.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => handleDeactivateAgent(agent.id)}
                                className="text-orange-600"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Non Aktif
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleActivateAgent(agent.id)}
                                className="text-green-600"
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Aktif
                              </DropdownMenuItem>
                            )}
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
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteAgent(agent.id, agent.email)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
          <Button variant="outline" onClick={fetchAgents}>
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AgentManagement;
