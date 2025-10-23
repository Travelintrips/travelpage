import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface DriverOverdueData {
  driver_name: string;
  code_booking: string;
  end_date: string;
  actual_return_date: string | null;
  late_days: number;
  late_fee: number;
}

export default function DriverOverduePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<DriverOverdueData[]>([]);
  const [filteredData, setFilteredData] = useState<DriverOverdueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Query bookings yang terlambat (end_date sudah lewat tapi belum dikembalikan atau terlambat dikembalikan)
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          code_booking,
          end_date,
          actual_return_date,
          drivers (
            full_name
          )
        `)
        .not("drivers", "is", null)
        .order("end_date", { ascending: false });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter dan hitung late days dan late fee
      const overdueData: DriverOverdueData[] = [];

      bookings?.forEach((booking: any) => {
        const endDate = new Date(booking.end_date);
        endDate.setHours(0, 0, 0, 0);

        let lateDays = 0;
        let actualReturnDate = booking.actual_return_date;

        if (actualReturnDate) {
          // Sudah dikembalikan tapi terlambat
          const returnDate = new Date(actualReturnDate);
          returnDate.setHours(0, 0, 0, 0);
          lateDays = Math.floor((returnDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          // Belum dikembalikan dan sudah lewat end_date
          lateDays = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Hanya tampilkan yang terlambat (late_days > 0)
        if (lateDays > 0) {
          const lateFee = lateDays * 100000; // Rp 100.000 per hari

          overdueData.push({
            driver_name: booking.drivers?.full_name || "Unknown Driver",
            code_booking: booking.code_booking || "-",
            end_date: booking.end_date,
            actual_return_date: actualReturnDate,
            late_days: lateDays,
            late_fee: lateFee,
          });
        }
      });

      setData(overdueData);
      setFilteredData(overdueData);
    } catch (error) {
      console.error("Error fetching driver overdue data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch driver overdue data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter data berdasarkan search term dan status filter
    let filtered = data;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.code_booking.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status (All or Return Date)
    if (statusFilter === "returned") {
      filtered = filtered.filter((item) => item.actual_return_date !== null);
    } else if (statusFilter === "not_returned") {
      filtered = filtered.filter((item) => item.actual_return_date === null);
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, data]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return dateString;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-background p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Driver Overdue</CardTitle>
                <CardDescription>
                  Daftar driver yang terlambat mengembalikan kendaraan
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="returned">Returned (Late)</SelectItem>
                  <SelectItem value="not_returned">Not Returned Yet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari nama driver atau kode booking..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Code Booking</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Actual Return Date</TableHead>
                  <TableHead className="text-right">Late Days</TableHead>
                  <TableHead className="text-right">Late Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No overdue drivers found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {row.driver_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.code_booking}
                      </TableCell>
                      <TableCell>{formatDate(row.end_date)}</TableCell>
                      <TableCell>
                        {row.actual_return_date
                          ? formatDate(row.actual_return_date)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {row.late_days} days
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(row.late_fee)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Label>Rows per page:</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1} ({filteredData.length}{" "}
                total)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}