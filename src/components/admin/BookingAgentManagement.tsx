import React, { useEffect, useState, useRef } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Search,
  Loader2,
  User,
  MapPin,
  Plane,
  Edit,
  Trash2,
  Check,
  Clock,
  X,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

interface HandlingBooking {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  category: string;
  passenger_area: string;
  pickup_area: string;
  flight_number: string;
  travel_type: string;
  pickup_date: string;
  pickup_time: string;
  passengers?: number;
  additional_notes?: string;
  status?: string;
  total_price: number;
  payment_method: string;
  bank_name?: string;
  code_booking?: string;
  user_id?: string;
  payment_id?: string;
  created_by_role?: string;
  updated_at?: string;
}

interface UserInfo {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
}

interface Agent {
  id: string;
  full_name: string;
  email?: string;
}

const BookingAgentManagement = () => {
  const { userName, userRole } = useAuth();
  const [handlingBookings, setHandlingBookings] = useState<HandlingBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Add refs to prevent duplicate fetches and track initialization
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const isInitialized = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] =
    useState<HandlingBooking | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, UserInfo>>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // FIXED: Single useEffect to handle all initialization logic with caching
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[BookingAgentManagement] Already initialized, skipping...');
      return;
    }

    if (userName && userRole) {
      console.log('[BookingAgentManagement] Auth ready, initializing component...');
      isInitialized.current = true;
      
      // Check for cached data first
      const cachedBookings = sessionStorage.getItem('bookingAgentManagement_cachedBookings');
      const cachedAgents = sessionStorage.getItem('bookingAgentManagement_cachedAgents');
      
      if (cachedBookings) {
        try {
          const parsedBookings = JSON.parse(cachedBookings);
          if (parsedBookings && parsedBookings.length >= 0) { // Allow empty arrays
            setHandlingBookings(parsedBookings);
            console.log('[BookingAgentManagement] Loaded cached bookings, NO LOADING SCREEN');
          }
        } catch (error) {
          console.warn('[BookingAgentManagement] Failed to parse cached bookings:', error);
        }
      }
      
      if (cachedAgents) {
        try {
          const parsedAgents = JSON.parse(cachedAgents);
          if (parsedAgents && parsedAgents.length >= 0) { // Allow empty arrays
            setAgents(parsedAgents);
            console.log('[BookingAgentManagement] Loaded cached agents');
          }
        } catch (error) {
          console.warn('[BookingAgentManagement] Failed to parse cached agents:', error);
        }
      }

      // Always do background refresh to get latest data
      if (cachedBookings || cachedAgents) {
        setTimeout(() => {
          fetchHandlingBookings(true);
          fetchAgents(true);
        }, 100);
      } else {
        // Fetch data if no cache
        console.log('[BookingAgentManagement] No cached data, fetching fresh data...');
        fetchHandlingBookings();
        fetchAgents();
      }
    }
  }, [userName, userRole]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userName && userRole) {
        const now = Date.now();
        // Only refetch if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[BookingAgentManagement] Tab became visible, doing background refresh...');
          fetchHandlingBookings(true); // Background refresh without loading spinner
        } else {
          console.log('[BookingAgentManagement] Skipping refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userName, userRole]);

  const fetchHandlingBookings = async (isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) {
      console.log('[BookingAgentManagement] Fetch already in progress, skipping...');
      return;
    }

    // Additional check: don't fetch if we just fetched recently (less than 5 seconds ago)
    const now = Date.now();
    if (now - lastFetchTime.current < 5000 && handlingBookings.length > 0) {
      console.log('[BookingAgentManagement] Recent fetch detected, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = now;

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && handlingBookings.length === 0) {
        console.log('[BookingAgentManagement] Showing loading spinner for initial load');
        setLoading(true);
      } else {
        console.log('[BookingAgentManagement] Background refresh, no loading spinner');
      }

      setIsFetching(true);
      console.log("Fetching handling bookings created by agents...");

      // First, try to fetch bookings with created_by_role filter
      let query = supabase
        .from("handling_bookings")
        .select("*")
        .order("created_at", { ascending: false });

      // Try to filter by created_by_role = 'Agent'
      // If the column doesn't exist, this will fail gracefully
      try {
        query = query.eq("created_by_role", "Agent");
        console.log("Filtering by created_by_role = 'Agent'");
      } catch (filterError) {
        console.warn(
          "created_by_role column might not exist, fetching all bookings:",
          filterError,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching handling bookings:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // If the error is about unknown column, try without filter
        if (error.message?.includes("column") || error.code === "42703") {
          console.log("Retrying without created_by_role filter...");
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("handling_bookings")
            .select("*")
            .order("created_at", { ascending: false });

          if (fallbackError) {
            console.error("Fallback query also failed:", fallbackError);
            return;
          }

          console.log(
            "Fallback query successful, showing all bookings:",
            fallbackData,
          );
          setHandlingBookings(fallbackData || []);
          return;
        }
        return;
      }

      console.log("Successfully fetched agent bookings:", data);
      console.log("Number of agent bookings found:", data?.length || 0);
      setHandlingBookings(data || []);

      // ✅ Cache the data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('bookingAgentManagement_cachedBookings', JSON.stringify(data || []));
        console.log('[BookingAgentManagement] Data cached successfully');
      } catch (cacheError) {
        console.warn('[BookingAgentManagement] Failed to cache data:', cacheError);
      }

      if (!data || data.length === 0) {
        console.log("No agent bookings found in database");
      }
    } catch (error) {
      console.error("Unexpected error:", error);

      // Final fallback - try to get all bookings
      try {
        console.log("Attempting final fallback to fetch all bookings...");
        const { data: allData, error: allError } = await supabase
          .from("handling_bookings")
          .select("*")
          .order("created_at", { ascending: false });

        if (!allError && allData) {
          console.log("Final fallback successful:", allData);
          setHandlingBookings(allData);
          
          // Cache fallback data too
          try {
            sessionStorage.setItem('bookingAgentManagement_cachedBookings', JSON.stringify(allData));
          } catch (cacheError) {
            console.warn('[BookingAgentManagement] Failed to cache fallback data:', cacheError);
          }
        }
      } catch (fallbackError) {
        console.error("All fallback attempts failed:", fallbackError);
      }
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      setIsFetching(false);
      fetchInProgress.current = false;
    }
  };

  const fetchAgents = async (isBackgroundRefresh = false) => {
    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && agents.length === 0) {
        setAgentsLoading(true);
      }
      
      console.log("Fetching agents from users table...");

      // Fetch users with Agent role
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("role", "Agent")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error fetching agents:", error);
        return;
      }

      const agentsList: Agent[] = (data || []).map((user) => ({
        id: user.id,
        full_name: user.full_name || "Unknown Agent",
        email: user.email,
      }));

      console.log("Successfully fetched agents:", agentsList);
      setAgents(agentsList);
      
      // ✅ Cache the agents data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('bookingAgentManagement_cachedAgents', JSON.stringify(agentsList));
        console.log('[BookingAgentManagement] Agents data cached successfully');
      } catch (cacheError) {
        console.warn('[BookingAgentManagement] Failed to cache agents data:', cacheError);
      }
    } catch (error) {
      console.error("Unexpected error fetching agents:", error);
    } finally {
      if (!isBackgroundRefresh) {
        setAgentsLoading(false);
      }
    }
  };

  const filteredBookings = handlingBookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.code_booking || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesAgent =
      agentFilter === "all" ||
      (booking.user_id && booking.user_id === agentFilter) ||
      (booking.customer_name || "")
        .toLowerCase()
        .includes(
          agents
            .find((agent) => agent.id === agentFilter)
            ?.full_name.toLowerCase() || "",
        );

    const matchesPaymentMethod =
      paymentMethodFilter === "all" ||
      booking.payment_method === paymentMethodFilter;

    const matchesStatus =
      statusFilter === "all" || (booking.status || "pending") === statusFilter;

    return (
      matchesSearch && matchesAgent && matchesPaymentMethod && matchesStatus
    );
  });

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
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatPaymentMethod = (paymentMethod?: string, bankName?: string) => {
    if (!paymentMethod) return "N/A";

    let formattedMethod;
    switch (paymentMethod.toLowerCase()) {
      case "bank_transfer":
        formattedMethod = "Bank Transfer";
        break;
      case "cash":
        formattedMethod = "Cash";
        break;
      case "use_saldo":
        formattedMethod = "Use Saldo";
        break;
      case "credit_card":
        formattedMethod = "Credit Card";
        break;
      case "debit_card":
        formattedMethod = "Debit Card";
        break;
      case "e_wallet":
        formattedMethod = "E-Wallet";
        break;
      case "virtual_account":
        formattedMethod = "Virtual Account";
        break;
      default:
        formattedMethod = paymentMethod
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Add bank name for bank transfer payments
    if (paymentMethod.toLowerCase() === "bank_transfer" && bankName) {
      return `${formattedMethod} ${bankName}`;
    }

    return formattedMethod;
  };

  const fetchUserInfo = async (userId: string): Promise<UserInfo | null> => {
    if (!userId) return null;

    // Check cache first
    if (userCache[userId]) {
      return userCache[userId];
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user info:", error);
        return null;
      }

      const userInfo: UserInfo = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      };

      // Cache the user info
      setUserCache((prev) => ({ ...prev, [userId]: userInfo }));
      return userInfo;
    } catch (error) {
      console.error("Unexpected error fetching user info:", error);
      return null;
    }
  };

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: string,
    userRole: string,
    userName: string,
  ) => {
    try {
      const { error } = await supabase
        .from("handling_bookings")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by_role: userRole, // simpan role yg update
          updated_by_name: userName, // simpan nama yg update
        })
        .eq("id", bookingId)
        .select();

      if (error) {
        console.error("Error updating booking status:", error);
        console.log("Update result:", data, error);
        return;
      }

      // Refresh the bookings list
      fetchHandlingBookings();
    } catch (error) {
      console.error("Unexpected error updating status:", error);
    }
  };

  const toggleRowExpansion = (bookingId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <div className="text-lg">Loading agent bookings...</div>
          <div className="text-sm text-muted-foreground mt-2">
            Fetching data from handling_bookings table
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
            Booking Agent Management
          </h1>
          <p className="text-muted-foreground">
            Manage agent handling service bookings ({handlingBookings.length}{" "}
            found)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchHandlingBookings}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentsLoading ? (
                <SelectItem value="loading" disabled>
                  Loading agents...
                </SelectItem>
              ) : (
                agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={paymentMethodFilter}
            onValueChange={setPaymentMethodFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Methods</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="use_saldo">Use Saldo</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="debit_card">Debit Card</SelectItem>
              <SelectItem value="e_wallet">E-Wallet</SelectItem>
              <SelectItem value="virtual_account">Virtual Account</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(agentFilter !== "all" ||
          paymentMethodFilter !== "all" ||
          statusFilter !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAgentFilter("all");
              setPaymentMethodFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agent Handling Bookings
          </CardTitle>
          <CardDescription>
            Passenger handling service bookings created by agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No bookings match your search."
                  : handlingBookings.length === 0
                    ? "No bookings available in the database."
                    : "All bookings are filtered out."}
              </p>
              {handlingBookings.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>Total bookings in database: {handlingBookings.length}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHandlingBookings}
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
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <React.Fragment key={booking.id}>
                    {/* Master Row */}
                    <TableRow className="cursor-pointer hover:bg-gray-50">
                      <TableCell onClick={() => toggleRowExpansion(booking.id)}>
                        {expandedRows.has(booking.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                      </TableCell>
                      <TableCell onClick={() => toggleRowExpansion(booking.id)}>
                        <div className="font-mono text-sm">
                          {booking.code_booking || booking.id.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => toggleRowExpansion(booking.id)}>
                        <div>
                          <div className="font-medium">
                            {booking.customer_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {booking.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => toggleRowExpansion(booking.id)}>
                        <span className="font-medium text-green-600">
                          {formatCurrency(booking.total_price)}
                        </span>
                      </TableCell>
                      <TableCell onClick={() => toggleRowExpansion(booking.id)}>
                        <Badge
                          variant={getStatusBadgeVariant(booking.status)}
                          className={
                            booking.status === "completed"
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : booking.status === "pending"
                                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                : ""
                          }
                        >
                          {(booking.status || "pending")
                            .replace("_", " ")
                            .toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateBookingStatus(
                                    booking.id,
                                    "confirmed",
                                    userRole || "Admin",
                                    userName || "Unknown User",
                                  )
                                }
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateBookingStatus(
                                    booking.id,
                                    "pending",
                                    userRole || "Admin",
                                    userName || "Unknown User",
                                  )
                                }
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateBookingStatus(
                                    booking.id,
                                    "completed",
                                    userRole || "Admin",
                                    userName || "Unknown User",
                                  )
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {userRole === "Super Admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteBooking(booking.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Detail Row */}
                    {expandedRows.has(booking.id) && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 p-6">
                          <div className="space-y-6">
                            {/* Booking Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Category
                                </Label>
                                <p className="text-sm mt-1">
                                  <Badge variant="outline">{booking.category}</Badge>
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Travel Type
                                </Label>
                                <p className="text-sm mt-1">
                                  <Badge variant="secondary">{booking.travel_type}</Badge>
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Flight Number
                                </Label>
                                <p className="text-sm mt-1 flex items-center gap-1">
                                  <Plane className="h-4 w-4" />
                                  {booking.flight_number}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Pickup Date
                                </Label>
                                <p className="text-sm mt-1">
                                  {formatDate(booking.pickup_date)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Pickup Time
                                </Label>
                                <p className="text-sm mt-1">{booking.pickup_time}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Passengers
                                </Label>
                                <p className="text-sm mt-1 flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {booking.passengers || "N/A"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Payment Method
                                </Label>
                                <p className="text-sm mt-1">
                                  {formatPaymentMethod(
                                    booking.payment_method,
                                    booking.bank_name,
                                  )}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-600">
                                  Created Date
                                </Label>
                                <p className="text-sm mt-1">
                                  {formatDate(booking.created_at)}
                                </p>
                              </div>
                            </div>

                            {/* Location Details */}
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Location Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">
                                    Pickup Area
                                  </Label>
                                  <p className="text-sm mt-1">{booking.pickup_area}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">
                                    Passenger Area
                                  </Label>
                                  <p className="text-sm mt-1">{booking.passenger_area}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">
                                    Dropoff Area
                                  </Label>
                                  <p className="text-sm mt-1">
                                    {booking.dropoff_area || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Status History */}
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Status History
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                                  <span>
                                    <strong>Last Updated:</strong>{" "}
                                    {booking.updated_at
                                      ? formatDate(booking.updated_at)
                                      : formatDate(booking.created_at)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                                  <span>
                                    <strong>Created by Agent:</strong>{" "}
                                    {booking.customer_name}
                                  </span>
                                  <span className="text-gray-500">
                                    {formatDate(booking.created_at)}
                                  </span>
                                </div>
                                {booking.status === "completed" && (
                                  <div className="flex items-center justify-between text-sm p-2 bg-green-50 rounded border border-green-200">
                                    <span>
  <strong>Completed by Admin:</strong>{" "}
  {booking.updated_by_name || "Admin"}
</span>
                                    <span className="text-gray-500">
                                      {booking.updated_at
                                        ? formatDate(booking.updated_at)
                                        : "Just now"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Additional Notes */}
                            {booking.additional_notes && (
                              <div className="border-t pt-4">
                                <Label className="text-sm font-medium text-gray-600">
                                  Additional Notes
                                </Label>
                                <p className="text-sm bg-white p-3 rounded-md mt-1 border">
                                  {booking.additional_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredBookings.length} of {handlingBookings.length}{" "}
            bookings
          </div>
          <Button variant="outline" onClick={fetchHandlingBookings}>
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {/* Booking Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Details -{" "}
              {selectedBooking?.code_booking || selectedBooking?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Name
                      </Label>
                      <p className="text-sm">{selectedBooking.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Email
                      </Label>
                      <p className="text-sm">
                        {selectedBooking.customer_email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Phone
                      </Label>
                      <p className="text-sm">
                        {selectedBooking.customer_phone}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Flight Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Flight Number
                      </Label>
                      <p className="text-sm">{selectedBooking.flight_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Travel Type
                      </Label>
                      <Badge variant="secondary">
                        {selectedBooking.travel_type}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Category
                      </Label>
                      <Badge variant="outline">
                        {selectedBooking.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Pickup Area
                      </Label>
                      <p className="text-sm">{selectedBooking.pickup_area}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Passenger Area
                      </Label>
                      <p className="text-sm">
                        {selectedBooking.passenger_area}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Dropoff Area
                      </Label>
                      <p className="text-sm">
                        {selectedBooking.dropoff_area}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Pickup Date
                      </Label>
                      <p className="text-sm">
                        {formatDate(selectedBooking.pickup_date)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Pickup Time
                      </Label>
                      <p className="text-sm">{selectedBooking.pickup_time}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Passengers
                      </Label>
                      <p className="text-sm flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {selectedBooking.passengers || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Total Price
                      </Label>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(selectedBooking.total_price)}
                      </p>
                    </div>
                  </div>
                  {selectedBooking.additional_notes && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-gray-600">
                        Additional Notes
                      </Label>
                      <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                        {selectedBooking.additional_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Payment Method
                      </Label>
                      <p className="text-sm">
                        {formatPaymentMethod(
                          selectedBooking.payment_method,
                          selectedBooking.bank_name,
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Created Date
                      </Label>
                      <p className="text-sm">
                        {formatDate(selectedBooking.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Verifikasi */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Status Verifikasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">
                          Current Status
                        </Label>
                        <div className="mt-1">
                          <Badge
                            variant={getStatusBadgeVariant(
                              selectedBooking.status,
                            )}
                            className={
                              selectedBooking.status === "completed"
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : selectedBooking.status === "pending"
                                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                  : ""
                            }
                          >
                            {(selectedBooking.status || "pending")
                              .replace("_", " ")
                              .toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Label className="text-sm font-medium text-gray-600">
                          Last Updated
                        </Label>
                        <p className="text-sm text-gray-500">
                          {formatDate(selectedBooking.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Status History */}
                    <div className="border-t pt-3">
                      <Label className="text-sm font-medium text-gray-600 mb-2 block">
                        Status History
                      </Label>

                      {/* Status awal (dibuat oleh Agent) */}
                      <div className="text-sm text-gray-700">
                        Created by{" "}
                        {selectedBooking?.created_by_role || "Unknown"}
                        {selectedBooking?.customer_name
                          ? ` (${selectedBooking.customer_name})`
                          : ""}
                        <div className="text-xs text-gray-500">
                          {formatDate(selectedBooking?.created_at)}
                        </div>
                      </div>

                      {/* Status update terakhir */}
                      {selectedBooking?.status && (
                        <div className="mt-2 p-2 rounded bg-yellow-50 text-sm">
                          <span className="font-semibold">
                            {selectedBooking.status}
                          </span>{" "}
                          by {selectedBooking?.updated_by_role || "System"}
                          {selectedBooking?.updated_by_name
                            ? ` (${selectedBooking.updated_by_name})`
                            : ""}
                          <div className="text-xs text-gray-500">
                            {formatDate(selectedBooking?.updated_at)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Status History Component
interface StatusHistoryProps {
  booking: HandlingBooking;
  fetchUserInfo: (userId: string) => Promise<UserInfo | null>;
  formatDate: (dateString: string) => string;
  currentUserName: string | null;
  currentUserRole: string | null;
}

const StatusHistory: React.FC<StatusHistoryProps> = ({
  booking,
  fetchUserInfo,
  formatDate,
  currentUserName,
  currentUserRole,
}) => {
  const [creatorInfo, setCreatorInfo] = useState<UserInfo | null>(null);
  const [updaterInfo, setUpdaterInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserInfo = async () => {
      setLoading(true);

      // Fetch creator info if user_id exists
      if (booking.user_id) {
        const creator = await fetchUserInfo(booking.user_id);
        setCreatorInfo(creator);
      }

      // For status updates, we'll use the current logged-in user information
      if (
        booking.status &&
        booking.status !== "pending" &&
        booking.updated_at
      ) {
        // Use current user information for status updates
        setUpdaterInfo({
          id: "current_user",
          full_name: currentUserName || "Unknown User",
          email: "current@user.com",
          role: currentUserRole || "Admin",
        });
      }

      setLoading(false);
    };

    loadUserInfo();
  }, [booking, fetchUserInfo]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
      </div>
    );
  }

  const getCreatorDisplayName = () => {
    if (creatorInfo?.full_name) {
      return `${booking.created_by_role || "User"} (${creatorInfo.full_name})`;
    }
    return booking.created_by_role || "System";
  };

  const getUpdaterDisplayName = () => {
    if (updaterInfo?.full_name && updaterInfo?.role) {
      return `${updaterInfo.role} (${updaterInfo.full_name})`;
    }
    return currentUserRole || "Admin";
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "In Progress";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-50";
      case "pending":
        return "bg-yellow-50";
      case "in_progress":
        return "bg-yellow-50";
      case "completed":
        return "bg-green-50";
      case "cancelled":
        return "bg-red-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="space-y-2">
      {/* Show creation history */}
      <div className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
        <span>Created by {getCreatorDisplayName()}</span>
        <span className="text-gray-500">{formatDate(booking.created_at)}</span>
      </div>

      {/* Show status change history */}
      {booking.status && (
        <div
          className={`flex items-center justify-between text-sm p-2 rounded ${getStatusBgColor(booking.status)}`}
        >
          <span>
            <strong>{getStatusDisplayName(booking.status)}</strong> by{" "}
            {getUpdaterDisplayName()}
          </span>
          <span className="text-gray-500">
            {booking.updated_at ? formatDate(booking.updated_at) : "Just now"}
          </span>
        </div>
      )}

      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Status changes are tracked with the current
          logged-in user ({currentUserRole || "Admin"}:{" "}
          {currentUserName || "Unknown User"}). For more detailed tracking,
          consider adding "updated_by_role" and "updated_by_name" fields to the
          database.
        </p>
      </div>
    </div>
  );
};

export default BookingAgentManagement;