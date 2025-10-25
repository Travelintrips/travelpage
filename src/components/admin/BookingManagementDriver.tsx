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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Eye,
  CreditCard,
  Car,
  Activity,
  ClipboardCheck,
  Search,
  Flag,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import PostRentalInspectionForm from "@/components/booking/PostRentalInspectionForm";
import PickupCustomer from "@/components/booking/PickupCustomer";
import PreRentalInspectionForm from "@/components/booking/PreRentalInspectionForm";
import { format } from "date-fns";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";


interface Booking {
  id: string;
  code_booking?: string;
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
  created_by_role?: string;
  vehicle_type?: string;
  license_plate?: string;
  user?: {
    full_name: string;
    email: string;
  };
  driver?: {
    id: string;
    name: string;
    driver_status?: string;
  };
  vehicle?: {
    make: string;
    model: string;
    license_plate: string;
    type: string;
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


export default function BookingManagementDriver() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [overDayFilter, setOverDayFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReturnProcessOpen, setIsReturnProcessOpen] = useState(false);
  const [isPickupProcessOpen, setIsPickupProcessOpen] = useState(false);
  const [isPreInspectionOpen, setIsPreInspectionOpen] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);  
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();

  // Calculate pagination
  const totalPages = Math.ceil(filteredBookings.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to first page
  };

  const toggleRowExpansion = (bookingId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(bookingId)) {
      newExpandedRows.delete(bookingId);
    } else {
      newExpandedRows.add(bookingId);
    }
    setExpandedRows(newExpandedRows);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("created_by_role", ["Driver Perusahaan", "Driver Mitra"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data separately using manual joins
      const bookingsWithRelatedData = await Promise.all(
        (data || []).map(async (booking) => {
          // Fetch user data
          const { data: userData } = await supabase
            .from("users")
            .select("full_name, email")
            .eq("id", booking.user_id)
            .single();

          // Fetch driver data if driver_id exists
          let driverData = null;
          if (booking.driver_id) {
            const { data: driver } = await supabase
              .from("drivers")
              .select("id, name, driver_status")
              .eq("id", booking.driver_id)
              .single();
            driverData = driver;
          }

          // Fetch vehicle data
          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("make, model, license_plate, type")
            .eq("id", booking.vehicle_id)
            .single();

          return {
            ...booking,
            user: userData,
            driver: driverData,
            vehicle: vehicleData,
            vehicle_type: vehicleData?.type || booking.vehicle_type || "MPV",
            license_plate:
              vehicleData?.license_plate ||
              booking.license_plate ||
              "B 1234 ABC",
          };
        }),
      );

      setBookings(bookingsWithRelatedData);
      setFilteredBookings(bookingsWithRelatedData);
    } catch (error) {
      console.error("Error fetching driver bookings:", error);
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
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        variant: "destructive",
        title: "Error fetching payments",
        description: error.message,
      });
    }
  };

  const handleViewDetails = async (booking: Booking) => {
    setCurrentBooking(booking);
    await fetchPayments(booking.id);
    setIsDetailsOpen(true);
    setPaymentAmount(booking.total_amount);
  };

  const handleOpenPaymentDialog = (booking: Booking) => {
    setCurrentBooking(booking);
    setPaymentAmount(booking.total_amount);
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
      if (paymentAmount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid payment amount",
          description: "Payment amount must be greater than zero.",
        });
        return;
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

  const handlePickupVehicle = async (booking: Booking) => {
    setCurrentBooking(booking);
    setIsPickupProcessOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
      case "booked":
        return <Badge className="bg-yellow-500">Pending</Badge>;
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

  const formatTimeTo12Hour = (timeString: string) => {
    if (!timeString) return "-";
    const [hourStr, minuteStr] = timeString.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${minute} ${ampm}`;
  };

  useEffect(() => {
    if (searchTerm.trim() === "" && overDayFilter === "all") {
      setFilteredBookings(bookings);
      return;
    }

    let filtered = bookings;

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.driver?.name?.toLowerCase().includes(lowercasedSearch) ||
          booking.code_booking?.toLowerCase().includes(lowercasedSearch) ||
          booking.id.toString().includes(lowercasedSearch) ||
          booking.status?.toLowerCase().includes(lowercasedSearch) ||
          booking.payment_status?.toLowerCase().includes(lowercasedSearch),
      );
    }

    // Apply over day filter
    if (overDayFilter !== "all") {
      filtered = filtered.filter((booking) => {
        const endDate = new Date(booking.end_date);
        const returnDate = booking.actual_return_date 
          ? new Date(booking.actual_return_date)
          : new Date();
        
        endDate.setHours(0, 0, 0, 0);
        returnDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor(
          (returnDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const overDays = Math.max(0, diffDays);

        switch (overDayFilter) {
          case "none":
            return overDays === 0;
          case "1-3":
            return overDays >= 1 && overDays <= 3;
          case "4-7":
            return overDays >= 4 && overDays <= 7;
          case "7+":
            return overDays > 7;
          default:
            return true;
        }
      });
    }

    setFilteredBookings(filtered);
  }, [searchTerm, overDayFilter, bookings]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredBookings(bookings);
  };

  const handleFinishBooking = async (booking: Booking) => {
  try {
    // 0️⃣ Ambil data admin login (Supabase Auth)
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id || null;
    const adminName = user?.user_metadata?.name || user?.email || "Unknown Admin";

    // 🛑 Cegah pemrosesan booking backdate
    if (booking.is_backdated) {
      toast({
        variant: "default",
        title: "ℹ️ Booking backdate",
        description: "Booking ini adalah backdate, tidak ada potongan saldo.",
      });
      // Tapi tetap boleh menandai sebagai completed
    }

    // 1️⃣ Update booking → completed + actual_return_date
const actualReturnDate =
  booking.status === "confirmed" && booking.finish_enabled
    ? booking.end_date // jika finish di hari end_date (upcoming case)
    : new Date().toISOString().split("T")[0]; // default: hari ini (ongoing/late/backdate)

const { error: bookingError } = await supabase
  .from("bookings")
  .update({
    status: "completed",
    actual_return_date: actualReturnDate,
    finish_enabled: false, // reset agar tidak bisa di-finish ulang
  })
  .eq("id", booking.id);

if (bookingError) throw bookingError;


    // 2️⃣ Ambil data kendaraan untuk menghitung denda (jika telat)
    const { data: vehicleData, error: vehicleFetchError } = await supabase
      .from("vehicles")
      .select("price")
      .eq("id", booking.vehicle_id)
      .single();

    if (vehicleFetchError) throw vehicleFetchError;

    // 3️⃣ Hitung keterlambatan
    const today = new Date();
    const endDate = new Date(booking.end_date);
    const lateDays = Math.max(
      0,
      Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const lateFee = lateDays * (vehicleData?.price || 0);

    // 4️⃣ Update late_days & late_fee di booking
    await supabase
      .from("bookings")
      .update({
        late_days: lateDays,
        late_fee: lateFee,
      })
      .eq("id", booking.id);

    // 5️⃣ Ubah status kendaraan jadi available
    const { error: vehicleUpdateError } = await supabase
      .from("vehicles")
      .update({ status: "available" })
      .eq("id", booking.vehicle_id);

    if (vehicleUpdateError) throw vehicleUpdateError;

    // 6️⃣ Jalankan potongan saldo (hanya jika bukan backdate)
    if (!booking.is_backdated) {
      const { error: rpcError } = await supabase.rpc("process_payment_late_fee", {
        p_driver_id: booking.driver_id,
        p_booking_id: booking.id,
        p_admin_id: adminId,
        p_admin_name: adminName,
      });

      if (rpcError) {
        console.warn("⚠️ RPC process_payment_late_fee warning:", rpcError.message);
        // tidak fatal, lanjutkan saja
      }
    }

    // 7️⃣ Tampilkan notifikasi sukses
    toast({
      title: "✅ Booking selesai",
      description: `Kendaraan sudah dikembalikan${
        lateDays > 0
          ? ` (${lateDays} hari telat, denda Rp ${lateFee.toLocaleString("id-ID")})`
          : ""
      }${
        booking.is_backdated
          ? " (Booking backdate — tidak ada potongan saldo)"
          : ""
      }`,
    });

    // 8️⃣ Refresh data tabel
    fetchBookings();

  } catch (error: any) {
    console.error("❌ Error finishing booking:", error);
    toast({
      variant: "destructive",
      title: "Gagal menyelesaikan booking",
      description: error.message || "Terjadi kesalahan saat menyelesaikan booking",
    });
  }
};


  const handleConfirmBooking = async (booking: Booking) => {
    setCurrentBooking(booking);
    setAdminNotes("");
    setShowNotesForm(true);
  };

  const handleSubmitConfirmation = async () => {
  if (!currentBooking) return;

  try {
    const today = new Date();
    const startDate = new Date(currentBooking.start_date);
    const endDate = new Date(currentBooking.end_date);

    // Tentukan status awal yang dikirim ke server
    let newStatus = "confirmed";
    if (startDate <= today && endDate >= today) {
      newStatus = "confirmed"; // tetap kirim "confirmed" biar trigger yang ubah jadi ongoing
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        notes_admin: adminNotes.trim() || null,
        updated_at: new Date().toISOString() // ✅ pastikan trigger jalan
      })
      .eq("id", currentBooking.id);

    if (error) throw error;

    toast({
      title: "✅ Booking Confirmed",
      description: "Booking berhasil dikonfirmasi, status akan menyesuaikan otomatis.",
    });

    setShowNotesForm(false);
    setAdminNotes("");
    setCurrentBooking(null);
    await fetchBookings();
  } catch (error: any) {
    console.error("Error confirming booking:", error);
    toast({
      variant: "destructive",
      title: "Error confirming booking",
      description: error.message || "Failed to confirm booking",
    });
  }
};


  const handleCloseNotesForm = () => {
    setShowNotesForm(false);
    setAdminNotes("");
    setCurrentBooking(null);
  };

  const canCancelBooking = () => {
    const allowedRoles = ['Super Admin', 'Admin', 'Staff Admin', 'Staff Traffic'];
    return allowedRoles.includes(userRole);
  };

  const handleOpenCancelForm = (booking: Booking) => {
    if (!canCancelBooking()) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to cancel bookings.",
      });
      return;
    }
    setCurrentBooking(booking);
    setCancelReason("");
    setShowCancelForm(true);
  };

  const handleCloseCancelForm = () => {
    setShowCancelForm(false);
    setCancelReason("");
    setCurrentBooking(null);
  };

  const handleCancelBooking = async () => {
  if (!currentBooking || !user) return;

  if (!cancelReason.trim()) {
    toast({
      variant: "destructive",
      title: "Reason Required",
      description: "Please provide a reason for cancellation.",
    });
    return;
  }

  try {
    setIsCancelling(true);

    const { error } = await supabase.rpc("cancel_booking_kembali_saldo", {
      p_booking_id: currentBooking.id,
      p_admin_id: user.id,
      p_admin_name: user.full_name,
      p_refund_reason: cancelReason.trim(),
    });

    if (error) throw error;

    toast({
      title: "Booking cancelled & refunded",
      description: `Booking has been cancelled and refunded. Reason: ${cancelReason}`,
    });

    handleCloseCancelForm();
    fetchBookings();
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    toast({
      variant: "destructive",
      title: "Error cancelling booking",
      description: error.message || "Failed to cancel booking",
    });
  } finally {
    setIsCancelling(false);
  }
};



  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-white hover:bg-white/20"
            >
              ← Back
            </Button>*/}
            <div>
              <h1 className="text-2xl font-bold">Driver Bookings</h1>
              <p className="text-blue-100">Manage driver bookings and assignments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Admin Form Layout */}
      {showNotesForm && currentBooking && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 m-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-blue-800">Confirm Booking - Admin Notes</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseNotesForm}
              className="text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Details */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Code:</span>
                  <span className="font-medium">{currentBooking.code_booking}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{currentBooking.driver?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{currentBooking.vehicle?.license_plate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">{formatCurrency(currentBooking.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Status:</span>
                  <Badge variant="outline">{currentBooking.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dates:</span>
                  <span className="font-medium">
                    {format(new Date(currentBooking.start_date), "dd/MM/yyyy")} - 
                    {format(new Date(currentBooking.end_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes Form */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3">Admin Notes</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminNotes" className="text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Add any admin notes for this booking confirmation..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="mt-1 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These notes will be saved with the booking and can be viewed later.
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Confirmation Action</p>
                      <p className="text-blue-700">
                        This will change the booking status from "Pending" to "Confirmed" and save any admin notes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseNotesForm}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitConfirmation}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Form Layout */}
      {showCancelForm && currentBooking && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 m-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-semibold text-red-800">Cancel Booking</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseCancelForm}
              className="text-red-600 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Details */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Code:</span>
                  <span className="font-medium">{currentBooking.code_booking}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{currentBooking.driver?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{currentBooking.vehicle?.license_plate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-600">{formatCurrency(currentBooking.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="outline">{currentBooking.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dates:</span>
                  <span className="font-medium">
                    {format(new Date(currentBooking.start_date), "dd/MM/yyyy")} - 
                    {format(new Date(currentBooking.end_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            </div>

            {/* Cancellation Form */}
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="font-medium text-gray-900 mb-3">Cancellation Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cancelReason" className="text-sm font-medium text-gray-700">
                    Reason for Cancellation *
                  </Label>
                  <Textarea
                    id="cancelReason"
                    placeholder="Please provide a detailed reason for cancelling this booking..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={4}
                    className="mt-1 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This reason will be recorded in the booking history and transaction records.
                  </p>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <Flag className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Important Notice</p>
                      <p className="text-yellow-700">
                        Cancelling this booking will automatically refund the customer and update the booking status. 
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseCancelForm}
                    disabled={isCancelling}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelBooking}
                    disabled={isCancelling || !cancelReason.trim()}
                    className="flex-1"
                  >
                    {isCancelling ? "Processing..." : "Confirm Cancellation"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Expandable Table */}
      {!showCancelForm && !showNotesForm && (
        <div className="p-6">
          {/* Search and Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Over Day Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Over Day:</Label>
                <select
                  value={overDayFilter}
                  onChange={(e) => setOverDayFilter(e.target.value)}
                  className="border rounded px-3 py-2 text-sm min-w-[140px]"
                >
                  <option value="all">All</option>
                  <option value="none">No Over Day</option>
                  <option value="1-3">1-3 Days</option>
                  <option value="4-7">4-7 Days</option>
                  <option value="7+">7+ Days</option>
                </select>
              </div>
              
              {/* Rows per page selector */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Show:</Label>
                <select
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>
          </div>

          {/* Expandable Table */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading driver bookings...</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Driver Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Booking Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentBookings.map((booking) => (
                    <React.Fragment key={booking.id}>
                      {/* Master Row */}
                      <TableRow className="hover:bg-gray-50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(booking.id)}
                            className="p-1 h-6 w-6"
                          >
                            {expandedRows.has(booking.id) ? (
                              <span className="text-gray-600">−</span>
                            ) : (
                              <span className="text-gray-600">+</span>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {booking.code_booking || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {booking.driver?.name || 'Unknown Driver'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              booking.driver?.driver_status === 'standby' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {booking.driver?.driver_status || 'standby'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(booking.payment_status)}
                        </TableCell>
                        <TableCell>
  {getStatusBadge(
    booking.status === "confirmed"
      ? new Date(booking.start_date) > new Date()
        ? "upcoming" // belum mulai
        : new Date(booking.end_date) < new Date()
        ? "late" // sudah lewat tapi belum diselesaikan
        : "ongoing" // sedang berlangsung
      : booking.status
  )}
</TableCell>


                        <TableCell>
                        <td>
                        {booking.status === "late" && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ Telat {booking.late_days} hari (
                        Rp {booking.late_fee?.toLocaleString("id-ID")})
                      </div>
                    )}
                  </td>
                 {/* <td className="p-2">
                    {booking.start_date} → {booking.end_date}
                  </td>*/}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                         {/*   <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => handleViewDetails(booking)}
                            >
                              <Eye className="h-4 w-4" />
                              Details
                            </Button>*/}

                           {(
  // Jika belum dibayar dan booking bukan cancelled → semua role bisa lihat
  (booking.payment_status !== "paid" && booking.status !== "cancelled") ||

  // Jika booking cancelled → hanya Super Admin & Admin yang bisa lihat
  (booking.status === "cancelled" && ["Super Admin", "Admin"].includes(userRole))
) && (
  <Button
    variant="outline"
    size="sm"
    className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
    onClick={() => handleOpenPaymentDialog(booking)}
  >
    <CreditCard className="h-4 w-4" />
    Payment
  </Button>
)}



                            {booking.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                                onClick={() => handleConfirmBooking(booking)}
                              >
                                <CheckCircle className="h-4 w-4" />
                                Confirm
                              </Button>
                            )}

                       {(() => {
  // 🕒 Gunakan tanggal lokal (Asia/Jakarta)
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ); // normalize ke jam 00:00 lokal
  const endDate = new Date(booking.end_date);
  const normalizedEndDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  const normalizedRole = userRole?.toLowerCase();

  // ✅ Hari ini sama atau lewat dari end_date
  const isEndOrAfter = normalizedEndDate <= today;

  // 🔍 Debug log untuk pengecekan
  console.log(
    "ROLE:", normalizedRole,
    "| STATUS:", booking.status,
    "| finish_enabled:", booking.finish_enabled,
    "| actual_return_date:", booking.actual_return_date,
    "| end_date:", booking.end_date,
    "| isEndOrAfter:", isEndOrAfter
  );

  // 🧠 Logika hak akses Finish
  const canFinish =
    !booking.actual_return_date &&
    (
      // 🔹 Super Admin bisa kapan pun
      normalizedRole === "super admin" ||

      // 🔹 Admin: ongoing, late, atau confirmed + finish_enabled
      (normalizedRole === "admin" && (
        ["ongoing", "late"].includes(booking.status) ||
        (booking.status === "confirmed" && booking.finish_enabled)
      )) ||

      // 🔹 Staff Admin / Traffic: boleh kalau end_date hari ini atau lewat
      (["staff admin", "staff traffic"].includes(normalizedRole) && (
        booking.status === "late" ||
        (["confirmed", "ongoing"].includes(booking.status) &&
          (booking.finish_enabled || isEndOrAfter))
      ))
    );

  // 🎨 Render tombol Finish jika boleh
  return canFinish ? (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center gap-1 ${
        booking.status === "late"
          ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
          : "bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
      }`}
      onClick={() => handleFinishBooking(booking)}
    >
      <CheckCircle className="h-4 w-4" />
      Finish
    </Button>
  ) : null;
})()}





                         {booking.status === "onride" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
                                onClick={() => handleProcessReturn(booking)}
                              >
                                <Activity className="h-4 w-4" />
                                Return
                              </Button>
                            )}

                            {booking.status !== "cancelled" &&
  booking.status !== "completed" &&
  canCancelBooking() &&
  userRole === "Super Admin" && ( // 👈 hanya Super Admin bisa lihat
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
      onClick={() => handleOpenCancelForm(booking)}
    >
      <XCircle className="h-4 w-4" />
      Cancel
    </Button>
  )}


                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Detail Row - Expandable */}
                      {expandedRows.has(booking.id) && (
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={7}>
                            <div className="p-4 space-y-4">
                              <h4 className="font-medium text-gray-900 mb-3">Booking Details</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Vehicle Information */}
                                <div className="bg-white p-3 rounded border">
                                  <h5 className="font-medium text-gray-700 mb-2">Vehicle Information</h5>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Tipe Kendaraan:</span>
                                      <span className="font-medium">{booking.vehicle_type || 'MPV'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Model Kendaraan:</span>
                                      <span className="font-medium">{booking.model || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Plat Kendaraan:</span>
                                      <span className="font-medium">{booking.vehicle?.license_plate || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Price /day:</span>
                                      <span className="font-medium">{booking.price || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Booking Information */}
                                <div className="bg-white p-3 rounded border">
                                  <h5 className="font-medium text-gray-700 mb-2">Booking Information</h5>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Start Date:</span>
                                      <span className="font-medium">{formatDateDDMMYYYY(booking.start_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">End Date:</span>
                                      <span className="font-medium">{formatDateDDMMYYYY(booking.end_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Amount:</span>
                                      <span className="font-medium text-green-600">{formatCurrency(booking.total_amount)}</span>
                                    </div>
                                    {(() => {
  const endDate = new Date(booking.end_date);
  const returnDate = booking.actual_return_date 
    ? new Date(booking.actual_return_date)
    : new Date();

  // Normalisasi jam ke 00:00:00
  endDate.setHours(0, 0, 0, 0);
  returnDate.setHours(0, 0, 0, 0);

  // Hitung selisih hari
  const diffDays = Math.floor(
    (returnDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const overDays = Math.max(0, diffDays);

  return (
    <>
      <div className="flex justify-between">
        <span className="text-gray-600">Over day:</span>
        <span className={`font-medium ${overDays > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {overDays} hari
        </span>
      </div>

      {booking.actual_return_date && (
        <div className="flex justify-between">
          <span className="text-gray-600">Return date:</span>
          <span className="font-medium">{formatDateDDMMYYYY(booking.actual_return_date)}</span>
        </div>
      )}
    </>
  );
})()}

                                    {booking.pickup_time && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Pickup Time:</span>
                                        <span className="font-medium">{formatTimeTo12Hour(booking.pickup_time)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Methode */}
                                <div className="bg-white p-3 rounded border">
                                  <h5 className="font-medium text-gray-700 mb-2">Payment Information</h5>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Payment Methode:</span>
                                      <span className="font-medium">{booking.payment_method || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Admin Notes:</span>
                                      <span className="font-medium">{booking.notes_admin || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Driver Notes:</span>
                                      <span className="font-medium">{booking.notes_driver || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Keterangan:</span>
                                      <span className="font-medium">{booking.keterangan || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cancellation Information */}
                                {booking.status === 'cancelled' && (
  <div className="bg-red-50 p-3 rounded border border-red-200">
    <h5 className="font-medium text-red-700 mb-2">Cancellation Information</h5>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-red-600">Cancelled By:</span>
        {/* ✅ Gunakan cancel_by_driver_name, fallback ke "System" */}
        <span className="font-medium text-red-800">
          {booking.cancel_by_driver_name || 'System'}
        </span>
      </div>

      {/* ✅ Tetap tampilkan alasan refund jika ada */}
      {booking.refund_reason && (
        <div className="mt-2">
          <span className="text-red-600">Reason:</span>
          <p className="text-red-800 mt-1 text-xs">{booking.refund_reason}</p>
        </div>
      )}
    </div>
  </div>
)}

                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} entries
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keep existing dialogs */}
      {/* ... other dialogs ... */}
    </div>
  );
}