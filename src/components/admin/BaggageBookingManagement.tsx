import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  FileDown,
  Edit,
  Trash2,
  Package,
  Calendar as CalendarIcon,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface BaggageBooking {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  flight_number?: string;
  baggage_size: string;
  price: number;
  duration: number;
  duration_type: string;
  hours?: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  airport: string;
  terminal: string;
  storage_location?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

const BaggageBookingManagement = () => {
  const [bookings, setBookings] = useState<BaggageBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BaggageBooking[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [distinctCustomers, setDistinctCustomers] = useState<string[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Date range state
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const [selectedBooking, setSelectedBooking] = useState<BaggageBooking | null>(
    null,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { toast } = useToast();
  const { userRole } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("baggage_booking")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
      
      // Get distinct customers for filter
      const uniqueCustomers = [...new Set(data?.map(booking => booking.customer_name))].filter(Boolean).sort();
      setDistinctCustomers(uniqueCustomers);
      
      setFilteredBookings(data || []);
    } catch (error) {
      console.error("Error fetching baggage bookings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch baggage bookings",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings based on search, status, customer, and date range
  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (booking) =>
          booking.code_booking
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          booking.customer_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          booking.customer_email
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          booking.customer_phone?.includes(searchQuery),
      );
    }

    // Status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    // Customer filter
    if (customerFilter !== "All") {
      filtered = filtered.filter(
        (booking) => booking.customer_name === customerFilter,
      );
    }

    // Date range filter
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((booking) => {
        const bookingDate = new Date(booking.created_at);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;

        if (fromDate && toDate) {
          return bookingDate >= fromDate && bookingDate <= toDate;
        } else if (fromDate) {
          return bookingDate >= fromDate;
        } else if (toDate) {
          return bookingDate <= toDate;
        }
        return true;
      });
    }

    setFilteredBookings(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [bookings, searchQuery, statusFilter, customerFilter, dateRange]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentBookings = filteredBookings.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleViewDetails = (booking: BaggageBooking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    if (userRole !== "Super Admin") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only Super Admin can delete baggage bookings",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("baggage_booking")
        .delete()
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Baggage booking deleted successfully",
      });

      setIsDeleteOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete baggage booking",
      });
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("baggage_booking")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Status updated to ${newStatus}`,
      });

      fetchBookings();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status",
      });
    }
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

  const formatDetailDate = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return "N/A";
    
    try {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: timeStr ? 'numeric' : undefined,
        minute: timeStr ? 'numeric' : undefined,
        hour12: true
      };
      
      if (timeStr) {
        const [hours, minutes] = timeStr.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      const date = new Date(dateString);
      if (timeString) {
        const [hours, minutes] = timeString.split(":");
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      return format(date, "PPP p");
    } catch (e) {
      return dateString;
    }
  };

  const formatDateWithTime = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return "N/A";
    
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    let formattedDate = date.toLocaleDateString('en-US', options);
    
    if (timeStr) {
      formattedDate += ` ${timeStr}`;
    } else {
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      formattedDate += ` ${date.toLocaleTimeString('en-US', timeOptions)}`;
    }
    
    return formattedDate;
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Booking ID",
        "Customer Name",
        "Email",
        "Phone",
        "Baggage Size",
        "Price",
        "Duration",
        "Start Date",
        "End Date",
        "Airport",
        "Terminal",
        "Status",
        "Created At",
      ],
      ...filteredBookings.map((booking) => [
        booking.booking_id,
        booking.customer_name,
        booking.customer_email,
        booking.customer_phone,
        booking.baggage_size,
        booking.price,
        `${booking.duration} ${booking.duration_type}`,
        booking.start_date,
        booking.end_date,
        booking.airport,
        booking.terminal,
        booking.status,
        booking.created_at,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "baggage_bookings.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">
                Baggage Booking Management
              </CardTitle>
              <CardDescription>
                Manage all baggage storage bookings
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchBookings}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={exportToCSV}
                title="Export CSV"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="min-w-[200px]">
                <Label htmlFor="customer-filter" className="text-sm font-medium">
                  Customer
                </Label>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Customers</SelectItem>
                    {distinctCustomers.map((customer) => (
                      <SelectItem key={customer} value={customer}>
                        {customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[250px]">
                <Label htmlFor="date-range" className="text-sm font-medium">
                  Date Range
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-range"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to,
                      }}
                      onSelect={(range) => {
                        setDateRange({
                          from: range?.from,
                          to: range?.to,
                        });
                      }}
                      numberOfMonths={2}
                    />
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                        className="w-full"
                      >
                        Clear
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="min-w-[150px]">
                <Label htmlFor="status-filter" className="text-sm font-medium">
                  Status Booking
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

           {/*   <div className="flex items-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchBookings}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>*/}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium w-12"></th>
                    <th className="text-left py-3 px-4 font-medium">
                      Booking ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Duration
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center">
                        Loading bookings...
                      </td>
                    </tr>
                  ) : currentBookings.length > 0 ? (
                    currentBookings.flatMap((booking) => [
                      // Master Row
                      <tr key={`master-${booking.id}`} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
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
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">
                          {booking.code_booking}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {booking.customer_name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {booking.duration} {booking.duration_type}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {formatCurrency(booking.price)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(booking.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {booking.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, "confirmed")
                                  }
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, "cancelled")
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() =>
                                  handleUpdateStatus(booking.id, "completed")
                                }
                              >
                                Complete
                              </Button>
                            )}
                            {userRole === "Super Admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>,
                      
                      // Detail Row (conditionally rendered)
                      ...(expandedRows.has(booking.id) ? [
                        <tr key={`detail-${booking.id}`} className="bg-muted/20">
                          <td colSpan={7} className="py-4 px-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Phone:</span>
                                  <span>{booking.customer_phone || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Email:</span>
                                  <span>{booking.customer_email || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Baggage Size:</span>
                                  <span className="capitalize">
                                    {booking.baggage_size.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Start Date:</span>
                                  <span>{formatDetailDate(booking.start_date, booking.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">End Date:</span>
                                  <span>{formatDetailDate(booking.end_date, booking.end_time)}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Airport:</span>
                                  <span>{booking.airport || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Terminal:</span>
                                  <span>{booking.terminal || "N/A"}</span>
                                </div>
                                <div className="flex flex-col">
                                <span className="font-medium">Payment Method</span>
                                <span>
                                {booking.payment_method
                                ? booking.payment_method.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                                : "N/A"}
                                </span>
                                <span>{booking.bank_name || "N/A"}</span>
                                {booking.account_number && <span>{booking.account_number}</span>}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                               <div className="flex items-center gap-2">
                                  <span className="font-medium">Created:</span>
                                  <span>{formatDetailDate(booking.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Updated:</span>
                                  <span>{formatDetailDate(booking.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ] : [])
                    ])
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No baggage bookings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredBookings.length)} to{" "}
                {Math.min(currentPage * rowsPerPage, filteredBookings.length)} of{" "}
                {filteredBookings.length} entries
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page:
                </Label>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Baggage Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this baggage booking? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <p>
                <span className="font-medium">Booking ID:</span>{" "}
                {selectedBooking.code_booking}
              </p>
              <p>
                <span className="font-medium">Customer:</span>{" "}
                {selectedBooking.customer_name}
              </p>
              <p>
                <span className="font-medium">Size:</span>{" "}
                <span className="capitalize">
                  {selectedBooking.baggage_size.replace("_", " ")}
                </span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBooking}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaggageBookingManagement;