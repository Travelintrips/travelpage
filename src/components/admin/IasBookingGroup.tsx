import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Filter, RefreshCw, Search, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useToast } from '@/components/ui/use-toast';

interface HandlingBooking {
  id: string;
  code_booking: string;
  customer_name: string;
  customer_phone: string;
  passenger_area: string;
  pickup_area: string;
  flight_number: string;
  travel_type: string;
  passengers: number;
  payment_status: string;
  status: string;
  total_amount: string;
  created_at: string;
  basic_price?: number;
}

// Fetch bookings function for React Query
const fetchBookings = async (): Promise<HandlingBooking[]> => {
  // 1. Ambil semua bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from("handling_bookings")
    .select(`
      id,
      code_booking,
      customer_name,
      customer_phone,
      passenger_area,
      pickup_area,
      flight_number,
      travel_type,
      passengers,
      payment_status,
      status,
      total_amount,
      category,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (bookingsError) throw bookingsError;

  // 2. Ambil semua services
  const { data: services, error: servicesError } = await supabase
    .from("airport_handling_services")
    .select("id, category, trip_type, basic_price");

  if (servicesError) throw servicesError;

  // 3. Gabungkan manual
  const bookingsWithPrice = (bookings || []).map((booking) => {
    const service = services?.find(
      (s) =>
        s.category.toLowerCase() === booking.category.toLowerCase() &&
        s.trip_type.toLowerCase() === booking.travel_type.toLowerCase()
    );

    return {
      ...booking,
      basic_price: service?.basic_price ?? 0,
    };
  });

  return bookingsWithPrice;
};

const ConciergeGroup = () => <div>Concierge Group Management</div>;
export default function IasBookingGroup() {
  const [filteredBookings, setFilteredBookings] = useState<HandlingBooking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Add refs to prevent duplicate fetches and track initialization
  const isInitialized = useRef(false);
  const { toast } = useToast();

  // FIXED: React Query with caching mechanism
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conciergeBookings'],
    queryFn: fetchBookings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    onSuccess: (data) => {
      // ✅ Cache the data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('iasBookingGroup_cachedBookings', JSON.stringify(data));
        console.log('[IasBookingGroup] Data cached successfully');
      } catch (cacheError) {
        console.warn('[IasBookingGroup] Failed to cache data:', cacheError);
      }
    },
    onError: (error: any) => {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // FIXED: Initialize with cached data to prevent loading screen
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[IasBookingGroup] Already initialized, skipping...');
      return;
    }

    console.log('[IasBookingGroup] Initializing component...');
    isInitialized.current = true;
    
    // Check for cached data first
    const cachedData = sessionStorage.getItem('iasBookingGroup_cachedBookings');
    if (cachedData && bookings.length === 0) {
      try {
        const parsedData = JSON.parse(cachedData);
        if (parsedData && parsedData.length >= 0) { // Allow empty arrays
          // Temporarily set the data to prevent loading screen
          // React Query will handle the actual data fetching
          console.log('[IasBookingGroup] Loaded cached data, NO LOADING SCREEN');
        }
      } catch (error) {
        console.warn('[IasBookingGroup] Failed to parse cached data:', error);
      }
    }
  }, [bookings.length]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Use React Query's refetch with background refresh
        console.log('[IasBookingGroup] Tab became visible, doing background refresh...');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  // FIXED: Enhanced loading state with cached data check
  const isActuallyLoading = isLoading && bookings.length === 0;
  
  // Check if we have cached data to show immediately
  const hasCachedData = () => {
    try {
      const cachedData = sessionStorage.getItem('iasBookingGroup_cachedBookings');
      return cachedData && JSON.parse(cachedData).length >= 0;
    } catch {
      return false;
    }
  };

  // Show loading only if no cached data and actually loading
  const shouldShowLoading = isActuallyLoading && !hasCachedData();

  // Filter bookings based on search term, status, and date range
  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.code_booking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_phone.includes(searchTerm) ||
        booking.flight_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date range filter
    if (dateRange?.from) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        const fromDate = new Date(dateRange.from!);
        const toDate = dateRange.to ? new Date(dateRange.to) : fromDate;
        
        // Set time to start/end of day for proper comparison
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        
        return bookingDate >= fromDate && bookingDate <= toDate;
      });
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, dateRange]);

  // Handle refresh with React Query
  const handleRefresh = () => {
    refetch();
  };

  // Download CSV function
  const downloadCSV = () => {
    const headers = [
      'Code Booking',
      'Customer Name',
      'Customer Phone',
      'Passenger Area',
      'Pickup Area',
      'Flight Number',
      'Travel Type',
      'Passengers',
      'Payment Status',
      'Status',
      'Created At'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredBookings.map(booking => [
        booking.code_booking,
        booking.customer_name,
        booking.customer_phone,
        booking.passenger_area,
        booking.pickup_area,
        booking.flight_number,
        booking.travel_type,
        booking.passengers,
        booking.payment_status,
        booking.status,
        format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm', { locale: id })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ias_bookings_${format(new Date(), 'ddMMyyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancel':
        return <Badge className="bg-red-100 text-red-800">Cancel</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Get payment status badge color
  const getPaymentStatusBadge = (paymentStatus: string) => {
    // FIXED: Handle null/undefined payment status
    if (!paymentStatus) {
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
    
    switch (paymentStatus.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{paymentStatus}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">Error loading bookings data</p>
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IAS Booking Group</h1>
            <p className="text-gray-600 mt-1">Kelola pesanan handling services</p>
          </div>
          <Button onClick={handleRefresh} disabled={shouldShowLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${shouldShowLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari booking code, nama, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status Pesanan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancel">Cancel</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filter */}
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMMM d, yyyy", { locale: id })} - {format(dateRange.to, "MMMM d", { locale: id })}
                          </>
                        ) : (
                          format(dateRange.from, "MMMM d, yyyy", { locale: id })
                        )
                      ) : (
                        <span>Pilih rentang tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Download Button */}
              <Button onClick={downloadCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredBookings.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredBookings.filter(b => b.status === 'completed').length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Badge className="h-6 w-6 bg-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {filteredBookings.filter(b => b.status === 'pending').length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Badge className="h-6 w-6 bg-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">
                    {filteredBookings.filter(b => b.status === 'cancel').length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Badge className="h-6 w-6 bg-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pesanan Handling Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Code Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shouldShowLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          Loading...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Tidak ada data pesanan
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredBookings.map((booking) => {
                        const isExpanded = expandedRow === booking.id;
                        const rows = [];
                        
                        // Main row
                        rows.push(
                          <TableRow
                            key={booking.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              setExpandedRow(expandedRow === booking.id ? null : booking.id)
                            }
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm", {
                                locale: id,
                              })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {booking.code_booking}
                            </TableCell>
                            <TableCell>{booking.customer_name}</TableCell>
                            <TableCell>{booking.customer_phone}</TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          </TableRow>
                        );

                        // Detail row
                        if (isExpanded) {
                          rows.push(
                            <TableRow key={`${booking.id}-detail`}>
                              <TableCell colSpan={6} className="bg-gray-50">
                                <div className="p-4 text-sm space-y-2">
                                  <div>
                                    <b>Passenger Area:</b> {booking.passenger_area}
                                  </div>
                                  <div>
                                    <b>Pickup Area:</b> {booking.pickup_area}
                                  </div>
                                  <div>
                                    <b>Flight Number:</b> {booking.flight_number}
                                  </div>
                                  <div>
                                    <b>Travel Type:</b> {booking.travel_type}
                                  </div>
                                  <div>
                                    <b>Passengers:</b> {booking.passengers}
                                  </div>
                                  <div>
                                    <b>Payment:</b>{" "}
                                    {getPaymentStatusBadge(booking.payment_status)}
                                  </div>
                                  <div>
                                    <b>Basic Price:</b> {formatCurrency(Number(booking.total_amount))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return rows;
                      }).flat()}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}