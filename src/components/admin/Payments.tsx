import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface Payment {
  name: string | null;
  code_booking: string | null;
  description: string | null;
  amount: number | null;
  payment_method: string | null;
  bank_name: string | null;
  account_holder_received: string | null;
  date: string | null;
}

interface Filters {
  startDate: string;
  endDate: string;
  name: string;
  q: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [distinctNames, setDistinctNames] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    startDate: "",
    endDate: "",
    name: "All",
    q: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  // Fetch distinct names for dropdown
  const fetchDistinctNames = async () => {
    try {
      const { data, error } = await supabase
        .from("vw_payments")
        .select("name")
        .not("name", "is", null);

      if (error) {
        console.error('Error fetching distinct names:', error);
        return;
      }

      // Get unique names and sort them
      const uniqueNames = [...new Set(data.map(item => item.name))].filter(Boolean).sort();
      setDistinctNames(uniqueNames);
    } catch (error) {
      console.error("Error fetching distinct names:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      console.log('[Payments] Fetching from public.vw_payments view with filters:', filters);
      
      let query = supabase
        .from("vw_payments")
        .select(`
          name,
          code_booking,
          description,
          amount,
          payment_method,
          bank_name,
          account_holder_received,
          date
        `);

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      // Apply name filter
      if (filters.name && filters.name !== 'All') {
        query = query.eq('name', filters.name);
      }

      // Apply search filter with OR conditions using ILIKE for case-insensitive search
      if (filters.q && filters.q.trim() !== '') {
        const searchTerm = filters.q.trim();
        query = query.or(`name.ilike.%${searchTerm}%,code_booking.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Order by date descending
      query = query.order("date", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching from vw_payments:', error);
        throw error;
      }

      console.log('[Payments] Fetched payments from vw_payments:', data?.length || 0);
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRefresh = () => {
    fetchPayments();
  };

  // Calculate pagination
  const totalPages = Math.ceil(payments.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPayments = payments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  useEffect(() => {
    fetchDistinctNames();
    fetchPayments();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, rowsPerPage]);

  function formatMethod(text?: string) {
    if (!text) return "N/A";
    return text
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return (
    <div className="space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Payment Management
        </h1>
        <Button onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search payments..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Select value={filters.name} onValueChange={(value) => handleFilterChange('name', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {distinctNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => setFilters({ startDate: "", endDate: "", name: "All", q: "" })}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading payments...
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code Booking</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>Account Holder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No payment records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPayments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-gray-600">
                          {payment.date ? new Date(payment.date).toLocaleDateString('id-ID') : "N/A"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.name || "N/A"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.code_booking || "N/A"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {payment.description || "N/A"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {formatMethod(payment.payment_method)}
                        </TableCell>
                        <TableCell>
                          {payment.bank_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {payment.account_holder_received || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rowsPerPage" className="text-sm">
                    Rows per page:
                  </Label>
                  <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground ml-4">
                    Showing {startIndex + 1} to {Math.min(endIndex, payments.length)} of {payments.length} entries
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-9"
                          >
                            {page}
                          </Button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}