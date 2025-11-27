import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Search, CalendarIcon, RefreshCw, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check } from "lucide-react";

interface HistoriTransaksi {
  date: string;
  name: string;
  code_booking?: string;
  amount?: number;
  saldo_awal?: number;
  saldo_akhir?: number;
  jenis_transaksi?: string;
  payment_method?: string;
  status?: string;
  bank_name?: string;
  account_holder_received?: string;
}

const HistoriTransaksi = () => {
  const [data, setData] = useState<HistoriTransaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedName, setSelectedName] = useState<string>("");
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  const fetchNameOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("vw_histori_transaksi")
        .select("name")
        .not("name", "is", null)
        .order("name");

      if (error) throw error;

      const uniqueNames = Array.from(new Set(data.map((row) => row.name)));
      setNameOptions(uniqueNames);
    } catch (error) {
      console.error("Error fetching name options:", error);
    }
  };

  useEffect(() => {
    fetchNameOptions();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query with RPC function for formatted data
      const { data: result, error, count } = await supabase.rpc(
        "get_histori_transaksi",
        {
          search_term: searchTerm.trim() || null,
          selected_name: selectedName || null,
          start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          page_size: pageSize,
          page_offset: pageIndex * pageSize,
        }
      );

      if (error) throw error;

      // Map nominal to amount and ensure saldo values default to 0
      const mappedData = (result || []).map((row: any) => ({
        ...row,
        amount: row.nominal || 0,
        saldo_awal: row.saldo_awal ?? 0,
        saldo_akhir: row.saldo_akhir ?? 0,
      }));

      setData(mappedData);
      
      // Get total count
      const { count: totalCount } = await supabase
        .from("vw_histori_transaksi")
        .select("*", { count: "exact", head: true });
      
      setTotalCount(totalCount || 0);
    } catch (error) {
      console.error("Error fetching histori transaksi:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch transaction history",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPageIndex(0);
    fetchData();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedName("");
    setStartDate(undefined);
    setEndDate(undefined);
    setPageIndex(0);
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Date is already formatted from database as DD/MM/YYYY
    return dateString;
  };

  useEffect(() => {
    fetchData();
  }, [pageIndex]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const formatPaymentMethod = (method) => {
  if (!method) return "-";

  switch (method.toLowerCase()) {
    case "bank_transfer":
      return "Bank Transfer";
    case "ewallet":
      return "Ewallet/Saldo";
    case "cash":
      return "Cash";
    case "credit_card":
      return "Credit Card";
    default:
      return method;
  }
};


  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Histori Transaksi</h1>
          <p className="text-muted-foreground">
            Riwayat transaksi dari semua layanan
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>
            Cari berdasarkan nama, kode booking, atau tanggal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Name Dropdown */}
            <div>
              <Label>Name</Label>
              <Popover open={nameDropdownOpen} onOpenChange={setNameDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={nameDropdownOpen}
                    className="w-full justify-between"
                  >
                    {selectedName || "All"}
                    <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search name..." />
                    <CommandEmpty>No name found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setSelectedName("");
                          setNameDropdownOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedName === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All
                      </CommandItem>
                      {nameOptions.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={(currentValue) => {
                            setSelectedName(currentValue === selectedName ? "" : currentValue);
                            setNameDropdownOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedName === name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search */}
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari kode booking..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPageIndex(0);
                      fetchData();
                    }
                  }}
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div>
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={() => { setPageIndex(0); fetchData(); }}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Transaksi</CardTitle>
          <CardDescription>
            Total: {totalCount} transaksi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code Booking</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-right">Saldo Awal</TableHead>
                  <TableHead className="text-right">Saldo Akhir</TableHead>
                  <TableHead>Jenis Transaksi</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Holder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      No transaction history found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="font-medium">{row.name || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.code_booking || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.saldo_awal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.saldo_akhir)}
                      </TableCell>
                      <TableCell>{row.jenis_transaksi || "-"}</TableCell>
                      <TableCell>
                            {formatPaymentMethod(row.payment_method)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            row.status === "Paid" || row.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : row.status === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          )}
                        >
                          {row.status || "-"}
                        </span>
                      </TableCell>
                      <TableCell>{row.bank_name || "-"}</TableCell>
                      <TableCell>{row.account_holder_received || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pageIndex + 1} of {totalPages} ({totalCount} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                  disabled={pageIndex === 0 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex(Math.min(totalPages - 1, pageIndex + 1))}
                  disabled={pageIndex >= totalPages - 1 || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoriTransaksi;