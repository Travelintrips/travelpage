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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Calendar,
  RefreshCw,
  FileDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface BaggageBooking {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  baggage_size: string;
  price: number;
  duration: number;
  duration_type: string;
  start_date: string;
  end_date: string;
  airport: string;
  terminal: string;
  status: string;
  created_at: string;
}

interface ChartData {
  name: string;
  value: number;
  count?: number;
}

interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const ChartManagement = () => {
  const [bookings, setBookings] = useState<BaggageBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [statusData, setStatusData] = useState<ChartData[]>([]);
  const [sizeData, setSizeData] = useState<ChartData[]>([]);
  const [airportData, setAirportData] = useState<ChartData[]>([]);
  const { toast } = useToast();

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
      processChartData(data || []);
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

  const processChartData = (data: BaggageBooking[]) => {
    // Process daily stats for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayBookings = data.filter((booking) => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      });

      return {
        date: format(date, "MMM dd"),
        orders: dayBookings.length,
        revenue: dayBookings.reduce((sum, booking) => sum + booking.price, 0),
      };
    }).reverse();

    setDailyStats(last7Days);

    // Process status distribution
    const statusCounts = data.reduce(
      (acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statusChartData = Object.entries(statusCounts).map(
      ([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }),
    );

    setStatusData(statusChartData);

    // Process baggage size distribution
    const sizeCounts = data.reduce(
      (acc, booking) => {
        const size = booking.baggage_size.replace("_", " ");
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const sizeChartData = Object.entries(sizeCounts).map(([size, count]) => ({
      name: size.charAt(0).toUpperCase() + size.slice(1),
      value: count,
    }));

    setSizeData(sizeChartData);

    // Process airport distribution
    const airportCounts = data.reduce(
      (acc, booking) => {
        acc[booking.airport] = (acc[booking.airport] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const airportChartData = Object.entries(airportCounts).map(
      ([airport, count]) => ({
        name: airport,
        value: count,
      }),
    );

    setAirportData(airportChartData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + booking.price,
    0,
  );
  const totalOrders = bookings.length;
  const uniqueCustomers = new Set(bookings.map((b) => b.customer_email)).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const exportChartData = () => {
    const csvContent = [
      ["Date", "Orders", "Revenue"],
      ...dailyStats.map((stat) => [stat.date, stat.orders, stat.revenue]),
      [],
      ["Status", "Count"],
      ...statusData.map((item) => [item.name, item.value]),
      [],
      ["Baggage Size", "Count"],
      ...sizeData.map((item) => [item.name, item.value]),
      [],
      ["Airport", "Count"],
      ...airportData.map((item) => [item.name, item.value]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "chart_data.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary-tosca to-primary-dark bg-clip-text text-transparent">
            Orders Chart Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for all orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBookings}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportChartData}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              All baggage bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Total earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unique Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">Different customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Orders & Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Orders & Revenue (Last 7 Days)
            </CardTitle>
            <CardDescription>Track daily performance trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "revenue") {
                      return [formatCurrency(Number(value)), "Revenue"];
                    }
                    return [value, "Orders"];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  fill="#8884d8"
                  name="orders"
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  fill="#82ca9d"
                  name="revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Breakdown of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Baggage Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Baggage Size Preferences</CardTitle>
            <CardDescription>Most popular baggage sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sizeData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Airport Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Airport Distribution</CardTitle>
            <CardDescription>Orders by airport location</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={airportData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {airportData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest 10 baggage bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-3 px-4 text-left font-medium">
                      Booking ID
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Customer
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Size</th>
                    <th className="py-3 px-4 text-left font-medium">Price</th>
                    <th className="py-3 px-4 text-left font-medium">Airport</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center">
                        Loading orders...
                      </td>
                    </tr>
                  ) : bookings.slice(0, 10).length > 0 ? (
                    bookings.slice(0, 10).map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-sm">
                          {booking.booking_id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            {booking.customer_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.customer_email}
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          {booking.baggage_size.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {formatCurrency(booking.price)}
                        </td>
                        <td className="py-3 px-4">{booking.airport}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              booking.status === "confirmed"
                                ? "bg-green-500"
                                : booking.status === "pending"
                                  ? "bg-yellow-500"
                                  : booking.status === "completed"
                                    ? "bg-blue-500"
                                    : booking.status === "cancelled"
                                      ? "bg-red-500"
                                      : ""
                            }
                          >
                            {booking.status.charAt(0).toUpperCase() +
                              booking.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {format(new Date(booking.created_at), "MMM dd, yyyy")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartManagement;
