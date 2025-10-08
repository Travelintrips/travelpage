import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface Driver {
  id: string;
  name: string;
  driver_status?: string;
  saldo?: number;
}

interface BookingHistory {
  id: string;
  code_booking?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
  };
}

interface HistoriTransaksi {
  id: string;
  user_id: string;
  code_booking: string;
  nominal: number;
  saldo_akhir: number;
  keterangan: string | null;
  trans_date: string;
  admin_id: string | null;
  admin_name: string | null;
  created_at: string | null;
  jenis_transaksi: string | null;
  saldo_awal: number | null;
  status: string | null;
  proof_url: string | null;
  request_by_role: string | null;
  refund_reason: string | null;
  refunded_by: string | null;
  refunded_at: string | null;
  name: string | null;
  payment_method: string | null;
  bank_name: string | null;
  account_holder_received: string | null;
  account_number: string | null;
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [historiTransaksi, setHistoriTransaksi] = useState<HistoriTransaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking History filters and pagination
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingRowsPerPage, setBookingRowsPerPage] = useState(10);

  // Histori Transaksi filters and pagination
  const [transaksiSearchTerm, setTransaksiSearchTerm] = useState("");
  const [transaksiStatusFilter, setTransaksiStatusFilter] = useState("all");
  const [transaksiPage, setTransaksiPage] = useState(1);
  const [transaksiRowsPerPage, setTransaksiRowsPerPage] = useState(10);

  useEffect(() => {
    fetchDriverData();
  }, [id]);

  const fetchDriverData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch driver data
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, name, driver_status, saldo")
        .eq("id", id)
        .single();

      if (driverError) throw driverError;

      // Fetch booking history with vehicle relationship
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          code_booking,
          start_date,
          end_date,
          total_amount,
          status,
          vehicle:vehicles!bookings_vehicle_id_fkey (
            id,
            make,
            model,
            license_plate
          )
        `)
        .eq("driver_id", id)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch histori transaksi
      const { data: transaksiData, error: transaksiError } = await supabase
        .from("histori_transaksi")
        .select("*")
        .eq("user_id", id)
        .order("trans_date", { ascending: false });

      if (transaksiError) throw transaksiError;

      setDriver(driverData);
      setBookingHistory(bookingsData || []);
      setHistoriTransaksi(transaksiData || []);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching driver data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching driver data",
        description: error.message,
      });
      setIsLoading(false);
    }
  };

  // Filter and paginate booking history
  const filteredBookings = useMemo(() => {
    let filtered = bookingHistory;

    // Search filter
    if (bookingSearchTerm) {
      filtered = filtered.filter((booking) =>
        (booking.code_booking || booking.id).toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
        (booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model} ${booking.vehicle.license_plate}` : "").toLowerCase().includes(bookingSearchTerm.toLowerCase())
      );
    }

    // Status filter
    if (bookingStatusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status.toLowerCase() === bookingStatusFilter.toLowerCase());
    }

    return filtered;
  }, [bookingHistory, bookingSearchTerm, bookingStatusFilter]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (bookingPage - 1) * bookingRowsPerPage;
    const endIndex = startIndex + bookingRowsPerPage;
    return filteredBookings.slice(startIndex, endIndex);
  }, [filteredBookings, bookingPage, bookingRowsPerPage]);

  const bookingTotalPages = Math.ceil(filteredBookings.length / bookingRowsPerPage);

  // Filter and paginate histori transaksi
  const filteredTransaksi = useMemo(() => {
    let filtered = historiTransaksi;

    // Search filter
    if (transaksiSearchTerm) {
      filtered = filtered.filter((transaksi) =>
        transaksi.code_booking.toLowerCase().includes(transaksiSearchTerm.toLowerCase()) ||
        (transaksi.keterangan || "").toLowerCase().includes(transaksiSearchTerm.toLowerCase()) ||
        (transaksi.admin_name || "").toLowerCase().includes(transaksiSearchTerm.toLowerCase())
      );
    }

    // Status filter
    if (transaksiStatusFilter !== "all") {
      filtered = filtered.filter((transaksi) => 
        (transaksi.status || "").toLowerCase() === transaksiStatusFilter.toLowerCase()
      );
    }

    return filtered;
  }, [historiTransaksi, transaksiSearchTerm, transaksiStatusFilter]);

  const paginatedTransaksi = useMemo(() => {
    const startIndex = (transaksiPage - 1) * transaksiRowsPerPage;
    const endIndex = startIndex + transaksiRowsPerPage;
    return filteredTransaksi.slice(startIndex, endIndex);
  }, [filteredTransaksi, transaksiPage, transaksiRowsPerPage]);

  const transaksiTotalPages = Math.ceil(filteredTransaksi.length / transaksiRowsPerPage);

  // Pagination component
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    rowsPerPage, 
    onRowsPerPageChange 
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    rowsPerPage: number;
    onRowsPerPageChange: (rows: number) => void;
  }) => {
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          pages.push(currentPage - 1);
          pages.push(currentPage);
          pages.push(currentPage + 1);
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <Select value={rowsPerPage.toString()} onValueChange={(value) => onRowsPerPageChange(Number(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-1">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-3 py-1">...</span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
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

  const formatDate = (dateString: string) => {
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

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "pending":
      case "booked":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case "onride":
        return <Badge className="bg-purple-500">Onride</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDriverStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">No Status</Badge>;
    
    switch (status.toLowerCase()) {
      case "standby":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Standby
          </Badge>
        );
      case "on ride":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            On Ride
          </Badge>
        );
      case "offline":
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            Offline
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="outline">-</Badge>;
    
    switch (type.toLowerCase()) {
      case "topup":
      case "top up":
        return <Badge className="bg-blue-500">Top Up</Badge>;
      case "debit":
      case "pembayaran":
        return <Badge className="bg-red-500">Debit</Badge>;
      case "credit":
      case "refund":
        return <Badge className="bg-green-500">Credit</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getTransaksiStatusBadge = (status: string | null) => {
    if (!status) return '-';
    
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-500 text-white">completed</Badge>;
      case "verified":
        return <Badge className="bg-blue-500 text-white">verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">pending</Badge>;
      case "cancelled":
      case "rejected":
        return <Badge className="bg-red-500 text-white">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper function to check if transaction is "Sewa Kendaraan Driver"
  const isSewaKendaraanDriver = (jenis: string | null) => {
    if (!jenis) return false;
    return jenis.toLowerCase().includes("sewa kendaraan driver");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white">
        <p>Loading driver details...</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex justify-center items-center h-64 bg-white">
        <p>Driver not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header dengan tombol back */}
      {/*  <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back1
        </Button>
        <h1 className="text-2xl font-bold">Driver Detail</h1>
      </div>*/}

      {/* Card informasi driver */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Driver Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Driver Name</label>
              <p className="text-lg font-semibold">{driver.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                {getDriverStatusBadge(driver.driver_status)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Balance</label>
              <p className={`text-lg font-semibold ${(driver.saldo || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(driver.saldo || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs untuk Booking History dan Histori Transaksi */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="booking" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="booking">Booking History</TabsTrigger>
              <TabsTrigger value="transaksi">Histori Transaksi</TabsTrigger>
            </TabsList>

            {/* Tab Booking History */}
            <TabsContent value="booking">
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by code booking or vehicle..."
                    value={bookingSearchTerm}
                    onChange={(e) => {
                      setBookingSearchTerm(e.target.value);
                      setBookingPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <Select value={bookingStatusFilter} onValueChange={(value) => {
                  setBookingStatusFilter(value);
                  setBookingPage(1);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableCaption>Driver booking history</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No booking history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.code_booking || booking.id}
                        </TableCell>
                        <TableCell>
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </TableCell>
                        <TableCell>
                          {booking.vehicle
                            ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.license_plate})`
                            : "N/A"}
                        </TableCell>
                        <TableCell>{formatCurrency(booking.total_amount)}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <PaginationControls
                currentPage={bookingPage}
                totalPages={bookingTotalPages}
                onPageChange={setBookingPage}
                rowsPerPage={bookingRowsPerPage}
                onRowsPerPageChange={(rows) => {
                  setBookingRowsPerPage(rows);
                  setBookingPage(1);
                }}
              />
            </TabsContent>

            {/* Tab Histori Transaksi */}
            <TabsContent value="transaksi">
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by code booking, keterangan, or admin..."
                    value={transaksiSearchTerm}
                    onChange={(e) => {
                      setTransaksiSearchTerm(e.target.value);
                      setTransaksiPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <Select value={transaksiStatusFilter} onValueChange={(value) => {
                  setTransaksiStatusFilter(value);
                  setTransaksiPage(1);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableCaption>Histori transaksi driver</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Saldo Awal</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Saldo Akhir</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransaksi.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No transaction history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransaksi.map((transaksi) => {
                      const isSewaDriver = isSewaKendaraanDriver(transaksi.jenis_transaksi);
                      const nominalValue = isSewaDriver ? -Math.abs(transaksi.nominal) : transaksi.nominal;
                      
                      return (
                        <TableRow key={transaksi.id}>
                          <TableCell className="font-medium">
                            {formatDateTime(transaksi.trans_date)}
                          </TableCell>
                          <TableCell>{transaksi.code_booking}</TableCell>
                          <TableCell>
                            {getTransactionTypeBadge(transaksi.jenis_transaksi)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(transaksi.saldo_awal || 0)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            nominalValue < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {nominalValue < 0 ? '-' : '+'}{formatCurrency(Math.abs(nominalValue))}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${
                            transaksi.saldo_akhir < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(transaksi.saldo_akhir)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaksi.keterangan || '-'}
                          </TableCell>
                          <TableCell>
                            {getTransaksiStatusBadge(transaksi.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <PaginationControls
                currentPage={transaksiPage}
                totalPages={transaksiTotalPages}
                onPageChange={setTransaksiPage}
                rowsPerPage={transaksiRowsPerPage}
                onRowsPerPageChange={(rows) => {
                  setTransaksiRowsPerPage(rows);
                  setTransaksiPage(1);
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}