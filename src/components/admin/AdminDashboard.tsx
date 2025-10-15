import React, { useState, useEffect, useRef } from 'react';
import {
  Link,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import {
  Users,
  Car,
  CalendarDays,
  DollarSign,
  BarChart3,
  Activity,
  User,
  UserCog,
  CreditCard,
  ClipboardCheck,
  AlertTriangle,
  Menu,
  X,
  ArrowLeft,
  Search,
  FileDown,
  Filter,
  SortAsc,
  SortDesc,
  Wrench,
  CarFront,
  Calendar,
  CreditCard as CreditCardIcon,
  Key,
  Luggage,
  Plane,

} from "lucide-react";
import CustomerManagement from "./CustomerManagement";
import DriverManagement from "./DriverManagement";
import CarsManagement from "./CarsManagement";
import Payments from "./Payments";
import BookingManagement from "./BookingManagement";
import StaffPage from "./StaffPage";
import StatCard from "./StatCard";
import DashboardCharts from "./DashboardCharts";
import VehicleInventory from "./VehicleInventory";
import PurchaseRequestManagement from "./PurchaseRequestManagement";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalVehicles: number;
  totalhandlingBooking: number;
  totalbaggageBooking: number;
  totalairportTransfer: number;
  bookedVehicles: number;
  onRideVehicles: number;
  maintenanceVehicles: number;
  availableVehicles: number;
  totalPayments: {
    count: number;
    amount: number;
    monthlyAmount: number;
  };
  totalUnpaid: {
    count: number;
    amount: number;
  };
}

interface ChartData {
  vehicleStatusData: { name: string; value: number }[];
  paymentData: { name: string; paid: number; unpaid: number }[];
  bookingTrendData: { date: string; bookings: number }[];
  paymentMethodData: { name: string; value: number }[];
}

interface BookingData {
  id: string;
  vehicleType: string;
  bookingStatus: "Booked" | "On Ride" | "Completed" | "Cancelled";
  paymentStatus: "Paid" | "Partial" | "Unpaid";
  nominalPaid: number;
  nominalUnpaid: number;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  staffName: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface FilterOptions {
  date: string;
  vehicleType: string;
  bookingStatus: string;
  paymentType: string;
}

export default function AdminDashboard() {
  const { user, userRole } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalVehicles: 0,
    totalhandlingBooking: 0,
    totalbaggageBooking: 0,
    totalairportTransfer: 0,
    bookedVehicles: 0,
    onRideVehicles: 0,
    maintenanceVehicles: 0,
    availableVehicles: 0,
    totalPayments: {
      count: 0,
      amount: 0,
      monthlyAmount: 0,
    },
    totalUnpaid: {
      count: 0,
      amount: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const [chartData, setChartData] = useState<ChartData>({
    vehicleStatusData: [],
    paymentData: [],
    bookingTrendData: [],
    paymentMethodData: [],
  });

  const [bookingData, setBookingData] = useState<BookingData[]>([]);
  const [filteredBookingData, setFilteredBookingData] = useState<BookingData[]>(
    [],
  );
  const [selectedChartTab, setSelectedChartTab] = useState(() => {
    return sessionStorage.getItem('adminDashboardSelectedTab') || 'vehicles';
  });
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    date: "",
    vehicleType: "",
    bookingStatus: "",
    paymentType: "",
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof BookingData | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });
  
  // Add ref to track if fetch is in progress
  const [isFetching, setIsFetching] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Show limited dashboard content for Staff Trips role
  const shouldShowFullDashboard = userRole !== "Staff Trips";
  

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Save selected chart tab to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('adminDashboardSelectedTab', selectedChartTab);
  }, [selectedChartTab]);

  


  // FIXED: Fetch data when auth is ready and authenticated with proper caching
  useEffect(() => {
    if (!user || !userRole) {
      console.log("[AdminDashboard] User or role not ready yet");
      return;
    }

    if (hasFetched.current) {
      console.log("[AdminDashboard] Skipping duplicate fetch");
      return;
    }
    hasFetched.current = true;

    console.log("[AdminDashboard] Auth ready, checking cached data...");
    
    // Check if we have cached data
    if (dashboardData) {
      console.log("[AdminDashboard] Loaded cached data, NO LOADING SCREEN");
      setLoading(false);
      return;
    }

    // Fetch fresh data
    fetchDashboardData();
  }, [user, userRole, dashboardData]);

  // FIXED: Add visibility change handler with proper debouncing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && userRole && userRole !== "Staff Trips") {
        console.log('[AdminDashboard] Tab became visible, refetching dashboard data...');
        
        // Always do background refresh when tab becomes visible
        fetchDashboardData(true); // Background refresh without loading spinner
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, userRole]);

  // FIXED: Modified fetchDashboardData with proper loading state management, caching, and retry logic
  const fetchDashboardData = async (isBackgroundRefresh = false, retryCount = 0) => {
    // Don't fetch if not authenticated or if Staff Trips or already fetching
    if (!user || !userRole || userRole === "Staff Trips" || isFetching) {
      console.log('[AdminDashboard] Skipping fetch - auth not ready, Staff Trips user, or already fetching');
      return;
    }

    // Prevent duplicate fetches
    setIsFetching(true);

    try {
      // Only show loading spinner for initial load, not background refresh
      if (!isBackgroundRefresh && (dashboardStats.totalVehicles === 0)) {
        setLoading(true);
      }

      console.log('[AdminDashboard] Starting dashboard data fetch...');

      // FIXED: Add retry logic for network failures
      const fetchWithRetry = async (query, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await query();
            return result;
          } catch (error) {
            console.warn(`[AdminDashboard] Fetch attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
              throw error;
            }
            
            // Wait before retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(attempt - 1, 2), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      // Fetch vehicles data with retry
      const { data: vehicles, error: vehiclesError } = await fetchWithRetry(() => 
        supabase.from("vehicles").select("*")
      );

      if (vehiclesError) throw vehiclesError;

      console.log("Vehicles data:", vehicles); // Debug log to check vehicles data

      // Fetch all required data separately to avoid foreign key issues
      // Only fetch users data if user is Admin to avoid permission issues
      const fetchPromises = [
        () => supabase.from("bookings").select("*"),
        () => supabase.from("customers").select("*"),
        () => supabase.from("handling_bookings").select("*"), // Add handling_bookings fetch
        () => supabase.from("baggage_booking").select("*"),
        () => supabase.from ("airport_transfer").select("*"),
      ];

      // Only fetch staff and users data if user has admin privileges
      if (userRole === "Admin") {
        fetchPromises.push(() => supabase.from("staff").select("*"));
        fetchPromises.push(() => supabase.from("users").select("*"));
      }

      const results = await Promise.all(
        fetchPromises.map(query => fetchWithRetry(query))
      );
      
      let bookingsResult, customersResult, handlingBookingsResult, baggageBookingsResult,airportTransferResult, staffResult, usersResult;

      if (userRole === "Admin") {
        [bookingsResult, customersResult, handlingBookingsResult, baggageBookingsResult,airportTransferResult, staffResult, usersResult] = results;
      } else {
        [bookingsResult, customersResult, handlingBookingsResult, baggageBookingsResult,airportTransferResult] = results;
        staffResult = { data: [], error: null };
        usersResult = { data: [], error: null };
      }

      if (bookingsResult?.error) {
        console.error("Error fetching bookings:", bookingsResult.error);
        throw bookingsResult.error;
      }
      if (customersResult?.error) {
        console.error("Error fetching customers:", customersResult.error);
        throw customersResult.error;
      }
      if (airportTransferResult?.error) {
        console.error("Error fetching airport_transfer:", airportTransferResult.error);
        throw airportTransferResult.error;
      }
      if (handlingBookingsResult?.error) {
        console.error("Error fetching handling_bookings:", handlingBookingsResult.error);
        throw handlingBookingsResult.error;
      }
      if (baggageBookingsResult?.error) {
        console.error("Error fetching baggage_booking:", baggageBookingsResult.error);
        throw baggageBookingsResult.error;
      }
      if (staffResult?.error) {
        console.error("Error fetching staff:", staffResult.error);
        throw staffResult.error;
      }
      if (usersResult?.error) {
        console.error("Error fetching users:", usersResult.error);
        throw usersResult.error;
      }

      const bookings = bookingsResult?.data || [];
      const customers = customersResult?.data || [];
      const handlingBookings = handlingBookingsResult?.data || [];
      const baggageBookings = baggageBookingsResult?.data || [];
      const airportTransfer = airportTransferResult?.data || [];
      const staff = staffResult?.data || [];
      const users = usersResult?.data || [];

      console.log("Bookings data:", bookings); // Debug log
      console.log("Customers data:", customers); // Debug log
      console.log("Handling bookings data:", handlingBookings); // Debug log
      console.log("Baggage bookings data:", baggageBookings); // Debug log
      console.log("Staff data:", staff); // Debug log
      console.log("Users data:", users); // Debug log

      // Fetch payments data with retry
      const { data: payments, error: paymentsError } = await fetchWithRetry(() =>
        supabase.from("payments").select("*")
      );

      if (paymentsError) throw paymentsError;

      // Get current month payments with retry
      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).toISOString();

      const { data: monthlyPayments, error: monthlyPaymentsError } = await fetchWithRetry(() =>
        supabase
          .from("payments")
          .select("*")
          .gte("created_at", startOfMonth)
          .lte("created_at", endOfMonth)
      );

      if (monthlyPaymentsError) throw monthlyPaymentsError;
      const totalhandlingBooking = handlingBookings?.length || 0;
      const totalbaggageBooking = baggageBookings?.length || 0;
      const totalairportTransfer = airportTransfer?.length || 0;
      // Calculate dashboard statistics from real data
      const totalVehicles = vehicles?.length || 0;

      // Get all vehicles that don't have 'available' status
      const bookedVehicles = 
        vehicles?.filter(
          (vehicle) => 
            vehicle.status !== "available" && vehicle.status !== "available",
        ).length || 0;

      const onRideVehicles = 
        bookings?.filter(
          (booking) => booking.status.toLowerCase() === "onride",
        ).length || 0;

      const maintenanceVehicles = 
        vehicles?.filter((vehicle) => vehicle.status === "maintenance")
          .length || 0;

      // Only count vehicles where is_available is true
      const availableVehiclesCount = 
        vehicles?.filter(
          (vehicle) => 
            vehicle.is_available === true || vehicle.is_available === "true",
        ).length || 0;

      console.log("Available vehicles count:", availableVehiclesCount);
      console.log(
        "Vehicles with status=true:",
        vehicles?.filter((vehicle) => vehicle.status === true).length || 0,
      );
      console.log(
        "Vehicles with is_available=true:",
        vehicles?.filter((vehicle) => vehicle.is_available === true).length ||
          0,
      );
      console.log(
        "Vehicles with available=true:",
        vehicles?.filter((vehicle) => vehicle.available === true).length || 0,
      );

      const paidPayments = 
        payments?.filter(
          (payment) => 
            payment.status === "Paid" || payment.status === "Completed",
        ) || [];

      const unpaidPayments = 
        payments?.filter(
          (payment) => 
            payment.status === "Unpaid" || payment.status === "Partial",
        ) || [];

      const totalPaidAmount = paidPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );

      const totalUnpaidAmount = unpaidPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );

      // Calculate monthly payments total
      const monthlyPaidPayments = 
        monthlyPayments?.filter(
          (payment) => 
            payment.status === "Paid" || payment.status === "Completed",
        ) || [];

      const monthlyTotalAmount = monthlyPaidPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0,
      );

      // Prepare chart data
      // 1. Vehicle Status Pie Chart
      const vehicleStatusData = [
        { name: "Booked", value: bookedVehicles },
        { name: "On Ride", value: onRideVehicles },
        { name: "Available", value: availableVehiclesCount },
        { name: "Maintenance", value: maintenanceVehicles },
      ];

      // 2. Payment Data for Bar Chart
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const paymentData = [];

      // Group payments by month
      const paidByMonth = {};
      const unpaidByMonth = {};

      // Initialize all months with zero
      months.forEach((month) => {
        paidByMonth[month] = 0;
        unpaidByMonth[month] = 0;
      });

      // Aggregate paid payments by month
      paidPayments.forEach((payment) => {
        if (payment.created_at) {
          const date = new Date(payment.created_at);
          const month = months[date.getMonth()];
          paidByMonth[month] += payment.amount || 0;
        }
      });

      // Aggregate unpaid payments by month
      unpaidPayments.forEach((payment) => {
        if (payment.created_at) {
          const date = new Date(payment.created_at);
          const month = months[date.getMonth()];
          unpaidByMonth[month] += payment.amount || 0;
        }
      });

      // Create payment data array for chart
      months.forEach((month) => {
        paymentData.push({
          name: month,
          paid: paidByMonth[month],
          unpaid: unpaidByMonth[month],
        });
      });

      // 3. Booking Trend Line Chart
      const bookingsByDate = {};
      const last30Days = [];

      // Generate last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        bookingsByDate[dateStr] = 0;
        last30Days.push(dateStr);
      }

      // Count bookings by date
      bookings?.forEach((booking) => {
        if (booking.created_at) {
          const dateStr = new Date(booking.created_at)
            .toISOString()
            .split("T")[0];
          if (bookingsByDate[dateStr] !== undefined) {
            bookingsByDate[dateStr] += 1;
          }
        }
      });

      const bookingTrendData = last30Days.map((date) => ({
        date: date,
        bookings: bookingsByDate[date],
      }));

      // 4. Payment Method Doughnut Chart
      const paymentMethodCounts = {
        Cash: 0,
        "Bank Transfer": 0,
        "Credit Card": 0,
        "Debit Card": 0,
        Other: 0,
      };

      payments?.forEach((payment) => {
        const method = payment.payment_method || "Other";
        if (paymentMethodCounts[method] !== undefined) {
          paymentMethodCounts[method] += 1;
        } else {
          paymentMethodCounts["Other"] += 1;
        }
      });

      const paymentMethodData = Object.entries(paymentMethodCounts).map(
        ([name, value]) => ({
          name,
          value,
        }),
      );


      // Prepare booking table data
      const bookingTableData: BookingData[] = bookings?.map((booking) => {
        // Find customer data
        const customer = customers?.find(c => c.user_id === booking.user_id);
        const user = users?.find(u => u.id === booking.user_id);
        
        // Find staff data if available
        const staffMember = staff?.find(s => s.user_id === booking.staff_id);
        
        // Find payment data for this booking
        const bookingPayments = payments?.filter(p => p.booking_id === booking.id) || [];
        const paidAmount = bookingPayments
          .filter(p => p.status === 'Paid' || p.status === 'Completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        const unpaidAmount = bookingPayments
          .filter(p => p.status === 'Unpaid' || p.status === 'Partial')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
          id: booking.id,
          vehicleType: booking.vehicle_type || 'Unknown',
          bookingStatus: booking.status === 'confirmed' ? 'Booked' : 
                        booking.status === 'onride' ? 'On Ride' :
                        booking.status === 'completed' ? 'Completed' : 'Cancelled',
          paymentStatus: paidAmount > 0 && unpaidAmount === 0 ? 'Paid' :
                        paidAmount > 0 && unpaidAmount > 0 ? 'Partial' : 'Unpaid',
          nominalPaid: paidAmount,
          nominalUnpaid: unpaidAmount,
          customer: customer?.full_name || user?.full_name || 'Unknown Customer',
          customerEmail: customer?.email || user?.email || '',
          customerPhone: customer?.phone_number || user?.phone || '',
          staffName: staffMember?.full_name || null,
          startDate: booking.start_date || booking.created_at,
          endDate: booking.end_date || booking.created_at,
          createdAt: booking.created_at,
        };
      }) || [];

      // Set dashboard stats with real data
      const newDashboardStats = {
        totalVehicles,
        totalhandlingBooking,
        totalbaggageBooking,
        totalairportTransfer,
        bookedVehicles,
        onRideVehicles,
        maintenanceVehicles,
        availableVehicles: availableVehiclesCount,
        totalPayments: {
          count: paidPayments.length,
          amount: totalPaidAmount,
          monthlyAmount: monthlyTotalAmount,
        },
        totalUnpaid: {
          count: unpaidPayments.length,
          amount: totalUnpaidAmount,
        },
      };

      // Set chart data
      const newChartData = {
        vehicleStatusData,
        paymentData,
        bookingTrendData,
        paymentMethodData,
      };

      setDashboardStats(newDashboardStats);
      setChartData(newChartData);
      setBookingData(bookingTableData);
      setFilteredBookingData(bookingTableData);
      
      // Cache the data for future use
      sessionStorage.setItem('adminDashboard_cachedStats', JSON.stringify(newDashboardStats));
      sessionStorage.setItem('adminDashboard_cachedChartData', JSON.stringify(newChartData));
      sessionStorage.setItem('adminDashboard_cachedBookingData', JSON.stringify(bookingTableData));
      
      console.log('[AdminDashboard] Dashboard data fetch completed successfully');
    } catch (error) {
      console.error("[AdminDashboard] Error fetching dashboard data:", error);

      // FIXED: Better error handling - check if it's a network error
      const isNetworkError = error?.message?.includes('Failed to fetch') || 
                            error?.message?.includes('NetworkError') ||
                            error?.message?.includes('fetch');

      if (isNetworkError && retryCount < 2) {
        console.log(`[AdminDashboard] Network error detected, retrying... (attempt ${retryCount + 1})`);
        
        // Wait before retry
        setTimeout(() => {
          fetchDashboardData(isBackgroundRefresh, retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
        
        return; // Don't reset loading state yet
      }

      // FIXED: Don't reset data to zero on error, just log the error
      console.warn("[AdminDashboard] Keeping existing data due to fetch error");
      
      // Show user-friendly error message for network issues
      if (isNetworkError) {
        console.warn("[AdminDashboard] Network connectivity issue detected. Using cached data if available.");
      }
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      setIsFetching(false);
    }
  };
  

  return (
    <div className="bg-background">
      <div className="p-8">
        {/* Show different content based on user role */}
        {userRole === "Staff Trips" ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <Plane className="h-16 w-16 mx-auto text-primary-tosca mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Staff Trips Dashboard
              </h2>
              <p className="text-gray-600 mb-8">
                Access your assigned services using the menu on the left.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <Link
                  to="/admin/airport-transfer"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plane className="h-8 w-8 text-primary-tosca mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">
                    Airport Transfer
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage airport transfers
                  </p>
                </Link>
                <Link
                  to="/admin/baggage-booking"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Luggage className="h-8 w-8 text-primary-tosca mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">Baggage Service</h3>
                  <p className="text-sm text-gray-600">
                    Handle baggage bookings
                  </p>
                </Link>
                <Link
                  to="/admin/handling-booking"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-8 w-8 text-primary-tosca mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">
                    Handling Service
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage handling services
                  </p>
                </Link>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card
                key={i}
                className="bg-white dark:bg-gray-800 h-32 animate-pulse border-0 shadow-lg overflow-hidden"
                style={{
                  borderRadius: "16px",
                  boxShadow:
                    "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                }}
              >
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <StatCard
                title="Airport Transfer1"
                value={dashboardStats.totalairportTransfer}
                description="Airport Transfer"
                icon={<User className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/airport-transfer"
                bgColor="linear-gradient(135deg, #5EFB3F 0%, #46FCE7 100%)"
              />
            <StatCard
                title="Baggage Booking"
                value={dashboardStats.totalbaggageBooking}
                description="Baggage Booking"
                icon={<User className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/baggage-booking"
                bgColor="linear-gradient(135deg, #833AB4 0%,#FD1D1D 50%, #FCB045 100%)"
              />
            <StatCard
                title="Handling Booking"
                value={dashboardStats.totalhandlingBooking}
                description="Handling Booking"
                icon={<User className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/handling-booking"
                bgColor="linear-gradient(135deg, #22C1C3 0%, #FDBB2D 100%)"
              />
              <StatCard
                title="Total Vehicles"
                value={dashboardStats.totalVehicles}
                description="Total vehicles in fleet"
                icon={<Car className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/cars"
                bgColor="linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)"
              />
              <StatCard
                title="Available Vehicles"
                value={dashboardStats.availableVehicles}
                description="Vehicles available for booking"
                icon={<Car className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/cars?is_available=true"
                bgColor="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
              />
              <StatCard
                title="Booked Vehicles"
                value={dashboardStats.bookedVehicles}
                description="Vehicles with confirmed booking status"
                icon={<Calendar className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/bookings?status=confirmed"
                bgColor="linear-gradient(135deg, #34d399 0%, #10b981 100%)"
              />

              <StatCard
                title="Onride Vehicles"
                value={dashboardStats.onRideVehicles}
                description="Vehicles currently on ride"
                icon={<CarFront className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/bookings?status=onride"
                bgColor="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
              />

              <StatCard
                title="Maintenance"
                value={dashboardStats.maintenanceVehicles}
                description="Vehicles under maintenance"
                icon={<Wrench className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/cars?status=maintenance"
                bgColor="linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
              />

              <StatCard
                title="Total Not Paid"
                value={dashboardStats.totalUnpaid.count}
                description={`${dashboardStats.totalUnpaid.amount.toLocaleString()} pending`}
                icon={<CreditCardIcon className="h-6 w-6" />}
                trend="neutral"
                trendValue=""
                to="/admin/payments?status=unpaid"
                bgColor="linear-gradient(135deg, #fb7185 0%, #e11d48 100%)"
              />
            </div>
            

            {/* Charts Section */}
            
            <DashboardCharts
              vehicleStatusData={chartData.vehicleStatusData}
              paymentData={chartData.paymentData}
              bookingTrendData={chartData.bookingTrendData}
              paymentMethodData={chartData.paymentMethodData}
              isLoading={loading}
              selectedTab={selectedChartTab}
              onTabChange={setSelectedChartTab}
            />
 
            {/* Vehicle Inventory Section */}
            
           <div className="mt-8">
              <Card>
          {   /*   <CardHeader>*/}
             {/*     <CardTitle>Detailed Booking Data</CardTitle>
                  <CardDescription>
                    Comprehensive view of all bookings with filtering and
                    sorting options
                  </CardDescription>*/}

                  {/* Filtering Controls */}
             {/*     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Date Filter
                      </label>
                      <Input
                        type="date"
                        value={filterOptions.date}
                        onChange={(e) =>
                          setFilterOptions({
                            ...filterOptions,
                            date: e.target.value,
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Vehicle Type
                      </label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filterOptions.vehicleType}
                        onChange={(e) =>
                          setFilterOptions({
                            ...filterOptions,
                            vehicleType: e.target.value,
                          })
                        }
                      >
                        <option value="">All Types</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="MPV">MPV</option>
                        <option value="Hatchback">Hatchback</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Booking Status
                      </label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filterOptions.bookingStatus}
                        onChange={(e) =>
                          setFilterOptions({
                            ...filterOptions,
                            bookingStatus: e.target.value,
                          })
                        }
                      >
                        <option value="">All Statuses</option>
                        <option value="Booked">Booked</option>
                        <option value="On Ride">On Ride</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Payment Status
                      </label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={filterOptions.paymentType}
                        onChange={(e) =>
                          setFilterOptions({
                            ...filterOptions,
                            paymentType: e.target.value,
                          })
                        }
                      >
                        <option value="">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                  </div>*/}

                  {/* Search and Reset Filters */}
             {/*     <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by customer name..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterOptions({
                          date: "",
                          vehicleType: "",
                          bookingStatus: "",
                          paymentType: "",
                        });
                        setSearchQuery("");
                        setFilteredBookingData(bookingData);
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        let filtered = [...bookingData];

                        // Apply date filter
                        if (filterOptions.date) {
                          filtered = filtered.filter((booking) => {
                            return (
                              booking.startDate.includes(filterOptions.date) ||
                              booking.endDate.includes(filterOptions.date) ||
                              booking.createdAt.includes(filterOptions.date)
                            );
                          });
                        }

                        // Apply vehicle type filter
                        if (filterOptions.vehicleType) {
                          filtered = filtered.filter(
                            (booking) =>
                              booking.vehicleType === filterOptions.vehicleType,
                          );
                        }

                        // Apply booking status filter
                        if (filterOptions.bookingStatus) {
                          filtered = filtered.filter(
                            (booking) =>
                              booking.bookingStatus ===
                              filterOptions.bookingStatus,
                          );
                        }

                        // Apply payment status filter
                        if (filterOptions.paymentType) {
                          filtered = filtered.filter(
                            (booking) =>
                              booking.paymentStatus ===
                              filterOptions.paymentType,
                          );
                        }

                        // Apply search query
                        if (searchQuery) {
                          const query = searchQuery.toLowerCase();
                          filtered = filtered.filter(
                            (booking) =>
                              booking.customer.toLowerCase().includes(query) ||
                              booking.id.toLowerCase().includes(query),
                          );
                        }

                        setFilteredBookingData(filtered);
                      }}
                    >
                      Apply Filters
                    </Button>
                  </div>*/}
             {/*   </CardHeader>*/}

        { /*       <CardContent>
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50 font-medium">
                            <th className="py-3 px-4 text-left">
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => {
                                  if (sortConfig.key === "vehicleType") {
                                    setSortConfig({
                                      key: "vehicleType",
                                      direction:
                                        sortConfig.direction === "asc"
                                          ? "desc"
                                          : "asc",
                                    });
                                  } else {
                                    setSortConfig({
                                      key: "vehicleType",
                                      direction: "asc",
                                    });
                                  }
                                }}
                              >
                                Vehicle Type
                                {sortConfig.key === "vehicleType" &&
                                  (sortConfig.direction === "asc" ? (
                                    <SortAsc className="h-4 w-4" />
                                  ) : (
                                    <SortDesc className="h-4 w-4" />
                                  ))}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left">
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => {
                                  if (sortConfig.key === "bookingStatus") {
                                    setSortConfig({
                                      key: "bookingStatus",
                                      direction:
                                        sortConfig.direction === "asc"
                                          ? "desc"
                                          : "asc",
                                    });
                                  } else {
                                    setSortConfig({
                                      key: "bookingStatus",
                                      direction: "asc",
                                    });
                                  }
                                }}
                              >
                                Booking Status
                                {sortConfig.key === "bookingStatus" &&
                                  (sortConfig.direction === "asc" ? (
                                    <SortAsc className="h-4 w-4" />
                                  ) : (
                                    <SortDesc className="h-4 w-4" />
                                  ))}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left">
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => {
                                  if (sortConfig.key === "paymentStatus") {
                                    setSortConfig({
                                      key: "paymentStatus",
                                      direction:
                                        sortConfig.direction === "asc"
                                          ? "desc"
                                          : "asc",
                                    });
                                  } else {
                                    setSortConfig({
                                      key: "paymentStatus",
                                      direction: "asc",
                                    });
                                  }
                                }}
                              >
                                Payment Status
                                {sortConfig.key === "paymentStatus" &&
                                  (sortConfig.direction === "asc" ? (
                                    <SortAsc className="h-4 w-4" />
                                  ) : (
                                    <SortDesc className="h-4 w-4" />
                                  ))}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left">
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => {
                                  if (sortConfig.key === "nominalPaid") {
                                    setSortConfig({
                                      key: "nominalPaid",
                                      direction:
                                        sortConfig.direction === "asc"
                                          ? "desc"
                                          : "asc",
                                    });
                                  } else {
                                    setSortConfig({
                                      key: "nominalPaid",
                                      direction: "asc",
                                    });
                                  }
                                }}
                              >
                                Nominal Paid
                                {sortConfig.key === "nominalPaid" &&
                                  (sortConfig.direction === "asc" ? (
                                    <SortAsc className="h-4 w-4" />
                                  ) : (
                                    <SortDesc className="h-4 w-4" />
                                  ))}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left">
                              <div
                                className="flex items-center gap-1 cursor-pointer"
                                onClick={() => {
                                  if (sortConfig.key === "nominalUnpaid") {
                                    setSortConfig({
                                      key: "nominalUnpaid",
                                      direction:
                                        sortConfig.direction === "asc"
                                          ? "desc"
                                          : "asc",
                                    });
                                  } else {
                                    setSortConfig({
                                      key: "nominalUnpaid",
                                      direction: "asc",
                                    });
                                  }
                                }}
                              >
                                Nominal Unpaid
                                {sortConfig.key === "nominalUnpaid" &&
                                  (sortConfig.direction === "asc" ? (
                                    <SortAsc className="h-4 w-4" />
                                  ) : (
                                    <SortDesc className="h-4 w-4" />
                                  ))}
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left">Customer</th>
                            <th className="py-3 px-4 text-left">Staff</th>
                            <th className="py-3 px-4 text-left">Dates</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookingData.length > 0 ? (
                            // Sort the data based on the sort configuration
                            [...filteredBookingData]
                              .sort((a, b) => {
                                if (!sortConfig.key) return 0;

                                const aValue = a[sortConfig.key];
                                const bValue = b[sortConfig.key];

                                if (aValue < bValue) {
                                  return sortConfig.direction === "asc"
                                    ? -1
                                    : 1;
                                }
                                if (aValue > bValue) {
                                  return sortConfig.direction === "asc"
                                    ? 1
                                    : -1;
                                }
                                return 0;
                              })
                              .map((booking) => (
                                <tr
                                  key={booking.id}
                                  className="border-b hover:bg-muted/50 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    {booking.vehicleType}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        booking.bookingStatus === "Completed"
                                          ? "bg-green-100 text-green-800"
                                          : booking.bookingStatus === "On Ride"
                                            ? "bg-blue-100 text-blue-800"
                                            : booking.bookingStatus === "Booked"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {booking.bookingStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        booking.paymentStatus === "Paid"
                                          ? "bg-green-100 text-green-800"
                                          : booking.paymentStatus === "Partial"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {booking.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    {new Intl.NumberFormat("id-ID", {
                                      style: "currency",
                                      currency: "IDR",
                                      minimumFractionDigits: 0,
                                    }).format(booking.nominalPaid)}
                                  </td>
                                  <td className="py-3 px-4">
                                    {new Intl.NumberFormat("id-ID", {
                                      style: "currency",
                                      currency: "IDR",
                                      minimumFractionDigits: 0,
                                    }).format(booking.nominalUnpaid)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {booking.customer}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {booking.customerEmail}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {booking.customerPhone}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {booking.staffName ? (
                                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                        {booking.staffName}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">
                                        No staff assigned
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="text-xs">
                                      <div>
                                        Start:{" "}
                                        {new Date(
                                          booking.startDate,
                                        ).toLocaleDateString()}
                                      </div>
                                      <div>
                                        End:{" "}
                                        {new Date(
                                          booking.endDate,
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                className="py-6 text-center text-muted-foreground"
                              >
                                No bookings found matching the current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>*/}
              </Card>
            </div>
            
          </>
        )}
      </div>
    </div>
        
  );
}