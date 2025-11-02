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
  Upload,
} from "lucide-react";
import PostRentalInspectionForm from "@/components/booking/PostRentalInspectionForm";
import PickupCustomer from "@/components/booking/PickupCustomer";
import PreRentalInspectionForm from "@/components/booking/PreRentalInspectionForm";
import BookingFormDriver from "@/components/booking/BookingFormDriver";
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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isPaymentProofOpen, setIsPaymentProofOpen] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  
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

  const handleMarkAsPaid = (booking: Booking) => {
    setCurrentBooking(booking);
    setPaymentProofFile(null);
    setIsPaymentProofOpen(true);
  };

  const handleUploadPaymentProof = async () => {
    if (!currentBooking || !paymentProofFile) {
      toast({
        variant: "destructive",
        title: "File Required",
        description: "Please select a payment proof file to upload.",
      });
      return;
    }

    try {
      setIsUploadingProof(true);

      // Upload file to Supabase Storage
      const fileExt = paymentProofFile.name.split('.').pop();
      const fileName = `${currentBooking.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, paymentProofFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // Update booking payment status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_proof_url: publicUrl,
          payment_proof_uploaded_at: new Date().toISOString(),
        })
        .eq('id', currentBooking.id);

      if (updateError) throw updateError;

      toast({
        title: "✅ Payment Marked as Paid",
        description: "Payment proof has been uploaded successfully.",
      });

      setIsPaymentProofOpen(false);
      setPaymentProofFile(null);
      setCurrentBooking(null);
      fetchBookings();
    } catch (error: any) {
      console.error("Error uploading payment proof:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload payment proof",
      });
    } finally {
      setIsUploadingProof(false);
    }
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
      case "ongoing":
        return <Badge className="bg-purple-500">Ongoing</Badge>;
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

  const calculateRentalDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
let toastDescription = "";

if (booking.is_backdated) {
  // Case 1️⃣ — Booking dibuat mundur (tidak ada potongan saldo)
  toastDescription = "Booking backdate telah diselesaikan tanpa potongan saldo.";
} else if (lateDays > 0) {
  // Case 2️⃣ — Booking real, telat mengembalikan kendaraan
  toastDescription = `Kendaraan sudah dikembalikan (${lateDays} hari telat, denda Rp ${lateFee.toLocaleString(
    "id-ID"
  )}).`;
} else {
  // Case 3️⃣ — Booking normal, tepat waktu
  toastDescription = "Kendaraan sudah dikembalikan tepat waktu.";
}

toast({
  title: "✅ Booking selesai",
  description: toastDescription,
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
    
    if (!allowedRoles.includes(userRole)) {
      toast.error("You don't have permission to create bookings.");
      return;
    }
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
    <div className="bg-white min-h-screen p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Driver Booking Management</h1>
          <Button onClick={() => setShowBookingForm(true)}>
            + New Booking
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by driver name, booking code, status..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={overDayFilter}
            onChange={(e) => setOverDayFilter(e.target.value)}
            className="border rounded-md px-4 py-2"
          >
            <option value="all">All Over Days</option>
            <option value="none">No Over Days</option>
            <option value="1-3">1-3 Days</option>
            <option value="4-7">4-7 Days</option>
            <option value="7+">7+ Days</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>
              Driver Bookings ({filteredBookings.length} total)
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Booking Code</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Rental Days</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBookings.map((booking) => (
                <TableRow key={booking.id || booking.booking_reference}>
                  <TableCell>{booking.code_booking || booking.id}</TableCell>
                  <TableCell>{booking.driver?.name || "-"}</TableCell>
                  <TableCell>
                    {booking.vehicle
                      ? `${booking.vehicle.make} ${booking.vehicle.model}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {booking.vehicle?.license_plate || booking.license_plate || "-"}
                  </TableCell>
                  <TableCell>{formatDateDDMMYYYY(booking.start_date)}</TableCell>
                  <TableCell>{formatDateDDMMYYYY(booking.end_date)}</TableCell>
                  <TableCell>
                    {calculateRentalDays(booking.start_date, booking.end_date)} hari
                  </TableCell>
                  <TableCell>{formatCurrency(booking.total_amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPaymentStatusBadge(booking.payment_status)}
                      {booking.payment_status === "unpaid" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 px-3 bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarkAsPaid(booking)}
                          title="Upload Payment Proof"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(booking)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {booking.status === "pending" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleConfirmBooking(booking)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handlePickupVehicle(booking)}
                        >
                          <Car className="h-4 w-4" />
                        </Button>
                      )}
                      {(booking.status === "ongoing" || booking.status === "onride") && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-blue-500 hover:bg-blue-600"
                          onClick={() => handleFinishBooking(booking)}
                          title="Mark as Completed"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Finish
                        </Button>
                      )}
                      {canCancelBooking() && booking.status !== "cancelled" && booking.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOpenCancelForm(booking)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Payment Proof Upload Dialog */}
      <Dialog open={isPaymentProofOpen} onOpenChange={setIsPaymentProofOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payment Proof</DialogTitle>
            <DialogDescription>
              Upload proof of payment to mark this booking as paid
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentBooking && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Booking Code</p>
                <p className="font-semibold">{currentBooking.code_booking || currentBooking.id}</p>
                <p className="text-sm text-gray-600 mt-2">Amount</p>
                <p className="font-semibold">{formatCurrency(currentBooking.total_amount)}</p>
              </div>
            )}
            <div>
              <Label htmlFor="payment-proof">Payment Proof *</Label>
              <Input
                id="payment-proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: Images (JPG, PNG) or PDF
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPaymentProofOpen(false);
                setPaymentProofFile(null);
                setCurrentBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadPaymentProof}
              disabled={isUploadingProof || !paymentProofFile}
            >
              {isUploadingProof ? "Uploading..." : "Upload & Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {currentBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Booking Code</Label>
                  <p>{currentBooking.code_booking || currentBooking.id}</p>
                </div>
                <div>
                  <Label>Driver</Label>
                  <p>{currentBooking.driver?.name || "-"}</p>
                </div>
                <div>
                  <Label>Vehicle</Label>
                  <p>
                    {currentBooking.vehicle
                      ? `${currentBooking.vehicle.make} ${currentBooking.vehicle.model}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p>{formatCurrency(currentBooking.total_amount)}</p>
                </div>
              </div>
              <div>
                <Label>Payments</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDateDDMMYYYY(payment.created_at)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNotesForm} onOpenChange={setShowNotesForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Add notes for this booking confirmation (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter any notes about this booking..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseNotesForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmitConfirmation}>
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelForm} onOpenChange={setShowCancelForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCancelForm}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isCancelling || !cancelReason.trim()}
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPickupProcessOpen} onOpenChange={setIsPickupProcessOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Pickup Process</DialogTitle>
          </DialogHeader>
          {currentBooking && (
            <PickupCustomer
              booking={currentBooking}
              onClose={() => {
                setIsPickupProcessOpen(false);
                fetchBookings();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnProcessOpen} onOpenChange={setIsReturnProcessOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Return Process</DialogTitle>
          </DialogHeader>
          {currentBooking && (
            <PostRentalInspectionForm
              booking={currentBooking}
              onClose={() => {
                setIsReturnProcessOpen(false);
                fetchBookings();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>
          <BookingFormDriver
            onClose={() => {
              setShowBookingForm(false);
              fetchBookings();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}