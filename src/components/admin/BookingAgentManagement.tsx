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
  booking_id?: string;
  payment_method?: string;
  user_id?: string;
  payment_id?: string;
  created_by_role?: string;
}

const BookingAgentManagement = () => {
  const [handlingBookings, setHandlingBookings] = useState<HandlingBooking[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] =
    useState<HandlingBooking | null>(null);

  useEffect(() => {
    fetchHandlingBookings();
  }, []);

  const fetchHandlingBookings = async () => {
    try {
      setLoading(true);
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
        }
      } catch (fallbackError) {
        console.error("All fallback attempts failed:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = handlingBookings.filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.booking_id || "")
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

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("handling_bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking status:", error);
        return;
      }

      // Refresh the bookings list
      fetchHandlingBookings();
    } catch (error) {
      console.error("Unexpected error updating status:", error);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this booking?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("handling_bookings")
        .delete()
        .eq("id", bookingId);

      if (error) {
        console.error("Error deleting booking:", error);
        return;
      }

      // Refresh the bookings list
      fetchHandlingBookings();
    } catch (error) {
      console.error("Unexpected error deleting booking:", error);
    }
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

      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bookings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
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
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Flight Number</TableHead>
                  <TableHead>Travel Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Passengers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {booking.booking_id || booking.id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {booking.customer_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.customer_email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.customer_phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-1">
                        <Plane className="h-4 w-4" />
                        {booking.flight_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{booking.travel_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {formatDate(booking.pickup_date)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.pickup_time}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {booking.passengers || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {(booking.status || "pending")
                          .replace("_", " ")
                          .toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(booking.total_price)}
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
                                updateBookingStatus(booking.id, "confirmed")
                              }
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateBookingStatus(booking.id, "in_progress")
                              }
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateBookingStatus(booking.id, "completed")
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateBookingStatus(booking.id, "cancelled")
                              }
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBooking(booking.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
    </div>
  );
};

export default BookingAgentManagement;
