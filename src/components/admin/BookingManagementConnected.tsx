import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Eye,
  CreditCard,
  Car,
  Activity,
  ClipboardCheck,
  Search,
  X,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import PostRentalInspectionForm from "@/components/booking/PostRentalInspectionForm";
import PickupCustomer from "@/components/booking/PickupCustomer";
import PreRentalInspectionForm from "@/components/booking/PreRentalInspectionForm";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";

interface Booking {
  id: string;
  driver_name?: string;
  kode_booking?: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  pickup_time?: string;
  driver_option?: string;
  driver_id?: string;
  user: {
    full_name: string;
    email: string;
  };
  driver?: {
    id: string;
    driver_name: string;
    name?: string;
  };
  vehicle?: {
    make: string;
    model: string;
    license_plate: string;
  };
}

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  damage_payment?: {
    damage_description: string;
  };
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReturnProcessOpen, setIsReturnProcessOpen] = useState(false);
  const [isPickupProcessOpen, setIsPickupProcessOpen] = useState(false);
  const [isPreInspectionOpen, setIsPreInspectionOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookings();

    // Check URL for status filter
    const urlParams = new URLSearchParams(location.search);
    const statusParam = urlParams.get("bookings_status");

    if (statusParam) {
      setSearchTerm(statusParam);
    }

    // Set up realtime subscription for bookings updates
    const bookingsSubscription = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          fetchBookings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
    };
  }, [location]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const bookingsWithRelatedData = await Promise.all(
        (data || []).map(async (booking) => {
          // Fetch user data
          const { data: userData } = await supabase
            .from("users")
            .select("full_name, email, role")
            .eq("id", booking.user_id)
            .single();

          // Fetch driver data if driver_id exists
          let driverData = null;
          if (booking.driver_id) {
            const { data: driver } = await supabase
              .from("drivers")
              .select("id, name")
              .eq("id", booking.driver_id)
              .single();
            driverData = driver;
          }

          // Fetch vehicle data
          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("make, model, license_plate")
            .eq("id", booking.vehicle_id)
            .single();

          return {
            ...booking,
            user: userData,
            driver: driverData,
            vehicle: vehicleData,
          };
        }),
      );

      setBookings(bookingsWithRelatedData);
      setFilteredBookings(bookingsWithRelatedData);

      // Apply URL status filter if present
      const urlParams = new URLSearchParams(location.search);
      const statusParam = urlParams.get("bookings_status");

      if (statusParam) {
        const normalizedStatus = statusParam.toLowerCase().replace("-", "");
        const filtered =
          data?.filter(
            (booking) => booking.status.toLowerCase() === normalizedStatus,
          ) || [];
        setFilteredBookings(filtered);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        variant: "destructive",
        title: "Error fetching bookings",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayments = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);

      // Update booking payment status based on payments
      if (currentBooking) {
        updateBookingPaymentStatus(
          bookingId,
          currentBooking.total_amount,
          data || [],
        );
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        variant: "destructive",
        title: "Error fetching payments",
        description: error.message,
      });
    }
  };

  // Calculate the total amount paid for a booking
  const calculateTotalPaid = (paymentsList: Payment[]) => {
    return paymentsList.reduce((total, payment) => {
      return total + (payment.amount || 0);
    }, 0);
  };

  // Calculate the remaining amount to be paid
  const calculateRemainingAmount = (bookingId: string, totalAmount: number) => {
    const bookingPayments = payments.filter(
      (payment) => payment.booking_id === bookingId,
    );
    const totalPaid = calculateTotalPaid(bookingPayments);
    return Math.max(0, totalAmount - totalPaid);
  };

  // Update booking payment status based on payments
  const updateBookingPaymentStatus = async (
    bookingId: string,
    totalAmount: number,
    paymentsList: Payment[],
  ) => {
    const totalPaid = calculateTotalPaid(paymentsList);
    let paymentStatus = "unpaid";

    if (totalPaid >= totalAmount) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: paymentStatus })
        .eq("id", bookingId);

      if (error) throw error;

      // Update local booking data
      if (currentBooking && currentBooking.id === bookingId) {
        setCurrentBooking({ ...currentBooking, payment_status: paymentStatus });
      }

      // Update bookings list
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, payment_status: paymentStatus }
            : booking,
        ),
      );

      // Update filtered bookings list
      setFilteredBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, payment_status: paymentStatus }
            : booking,
        ),
      );
    } catch (error) {
      console.error("Error updating booking payment status:", error);
    }
  };

  const handleViewDetails = async (booking: Booking) => {
    setCurrentBooking(booking);
    await fetchPayments(booking.id);
    setIsDetailsOpen(true);
    // Ensure payment amount is set to the booking total amount for consistency
    setPaymentAmount(booking.total_amount);
  };

  const handleOpenPaymentDialog = (booking: Booking) => {
    setCurrentBooking(booking);
    // Set default payment amount to the booking total amount
    const remainingAmount = calculateRemainingAmount(
      booking.id,
      booking.total_amount,
    );
    setPaymentAmount(remainingAmount);
    setPaymentMethod("Cash");
    setIsPaymentOpen(true);
  };

  const handleProcessReturn = (booking: Booking) => {
    setCurrentBooking(booking);
    setIsReturnProcessOpen(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBooking) return;

    try {
      // Validate payment amount
      const remainingAmount = calculateRemainingAmount(
        currentBooking.id,
        currentBooking.total_amount,
      );
      if (paymentAmount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid payment amount",
          description: "Payment amount must be greater than zero.",
        });
        return;
      }

      if (paymentAmount > remainingAmount && remainingAmount > 0) {
        // Confirm if user wants to overpay
        if (
          !window.confirm(
            `The remaining amount is ${formatCurrency(remainingAmount)}. Are you sure you want to process a payment of ${formatCurrency(paymentAmount)}?`,
          )
        ) {
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke(
        "processPayment",
        {
          body: {
            userId: currentBooking.user_id,
            bookingId: currentBooking.id,
            amount: paymentAmount,
            paymentMethod: paymentMethod,
          },
        },
      );

      if (error) throw error;

      toast({
        title: "Payment processed",
        description: `Payment of ${formatCurrency(paymentAmount)} has been processed successfully`,
      });

      // Refresh payment data
      await fetchPayments(currentBooking.id);

      setIsPaymentOpen(false);
      fetchBookings();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        variant: "destructive",
        title: "Error processing payment",
        description: error.message,
      });
    }
  };

  const handleApproveBooking = async (booking: Booking) => {
    try {
      console.log(
        "Approving booking:",
        booking.id,
        "Current status:",
        booking.status,
      );

      // First, let's check if the booking exists and get its current status
      const { data: currentBooking, error: fetchError } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("id", booking.id)
        .single();

      if (fetchError) {
        console.error("Error fetching current booking:", fetchError);
        throw fetchError;
      }

      console.log("Current booking in DB:", currentBooking);

      // Now update the status - ensure we're using string comparison
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", String(booking.id))
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Update result:", data);

      // Verify the update was successful
      const { data: updatedBooking, error: verifyError } = await supabase
        .from("bookings")
        .select("id, bookings_status")
        .eq("id", booking.id)
        .single();

      if (verifyError) {
        console.error("Error verifying update:", verifyError);
      } else {
        console.log("Verified updated booking:", updatedBooking);
      }

      toast({
        title: "Booking approved",
        description: `Booking #${booking.kode_booking || booking.id} has been approved successfully`,
      });

      // Update local state immediately to reflect changes
      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === booking.id ? { ...b, bookings_status: "confirmed" } : b,
        ),
      );
      setFilteredBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === booking.id ? { ...b, bookings_status: "confirmed" } : b,
        ),
      );

      // Then refresh all bookings from the server
      await fetchBookings();
    } catch (error) {
      console.error("Error approving booking:", error);
      toast({
        variant: "destructive",
        title: "Error approving booking",
        description: error?.message || "An unknown error occurred",
      });
    }
  };

  const handlePickupVehicle = async (booking: Booking) => {
    setCurrentBooking(booking);
    setIsPickupProcessOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (!status) {
      return <Badge>Unknown</Badge>;
    }

    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "booked":
        return <Badge className="bg-pink-500">Booked</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "onride":
        return <Badge className="bg-purple-500">Onride</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case "unpaid":
        return <Badge className="bg-red-500">Unpaid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return dateString;
    }
  };

  const formatDateDDMMYYYY = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("IDR", "Rp");
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredBookings(bookings);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = bookings.filter(
      (booking) =>
        booking.user?.full_name?.toLowerCase().includes(lowercasedSearch) ||
        booking.user?.email?.toLowerCase().includes(lowercasedSearch) ||
        booking.kode_booking?.toLowerCase().includes(lowercasedSearch) ||
        booking.id.toString().includes(lowercasedSearch) ||
        booking.vehicle_id.toString().includes(lowercasedSearch) ||
        booking.status?.toLowerCase().includes(lowercasedSearch) ||
        booking.payment_status?.toLowerCase().includes(lowercasedSearch),
    );

    setFilteredBookings(filtered);
  }, [searchTerm, bookings]);

  // Reset selected bookings when filtered bookings change
  useEffect(() => {
    setSelectedBookings([]);
    setSelectAll(false);
  }, [filteredBookings]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredBookings(bookings);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelectAll(checked);

    if (checked) {
      // Select all filtered bookings
      const allIds = filteredBookings.map((booking) => booking.id);
      setSelectedBookings(allIds);
    } else {
      // Deselect all
      setSelectedBookings([]);
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings((prev) => {
      if (prev.includes(bookingId)) {
        // Remove from selection
        const newSelection = prev.filter((id) => id !== bookingId);
        // Update selectAll state
        if (newSelection.length === 0) {
          setSelectAll(false);
        }
        return newSelection;
      } else {
        // Add to selection
        const newSelection = [...prev, bookingId];
        // Update selectAll state if all filtered bookings are selected
        if (newSelection.length === filteredBookings.length) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  function formatTimeTo12Hour(timeString: string) {
    if (!timeString) return "-";
    const [hourStr, minuteStr] = timeString.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12; // jam 0 jadi 12
    return `${hour}:${minute} ${ampm}`;
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Booking Management</h2>
        <div className="relative w-64">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {filteredBookings.length !== bookings.length && (
            <div className="absolute right-0 -bottom-6 text-xs text-gray-500">
              Found {filteredBookings.length} of {bookings.length} bookings
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div className="flex space-x-2 items-center">
          <select
            className="p-2 border rounded-md"
            value={
              searchTerm === "onride"
                ? "Onride"
                : searchTerm === "confirmed"
                  ? "Confirmed"
                  : searchTerm === "pending" || searchTerm === "booked"
                    ? "Booked"
                    : searchTerm === "completed"
                      ? "Completed"
                      : searchTerm === "cancelled"
                        ? "Cancelled"
                        : "All Status"
            }
            onChange={(e) => {
              const status = e.target.value;
              if (status === "All Status") {
                setSearchTerm("");
                setFilteredBookings(bookings);
              } else {
                setSearchTerm(status.toLowerCase());
                const filtered = bookings.filter((booking) =>
                  status === "Booked"
                    ? booking.status.toLowerCase() === "pending" ||
                      booking.status.toLowerCase() === "booked"
                    : booking.status.toLowerCase() === status.toLowerCase(),
                );
                setFilteredBookings(filtered);
              }
            }}
          >
            <option>All Status</option>
            <option>Booked</option>
            <option>Confirmed</option>
            <option>Onride</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>

          <div className="flex items-center ml-4 space-x-2">
            <input
              type="checkbox"
              id="selectAll"
              checked={selectAll}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label
              htmlFor="selectAll"
              className="text-sm font-medium text-gray-700"
            >
              Check All
            </label>
            {selectedBookings.length > 0 && (
              <span className="text-xs text-gray-500 ml-2">
                ({selectedBookings.length} selected)
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading bookings...</p>
        </div>
      ) : (
        <Table>
          <TableCaption>List of all bookings in the system</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Select</TableHead>
              <TableHead>Kode Booking</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Booking Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => (
              <TableRow
                key={booking.id}
                className={
                  selectedBookings.includes(booking.id) ? "bg-blue-50" : ""
                }
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedBookings.includes(booking.id)}
                    onChange={() => handleSelectBooking(booking.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </TableCell>
                <TableCell>{booking.kode_booking || booking.id}</TableCell>
                <TableCell className="font-medium">
                  {booking.user?.full_name || "Unknown"}
                </TableCell>
                <TableCell>
                  Vehicle: {booking.vehicle?.make} {booking.vehicle?.model}
                </TableCell>
                <TableCell>
                  {booking.driver_option === "provided" ? (
                    <>
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 border-blue-300 mb-1"
                      >
                        With Driver
                      </Badge>
                      <div>
                        {booking.driver?.name || booking.driver_name || "-"}
                      </div>
                    </>
                  ) : booking.driver_option === "self" ? (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-800 border-gray-300"
                    >
                      Self Drive
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>

                <TableCell>
                  {formatDateDDMMYYYY(booking.start_date)} -{" "}
                  {formatDateDDMMYYYY(booking.end_date)}
                </TableCell>
                <TableCell>
                  {formatCurrency(booking.total_amount || 0)}
                </TableCell>
                <TableCell>
                  {getPaymentStatusBadge(booking.payment_status)}
                </TableCell>
                <TableCell>{getStatusBadge(booking.status)}</TableCell>
                <TableCell className="text-right flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDetails(booking)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenPaymentDialog(booking)}
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 font-medium"
                    onClick={() =>
                      navigate(`/admin/damage-payment/${booking.id}`)
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Damage Payment
                  </Button>
                  {(booking.status === "pending" ||
                    booking.status === "booked") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                      onClick={() => handleApproveBooking(booking)}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Approve
                    </Button>
                  )}
                  {booking.status === "confirmed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => handlePickupVehicle(booking)}
                    >
                      <Car className="h-4 w-4" />
                      Picked Up
                    </Button>
                  )}
                  {booking.status === "onride" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        disabled
                      >
                        <Activity className="h-4 w-4" />
                        Onride{" "}
                        {booking.pickup_time
                          ? `(${formatTimeTo12Hour(booking.pickup_time)})`
                          : ""}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                        onClick={() => handleProcessReturn(booking)}
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Process Return
                      </Button>
                    </>
                  )}

                  {booking.status !== "onride" &&
                    booking.status !== "completed" &&
                    booking.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Activity className="h-4 w-4" />
                        Progress
                      </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Booking Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Detailed information about the booking
            </DialogDescription>
          </DialogHeader>
          {currentBooking && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Customer Information
                  </h3>
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {currentBooking.user?.full_name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {currentBooking.user?.email}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Vehicle Information</h3>

                  <p>
                    <span className="font-medium">Vehicle ID:</span>{" "}
                    {currentBooking.vehicle_id || "N/A"}
                  </p>

                  <p>
                    <span className="font-medium">Make:</span>{" "}
                    {currentBooking.vehicle?.make || "N/A"}
                  </p>

                  <p>
                    <span className="font-medium">Model:</span>{" "}
                    {currentBooking.vehicle?.model || "N/A"}
                  </p>

                  <p>
                    <span className="font-medium">License Plate:</span>{" "}
                    {currentBooking.vehicle?.license_plate || "N/A"}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Booking Information</h3>
                  <p>
                    <span className="font-medium">Start Date:</span>{" "}
                    {formatDateDDMMYYYY(currentBooking.start_date)}
                  </p>
                  {currentBooking.driver_option === "provided" && (
                    <div>
                      <span className="font-medium">Driver:</span>{" "}
                      {currentBooking.driver?.name ||
                        currentBooking.driver_name ||
                        "Assigned driver"}
                    </div>
                  )}

                  <p>
                    <span className="font-medium">End Date:</span>{" "}
                    {formatDateDDMMYYYY(currentBooking.end_date)}
                  </p>
                  <p>
                    <span className="font-medium">Total Amount:</span>{" "}
                    {formatCurrency(currentBooking.total_amount || 0)}
                  </p>
                  <p>
                    <span className="font-medium">Payment Status:</span>{" "}
                    {currentBooking.payment_status}
                  </p>
                  <p>
                    <span className="font-medium">Booking Status:</span>{" "}
                    {currentBooking.booking_status}
                  </p>
                  {currentBooking.pickup_time && (
                    <p>
                      <span className="font-medium">Pickup Time:</span>{" "}
                      {formatTimeTo12Hour(currentBooking.pickup_time)}
                    </p>
                  )}

                  <p>
                    <span className="font-medium">Created At:</span>{" "}
                    {formatDateDDMMYYYY(currentBooking.created_at)}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <p>
                        <span className="font-medium">Total Amount:</span>{" "}
                        {currentBooking &&
                          formatCurrency(currentBooking.total_amount || 0)}
                      </p>
                      <p>
                        <span className="font-medium">Total Paid:</span>{" "}
                        {formatCurrency(calculateTotalPaid(payments))}
                      </p>
                      <p>
                        <span className="font-medium">Remaining:</span>{" "}
                        {currentBooking &&
                          formatCurrency(
                            Math.max(
                              0,
                              (currentBooking.total_amount || 0) -
                                calculateTotalPaid(payments),
                            ),
                          )}
                      </p>
                      <p>
                        <span className="font-medium">Payment Status:</span>{" "}
                        {currentBooking &&
                          getPaymentStatusBadge(currentBooking.payment_status)}
                      </p>
                    </div>

                    <h4 className="text-md font-semibold mt-4">
                      Payment Transactions
                    </h4>
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 border rounded-md space-y-1"
                      >
                        <p>
                          <span className="font-medium">Amount:</span>{" "}
                          {formatCurrency(payment.amount || 0)}
                        </p>
                        <p>
                          <span className="font-medium">Method:</span>{" "}
                          {payment.payment_method || "-"}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {payment.status || "-"}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span>{" "}
                          {formatDateDDMMYYYY(payment.created_at)}
                        </p>

                        {/* Jika ada kerusakan */}
                        {payment.damage_payment?.damage_description && (
                          <p className="text-sm text-red-500 mt-2">
                            <span className="font-medium">Damage:</span>{" "}
                            {payment.damage_payment.damage_description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <p>No payment records found.</p>
                    <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 mt-4">
                      <p>
                        <span className="font-medium">Total Amount:</span>{" "}
                        {currentBooking &&
                          formatCurrency(currentBooking.total_amount || 0)}
                      </p>
                      <p>
                        <span className="font-medium">Payment Status:</span>{" "}
                        {currentBooking &&
                          getPaymentStatusBadge(currentBooking.payment_status)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for booking #
              {currentBooking?.kode_booking || currentBooking?.id}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcessPayment}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="amount" className="text-right font-medium">
                  Amount
                </label>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      Rp
                    </span>
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-full pl-8 pr-4 py-2 border rounded-md"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label
                  htmlFor="paymentMethod"
                  className="text-right font-medium"
                >
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="col-span-3 p-2 border rounded-md"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit/Debit Card">Credit/Debit Card</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Process Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Return Dialog */}
      <Dialog open={isReturnProcessOpen} onOpenChange={setIsReturnProcessOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Process Vehicle Return</DialogTitle>
            <DialogDescription>
              Complete the post-rental inspection and damage assessment for
              booking #{currentBooking?.kode_booking || currentBooking?.id}
            </DialogDescription>
          </DialogHeader>
          {currentBooking && (
            <div className="max-h-[80vh] overflow-y-auto pr-2">
              <PostRentalInspectionForm
                vehicleId={currentBooking.vehicle_id.toString()}
                bookingId={currentBooking.id.toString()}
                onComplete={async (data) => {
                  try {
                    // Update booking status to completed
                    const { error: bookingError } = await supabase
                      .from("bookings")
                      .update({ status: "completed" })
                      .eq("id", currentBooking.id);

                    if (bookingError) throw bookingError;

                    // Update vehicle status to available
                    const { error: vehicleError } = await supabase
                      .from("vehicles")
                      .update({ status: "available" })
                      .eq("id", currentBooking.vehicle_id);

                    if (vehicleError) throw vehicleError;

                    toast({
                      title: "Return processed",
                      description:
                        data.calculatedFees > 0
                          ? `Vehicle return processed with additional fees: Rp ${data.calculatedFees.toLocaleString()}`
                          : "Vehicle return processed successfully. No additional fees required.",
                    });
                  } catch (error) {
                    console.error("Error updating status:", error);
                    toast({
                      variant: "destructive",
                      title: "Error updating status",
                      description: error.message,
                    });
                  }
                  setIsReturnProcessOpen(false);
                  fetchBookings();
                }}
                onCancel={() => setIsReturnProcessOpen(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Pickup Dialog */}
      <Dialog open={isPickupProcessOpen} onOpenChange={setIsPickupProcessOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Process Vehicle Pickup</DialogTitle>
            <DialogDescription>
              Complete the pickup checklist for booking #
              {currentBooking?.kode_booking || currentBooking?.id}
            </DialogDescription>
          </DialogHeader>
          {currentBooking && (
            <div className="max-h-[80vh] overflow-y-auto pr-2">
              <PickupCustomer
                vehicleId={currentBooking.vehicle_id.toString()}
                bookingId={currentBooking.id.toString()}
                customerName={currentBooking.user?.full_name || "Customer"}
                driverOption={currentBooking.driver_option}
                onComplete={async (data) => {
                  try {
                    // Update booking status to onride
                    const now = new Date();
                    const timeString = now.toTimeString().split(" ")[0]; // Extract HH:MM:SS format
                    const { error } = await supabase
                      .from("bookings")
                      .update({
                        status: "onride",
                        pickup_time: timeString,
                      })
                      .eq("id", currentBooking.id);

                    if (error) throw error;

                    toast({
                      title: "Pickup processed",
                      description:
                        "Vehicle pickup processed successfully. Status updated to onride.",
                    });
                  } catch (error) {
                    console.error("Error updating booking status:", error);
                    toast({
                      variant: "destructive",
                      title: "Error updating booking status",
                      description: error.message,
                    });
                  }

                  setIsPickupProcessOpen(false);

                  // Only show pre-inspection if not using driver option
                  if (
                    data.showPreInspection &&
                    data.driverOption !== "With driver"
                  ) {
                    setIsPreInspectionOpen(true);
                  }

                  fetchBookings();
                }}
                onCancel={() => setIsPickupProcessOpen(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-Rental Inspection Dialog */}
      <Dialog open={isPreInspectionOpen} onOpenChange={setIsPreInspectionOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pre-Rental Inspection</DialogTitle>
            <DialogDescription>
              Complete the pre-rental inspection for booking #
              {currentBooking?.kode_booking || currentBooking?.id}
            </DialogDescription>
          </DialogHeader>
          {currentBooking && (
            <div className="max-h-[80vh] overflow-y-auto pr-2">
              <PreRentalInspectionForm
                vehicleId={currentBooking.vehicle_id.toString()}
                bookingId={currentBooking.id.toString()}
                onComplete={(data) => {
                  toast({
                    title: "Pre-rental inspection completed",
                    description:
                      "Vehicle inspection has been recorded successfully.",
                  });
                  setIsPreInspectionOpen(false);
                  fetchBookings();
                }}
                onCancel={() => setIsPreInspectionOpen(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
