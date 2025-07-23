import React from "react";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VehicleStatusData {
  name: string;
  value: number;
}

interface PaymentData {
  name: string;
  paid: number;
  unpaid: number;
}

interface BookingTrendData {
  date: string;
  bookings: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  vehicleStatusData: VehicleStatusData[];
  paymentData: PaymentData[];
  bookingTrendData: BookingTrendData[];
  paymentMethodData: PaymentMethodData[];
  isLoading: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const DashboardCharts: React.FC<DashboardChartsProps> = ({
  vehicleStatusData,
  paymentData,
  bookingTrendData,
  paymentMethodData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 mt-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="w-full h-80 animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-64">
              <div className="h-48 w-48 bg-muted rounded-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 gap-6 mt-6">
      <Tabs defaultValue="vehicle-status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vehicle-status">Vehicle Status</TabsTrigger>
          <TabsTrigger value="payment-comparison">
            Payment Comparison
          </TabsTrigger>
          <TabsTrigger value="booking-trends">Booking Trends</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Vehicle Status Pie Chart */}
        <TabsContent value="vehicle-status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Status Distribution</CardTitle>
              <CardDescription>
                Percentage of vehicles by their current status
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {vehicleStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} vehicles`, "Count"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Comparison Bar Chart */}
        <TabsContent value="payment-comparison" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Comparison</CardTitle>
              <CardDescription>
                Total paid vs unpaid amounts by month
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={paymentData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number)]}
                  />
                  <Legend />
                  <Bar dataKey="paid" name="Paid" fill="#4ade80" />
                  <Bar dataKey="unpaid" name="Unpaid" fill="#f87171" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Trends Line Chart */}
        <TabsContent value="booking-trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Number of bookings over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={bookingTrendData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    name="Bookings"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Doughnut Chart */}
        <TabsContent value="payment-methods" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Distribution of payment methods used
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} transactions`, "Count"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardCharts;
