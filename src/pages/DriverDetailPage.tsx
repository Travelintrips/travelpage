import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Driver {
  id: string;
  name: string;
  driver_status?: string;
  saldo?: number;
}

interface BookingHistory {
  id: string;
  kode_booking?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  vehicle?: {
    make: string;
    model: string;
    license_plate: string;
  };
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data untuk demo
  const mockDriver: Driver = {
    id: id || "1",
    name: "Jone Doe",
    driver_status: "standby",
    saldo: 525000,
  };

  const mockBookingHistory: BookingHistory[] = [
    {
      id: "1",
      kode_booking: "092d60c4-873e-4734-9659-2f8c52d863a2",
      start_date: "2025-01-06",
      end_date: "2025-01-07",
      total_amount: 525000,
      status: "completed",
      vehicle: {
        make: "Toyota",
        model: "Avanza",
        license_plate: "B 1097 UNS",
      },
    },
    {
      id: "2",
      kode_booking: "abc123-def4-5678-9012-345678901234",
      start_date: "2025-01-04",
      end_date: "2025-01-05",
      total_amount: 450000,
      status: "completed",
      vehicle: {
        make: "Honda",
        model: "Mobilio",
        license_plate: "B 2345 XYZ",
      },
    },
    {
      id: "3",
      kode_booking: "def456-ghi7-8901-2345-678901234567",
      start_date: "2025-01-02",
      end_date: "2025-01-03",
      total_amount: 380000,
      status: "cancelled",
      vehicle: {
        make: "Daihatsu",
        model: "Xenia",
        license_plate: "B 6789 ABC",
      },
    },
  ];

  useEffect(() => {
    fetchDriverData();
  }, [id]);

  const fetchDriverData = async () => {
    try {
      setIsLoading(true);
      
      // Untuk demo, gunakan mock data
      // Dalam implementasi nyata, fetch dari database:
      
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, name, driver_status, saldo")
        .eq("id", id)
        .single();

      if (driverError) throw driverError;

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

      setDriver(driverData);
      setBookingHistory(bookingsData || []);
      

      // Simulasi delay loading
      setTimeout(() => {
        setDriver(mockDriver);
        setBookingHistory(mockBookingHistory);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error fetching driver data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching driver data",
        description: error.message,
      });
      setIsLoading(false);
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
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Driver Detail1</h1>
      </div>

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
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(driver.saldo || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card histori booking */}
      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
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
              {bookingHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No booking history found
                  </TableCell>
                </TableRow>
              ) : (
                bookingHistory.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.kode_booking || booking.id}
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
        </CardContent>
      </Card>
    </div>
  );
}
