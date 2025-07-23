import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Download, Filter, Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function SalesReportPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales Report</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CardDescription>All time sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 1,234,567,890</div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Bookings
            </CardTitle>
            <CardDescription>Current month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-xs text-muted-foreground">
              +18.2% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Vehicle Utilization
            </CardTitle>
            <CardDescription>Current fleet status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              +5.1% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Sales Overview</CardTitle>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-dashed"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Select defaultValue="monthly">
                  <SelectTrigger className="h-8 w-[130px]">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border rounded-md">
              <p className="text-muted-foreground">
                Sales chart visualization would appear here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle>Top Performing Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="revenue">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="revenue">By Revenue</TabsTrigger>
                <TabsTrigger value="bookings">By Bookings</TabsTrigger>
              </TabsList>
              <TabsContent value="revenue" className="pt-4">
                <ul className="space-y-4">
                  {[
                    {
                      name: "Toyota Alphard",
                      revenue: "Rp 156,780,000",
                      percent: 12.5,
                    },
                    {
                      name: "Honda CR-V",
                      revenue: "Rp 134,560,000",
                      percent: 10.8,
                    },
                    {
                      name: "Toyota Fortuner",
                      revenue: "Rp 128,900,000",
                      percent: 10.2,
                    },
                    {
                      name: "Mitsubishi Pajero",
                      revenue: "Rp 112,450,000",
                      percent: 9.1,
                    },
                    {
                      name: "Toyota Avanza",
                      revenue: "Rp 98,670,000",
                      percent: 7.9,
                    },
                  ].map((vehicle, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vehicle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.revenue}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        +{vehicle.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="bookings" className="pt-4">
                <ul className="space-y-4">
                  {[
                    { name: "Toyota Avanza", bookings: 78, percent: 15.2 },
                    { name: "Honda Brio", bookings: 65, percent: 12.7 },
                    { name: "Toyota Alphard", bookings: 54, percent: 10.5 },
                    { name: "Mitsubishi Xpander", bookings: 48, percent: 9.4 },
                    { name: "Honda CR-V", bookings: 42, percent: 8.2 },
                  ].map((vehicle, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vehicle.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.bookings} bookings
                        </p>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        +{vehicle.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
