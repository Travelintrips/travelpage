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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Booking {
  id: string;
  kode_booking?: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  created_by_role?: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface BookingStats {
  totalCustomerToday: number;
  totalDriverToday: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export default function BookingManagement() {
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    totalCustomerToday: 0,
    totalDriverToday: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch all bookings
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user data for recent bookings
      const recentBookingsWithUsers = await Promise.all(
        (bookings || []).slice(0, 5).map(async (booking) => {
          const { data: userData } = await supabase
            .from("users")
            .select("full_name, email")
            .eq("id", booking.user_id)
            .single();

          return {
            ...booking,
            user: userData,
          };
        }),
      );

      setRecentBookings(recentBookingsWithUsers);

      // Calculate statistics
      const today = new Date().toISOString().split("T")[0];
      const todayBookings =
        bookings?.filter((booking) => booking.created_at.startsWith(today)) ||
        [];

      const customerBookingsToday = todayBookings.filter(
        (booking) => booking.created_by_role !== "Driver Perusahaan",
      ).length;

      const driverBookingsToday = todayBookings.filter(
        (booking) => booking.created_by_role === "Driver Perusahaan",
      ).length;

      const statusCounts = bookings?.reduce(
        (acc, booking) => {
          const status = booking.status.toLowerCase();
          if (status === "pending" || status === "booked") acc.pending++;
          else if (status === "confirmed") acc.confirmed++;
          else if (status === "completed") acc.completed++;
          else if (status === "cancelled") acc.cancelled++;
          return acc;
        },
        { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
      ) || { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

      setStats({
        totalCustomerToday: customerBookingsToday,
        totalDriverToday: driverBookingsToday,
        ...statusCounts,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
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
      case "onride":
        return <Badge className="bg-purple-500">Onride</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Booking Dashboard</h2>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Customer Hari Ini
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCustomerToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Driver Hari Ini
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDriverToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">5 Booking Terbaru</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{formatDate(booking.created_at)}</TableCell>
                  <TableCell>{booking.user?.full_name || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {booking.created_by_role === "Driver Perusahaan"
                        ? "Driver"
                        : "Customer"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            size="lg"
            className="h-16 text-lg bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
            onClick={() => navigate("/admin/bookings/customer")}
          >
            <Users className="h-6 w-6 mr-3" />
            Lihat Semua Booking Customer
            <ArrowRight className="h-5 w-5 ml-3" />
          </Button>

          <Button
            size="lg"
            className="h-16 text-lg bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
            onClick={() => navigate("/admin/bookings/driver")}
          >
            <CalendarDays className="h-6 w-6 mr-3" />
            Lihat Semua Booking Driver
            <ArrowRight className="h-5 w-5 ml-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
