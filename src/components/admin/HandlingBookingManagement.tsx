import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar,
  User,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plane,
  Clock,
  CreditCard,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface HandlingBooking {
  id: string;
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
  created_at: string;
  user_id?: string;
  payment_id?: string;
  code_booking?: string;
}

const BookingAgentManagement = () => {
  const [handlingBookings, setHandlingBookings] = useState<HandlingBooking[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] =
    useState<HandlingBooking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { userRole, isAdmin } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, []);

  const toggleRowExpansion = (bookingId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(bookingId)) {
      newExpandedRows.delete(bookingId);
    } else {
      newExpandedRows.add(bookingId);
    }
    setExpandedRows(newExpandedRows);
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      console.log("Fetching handling bookings...");

      // Fetch bookings from handling_bookings table filtered by created_by_role
      const { data, error } = await supabase
        .from("handling_bookings")
        .select("*")
        .or(
          `created_by_role.ilike.%customer%,created_by_role.ilike.%staff_trips%`,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching handling bookings:", error);
        toast({
          title: "Error",
          description: `Failed to fetch handling bookings: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log("Fetched handling bookings:", data);
      setHandlingBookings(data || []);

      if (!data || data.length === 0) {
        console.log("No handling bookings found in database");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        toast({
          title: "Error",
          description: "Failed to update booking status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking status updated successfully",
      });

      fetchBookings();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (userRole !== "Super Admin") {
      toast({
        title: "Access Denied",
        description: "Only Super Admin can delete bookings",
        variant: "destructive",
      });
      return;
    }

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
        toast({
          title: "Error",
          description: "Failed to delete booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });

      fetchBookings();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
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

  const filteredBookings = handlingBookings.filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.flight_number.toLowerCase().includes(searchTerm.toLowerCase()),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg">Loading handling bookings...</div>
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
            Handling Booking Management
          </h1>
          <p className="text-muted-foreground">
            Manage bookings created by customers and staff trips (
            {handlingBookings.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBookings} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
          <Button className="bg-primary-tosca hover:bg-primary-dark">
            <Plus className="h-4 w-4 mr-2" />
            New Booking
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
            Handling Bookings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Passenger handling service bookings from customers and staff trips
          </p>
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
                    onClick={fetchBookings}
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
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <React.Fragment key={booking.id}>
                    {/* Master Row */}
                    <TableRow className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(booking.id)}
                          className="p-1"
                        >
                          {expandedRows.has(booking.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {booking.code_booking || booking.booking_id || booking.id.slice(0, 8)}
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
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.category}</Badge>
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
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Booking Details</DialogTitle>
                              </DialogHeader>
                              {selectedBooking && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Customer Name</Label>
                                      <p className="font-medium">
                                        {selectedBooking.customer_name}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Category</Label>
                                      <p className="font-medium">
                                        {selectedBooking.category}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Pickup Date</Label>
                                      <p className="font-medium">
                                        {formatDate(selectedBooking.pickup_date)}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Pickup Time</Label>
                                      <p className="font-medium">
                                        {selectedBooking.pickup_time}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Passengers</Label>
                                      <p className="font-medium">
                                        {selectedBooking.passengers || "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Total Price</Label>
                                      <p className="font-medium">
                                        {formatCurrency(
                                          selectedBooking.total_price,
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Flight Number</Label>
                                      <p className="font-medium">
                                        {selectedBooking.flight_number}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Travel Type</Label>
                                      <p className="font-medium">
                                        {selectedBooking.travel_type}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Booking ID</Label>
                                      <p className="font-medium font-mono">
                                        {selectedBooking.booking_id ||
                                          selectedBooking.id}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Payment Method</Label>
                                      <p className="font-medium">
                                        {selectedBooking.payment_method || "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Passenger Area</Label>
                                    <p className="font-medium">
                                      {selectedBooking.passenger_area}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Pickup Area</Label>
                                    <p className="font-medium">
                                      {selectedBooking.pickup_area}
                                    </p>
                                  </div>
                                  {selectedBooking.additional_notes && (
                                    <div>
                                      <Label>Additional Notes</Label>
                                      <p className="font-medium">
                                        {selectedBooking.additional_notes}
                                      </p>
                                    </div>
                                  )}
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() =>
                                        updateBookingStatus(
                                          selectedBooking.id,
                                          "confirmed",
                                        )
                                      }
                                      disabled={
                                        selectedBooking.status === "confirmed"
                                      }
                                    >
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        updateBookingStatus(
                                          selectedBooking.id,
                                          "in_progress",
                                        )
                                      }
                                      disabled={
                                        selectedBooking.status === "in_progress"
                                      }
                                    >
                                      In Progress
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        updateBookingStatus(
                                          selectedBooking.id,
                                          "completed",
                                        )
                                      }
                                      disabled={
                                        selectedBooking.status === "completed"
                                      }
                                    >
                                      Complete
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        updateBookingStatus(
                                          selectedBooking.id,
                                          "cancelled",
                                        )
                                      }
                                      disabled={
                                        selectedBooking.status === "cancelled"
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {userRole === "Super Admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteBooking(booking.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Detail Row - Expandable */}
                    {expandedRows.has(booking.id) && (
                      <TableRow className="bg-gray-50/50">
                        <TableCell colSpan={7}>
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Passenger Area */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                  <MapPin className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Passenger Area
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {booking.passenger_area}
                                  </p>
                                </div>
                              </div>

                              {/* Pickup Area */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-green-100 p-2 rounded-lg">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Pickup Area
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {booking.pickup_area}
                                  </p>
                                </div>
                              </div>

                              {/* Flight Number */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                  <Plane className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Flight Number
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {booking.flight_number}
                                  </p>
                                </div>
                              </div>

                              {/* Travel Type */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-orange-100 p-2 rounded-lg">
                                  <Calendar className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Travel Type
                                  </p>
                                  <Badge variant="secondary" className="text-xs">
                                    {booking.travel_type}
                                  </Badge>
                                </div>
                              </div>

                              {/* Date & Time */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                  <Clock className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Date & Time
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(booking.pickup_date)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {booking.pickup_time}
                                  </p>
                                </div>
                              </div>

                              {/* Payment Method */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-yellow-100 p-2 rounded-lg">
                                  <CreditCard className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Payment Method
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {booking.payment_method || "N/A"}
                                  </p>
                                </div>
                              </div>

                              {/* Passengers */}
                              <div className="flex items-start space-x-3">
                                <div className="bg-red-100 p-2 rounded-lg">
                                  <Users className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    Passengers
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {booking.passengers || "N/A"} person(s)
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Additional Notes */}
                            {booking.additional_notes && (
                              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  Additional Notes
                                </p>
                                <p className="text-sm text-gray-600">
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
      </Card>
    </div>
  );
};

export default BookingAgentManagement;