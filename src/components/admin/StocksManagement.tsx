import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { BrowserMultiFormatReader } from "@zxing/browser";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Camera,
} from "lucide-react";

interface StockData {
  date: string;
  name: string;
  item_name: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  opening_stock: number;
  stock_in: number;
  stock_out: number;
  closing_stock: number;
  category?: string;
  warehouse_location?: string;
  ppn_type?: string;
  purchase_price_after_ppn?: number;
  selling_price_after_ppn?: number;
}

interface NewStockForm {
  date: string;
  category: string;
  warehouse_location: string;
  item_name: string;
  quantity: number;
  ppn_type: string;
  ppn_beli: number;
  ppn_jual: number;
  purchase_price: number;
  selling_price: number;
}

export function CameraBarcodeScanner({
  onDetected,
  active = true,
}: {
  onDetected: (code: string) => void;
  active?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Arahkan kamera ke barcode...");
  const [lastCode, setLastCode] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return; // hanya aktif jika modal terbuka

    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | null = null;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          const code = result.getText();
          if (code !== lastCode) {
            setLastCode(code);
            setStatus(`✅ Barcode terdeteksi: ${code}`);
            onDetected(code);
          }
        }
      })
      .then((ctrl) => {
        controls = ctrl;
      })
      .catch((err) => console.error("Camera error:", err));

    // ✅ cleanup aman — tanpa reader.reset()
    return () => {
      if (controls && typeof controls.stop === "function") {
        controls.stop();
        console.log("📷 Kamera dimatikan dengan aman");
      }
    };
  }, [active]); // kamera hidup/mati tergantung state modal

  return (
    <div className="border rounded-lg bg-gray-50 mt-3 p-2 space-y-2">
      <video ref={videoRef} className="w-full rounded-md" muted playsInline />
      <p className="text-sm text-gray-600">{status}</p>
      {lastCode && <p className="text-green-700 text-sm font-mono">{lastCode}</p>}
    </div>
  );
}

const StocksManagement = () => {
  const { toast } = useToast();
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // Modal state
  const [isNewStockModalOpen, setIsNewStockModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // New stock form
  const [newStock, setNewStock] = useState<NewStockForm>({
    date: new Date().toISOString().split("T")[0],
    category: "",
    warehouse_location: "",
    item_name: "",
    quantity: 0,
    ppn_type: "Non PPN",
    ppn_beli: 0,
    ppn_jual: 0,
    purchase_price: 0,
    selling_price: 0,
  });

  // Name options for dropdown
  const [nameOptions, setNameOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ label: string; value: string }[]>([]);
  const [ppnOptions, setPpnOptions] = useState<{ label: string; value: string }[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    search: "",
    nameFilter: "",
    categoryFilter: "",
    warehouseFilter: "",
    ppnFilter: "",
  });

  useEffect(() => {
    fetchNameOptions();
    fetchCategoryOptions();
    fetchWarehouseOptions();
    fetchPpnOptions();
    fetchRequesterName();
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [currentPage, filters]);

  const fetchRequesterName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        setRequesterName(userData?.full_name || user.email || "Unknown");
      }
    } catch (error) {
      console.error("Error fetching requester name:", error);
    }
  };

  const fetchNameOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("vw_stock")
        .select("name")
        .order("name");

      if (error) throw error;

      // Get distinct names
      const distinctNames = Array.from(new Set(data?.map(item => item.name).filter(Boolean)));
      const options = distinctNames.map(name => ({ label: name, value: name }));
      
      setNameOptions(options);
    } catch (error) {
      console.error("Error fetching name options:", error);
    }
  };

  const fetchCategoryOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("vw_stock")
        .select("category")
        .order("category");

      if (error) throw error;

      const distinctCategories = Array.from(new Set(data?.map(item => item.category).filter(Boolean)));
      const options = distinctCategories.map(category => ({ label: category, value: category }));
      
      setCategoryOptions(options);
    } catch (error) {
      console.error("Error fetching category options:", error);
    }
  };

  const fetchWarehouseOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("vw_stock")
        .select("warehouse_location")
        .order("warehouse_location");

      if (error) throw error;

      const distinctWarehouses = Array.from(new Set(data?.map(item => item.warehouse_location).filter(Boolean)));
      const options = distinctWarehouses.map(warehouse => ({ label: warehouse, value: warehouse }));
      
      setWarehouseOptions(options);
    } catch (error) {
      console.error("Error fetching warehouse options:", error);
    }
  };

  const fetchPpnOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("vw_stock")
        .select("ppn_type")
        .order("ppn_type");

      if (error) throw error;

      const distinctPpnTypes = Array.from(new Set(data?.map(item => item.ppn_type).filter(Boolean)));
      const options = distinctPpnTypes.map(ppn => ({ label: ppn, value: ppn }));
      
      setPpnOptions(options);
    } catch (error) {
      console.error("Error fetching PPN options:", error);
    }
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);

      // Build query with filters
      let query = supabase
        .from("vw_stock")
        .select("*", { count: "exact" });

      // Apply date filters
      if (filters.startDate) {
        query = query.gte("date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("date", filters.endDate);
      }

      // Apply name filter
      if (filters.nameFilter) {
        query = query.eq("name", filters.nameFilter);
      }

      // Apply category filter
      if (filters.categoryFilter) {
        query = query.eq("category", filters.categoryFilter);
      }

      // Apply warehouse filter
      if (filters.warehouseFilter) {
        query = query.eq("warehouse_location", filters.warehouseFilter);
      }

      // Apply PPN filter
      if (filters.ppnFilter) {
        query = query.eq("ppn_type", filters.ppnFilter);
      }

      // Apply global search filter - only search in existing columns
      if (filters.search && filters.search.trim() !== "") {
        const searchTerm = filters.search.trim();
        const searchPattern = `%${searchTerm}%`;
        
        // Check if search term is numeric
        const isNumeric = /^[0-9]+(\.[0-9]+)?$/.test(searchTerm);
        
        // Build OR conditions only for existing columns
        const conditions = [
          `name.ilike.${searchPattern}`,
          `item_name.ilike.${searchPattern}`,
        ];
        
        // Add numeric field searches if search term is numeric
        if (isNumeric) {
          const numericValue = parseFloat(searchTerm);
          const intValue = parseInt(searchTerm);
          
          conditions.push(
            `purchase_price.eq.${numericValue}`,
            `selling_price.eq.${numericValue}`,
            `opening_stock.eq.${intValue}`,
            `stock_in.eq.${intValue}`,
            `stock_out.eq.${intValue}`,
            `closing_stock.eq.${intValue}`
          );
        }
        
        query = query.or(conditions.join(','));
      }

      // Apply pagination and sorting
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("date", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setStocks(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch stock data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchStocks();
  };

  const handleCreateNewStock = async () => {
    try {
      setIsCreating(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Calculate prices after PPN
      const purchasePriceAfterPpn = newStock.ppn_type === "PPN" 
        ? newStock.purchase_price + (newStock.purchase_price * newStock.ppn_beli / 100)
        : newStock.purchase_price;

      const sellingPriceAfterPpn = newStock.ppn_type === "PPN"
        ? newStock.selling_price + (newStock.selling_price * newStock.ppn_jual / 100)
        : newStock.selling_price;

      const payload = {
        date: newStock.date,
        requester_id: user.id,
        category: newStock.category,
        warehouse_location: newStock.warehouse_location,
        item_name: newStock.item_name,
        quantity: newStock.quantity,
        ppn_type: newStock.ppn_type,
        ppn_beli: newStock.ppn_type === "PPN" ? newStock.ppn_beli : null,
        ppn_jual: newStock.ppn_type === "PPN" ? newStock.ppn_jual : null,
        purchase_price: newStock.purchase_price,
        selling_price: newStock.selling_price,
        purchase_price_after_ppn: purchasePriceAfterPpn,
        barcode: newRequestData.barcode || null,
        selling_price_after_ppn: sellingPriceAfterPpn,
      };

      const { error } = await supabase
        .from("stock")
        .insert([payload]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "New stock created successfully.",
      });

      // Reset form and close modal
      setNewStock({
        date: new Date().toISOString().split("T")[0],
        category: "",
        warehouse_location: "",
        item_name: "",
        quantity: 0,
        ppn_type: "Non PPN",
        ppn_beli: 0,
        ppn_jual: 0,
        purchase_price: 0,
        selling_price: 0,
      });
      setIsNewStockModalOpen(false);
      
      // Refresh data
      fetchStocks();
      fetchCategoryOptions();
      fetchWarehouseOptions();
      fetchPpnOptions();
    } catch (error) {
      console.error("Error creating new stock:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create new stock. Please try again.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      // Fetch all data without pagination for export
      let query = supabase.from("vw_stock").select("*");

      if (filters.startDate) {
        query = query.gte("date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("date", filters.endDate);
      }
      if (filters.nameFilter) {
        query = query.eq("name", filters.nameFilter);
      }
      if (filters.categoryFilter) {
        query = query.eq("category", filters.categoryFilter);
      }
      if (filters.warehouseFilter) {
        query = query.eq("warehouse_location", filters.warehouseFilter);
      }
      if (filters.ppnFilter) {
        query = query.eq("ppn_type", filters.ppnFilter);
      }
      if (filters.search && filters.search.trim() !== "") {
        const searchTerm = filters.search.trim();
        const searchPattern = `%${searchTerm}%`;
        
        const isNumeric = /^[0-9]+(\.[0-9]+)?$/.test(searchTerm);
        
        // Build OR conditions only for existing columns
        const conditions = [
          `name.ilike.${searchPattern}`,
          `item_name.ilike.${searchPattern}`,
        ];
        
        if (isNumeric) {
          const numericValue = parseFloat(searchTerm);
          const intValue = parseInt(searchTerm);
          
          conditions.push(
            `purchase_price.eq.${numericValue}`,
            `selling_price.eq.${numericValue}`,
            `opening_stock.eq.${intValue}`,
            `stock_in.eq.${intValue}`,
            `stock_out.eq.${intValue}`,
            `closing_stock.eq.${intValue}`
          );
        }
        
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = [
        "Date",
        "Name",
        "Item Name",
        "Category",
        "Warehouse Location",
        "Quantity",
        "Purchase Price",
        "Selling Price",
        "PPN Type",
        "Purchase Price After PPN",
        "Selling Price After PPN",
        "Opening Stock",
        "Stock In",
        "Stock Out",
        "Closing Stock",
      ];

      const csvContent = [
        headers.join(","),
        ...(data || []).map((row) =>
          [
            row.date,
            `"${row.name || ""}"`,
            `"${row.item_name || ""}"`,
            `"${row.category || ""}"`,
            `"${row.warehouse_location || ""}"`,
            row.quantity || 0,
            row.purchase_price || 0,
            row.selling_price || 0,
            `"${row.ppn_type || ""}"`,
            row.purchase_price_after_ppn || 0,
            row.selling_price_after_ppn || 0,
            row.opening_stock || 0,
            row.stock_in || 0,
            row.stock_out || 0,
            row.closing_stock || 0,
          ].join(",")
        ),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `stocks_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Stock data exported successfully.",
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to export data. Please try again.",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Calculate prices after PPN for display
  const purchasePriceAfterPpn = newStock.ppn_type === "PPN" 
    ? newStock.purchase_price + (newStock.purchase_price * newStock.ppn_beli / 100)
    : newStock.purchase_price;

  const sellingPriceAfterPpn = newStock.ppn_type === "PPN"
    ? newStock.selling_price + (newStock.selling_price * newStock.ppn_jual / 100)
    : newStock.selling_price;

  return (
    <div className="space-y-6 bg-white min-h-screen">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Stocks Management</CardTitle>
                <CardDescription>
                  View and manage stock inventory data
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsNewStockModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Stock
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="name-filter">Name</Label>
              <Select
                value={filters.nameFilter || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, nameFilter: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger id="name-filter" className="mt-1">
                  <SelectValue placeholder="All names" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All names</SelectItem>
                  {nameOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={filters.categoryFilter || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, categoryFilter: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger id="category-filter" className="mt-1">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="warehouse-filter">Warehouse Location</Label>
              <Select
                value={filters.warehouseFilter || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, warehouseFilter: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger id="warehouse-filter" className="mt-1">
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ppn-filter">PPN Type</Label>
              <Select
                value={filters.ppnFilter || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, ppnFilter: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger id="ppn-filter" className="mt-1">
                  <SelectValue placeholder="All PPN types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All PPN types</SelectItem>
                  {ppnOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search name, item, prices..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {stocks.length} of {totalCount} stock entries
            </div>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1}
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Warehouse Location</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead>PPN Type</TableHead>
                    <TableHead className="text-right">Purchase Price After PPN</TableHead>
                    <TableHead className="text-right">Selling Price After PPN</TableHead>
                    <TableHead className="text-right">Opening Stock</TableHead>
                    <TableHead className="text-right">Stock In</TableHead>
                    <TableHead className="text-right">Stock Out</TableHead>
                    <TableHead className="text-right">Closing Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                          Loading stocks...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : stocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No stock data found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stocks.map((stock, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell>{formatDate(stock.date)}</TableCell>
                        <TableCell className="font-medium">
                          {stock.name || "-"}
                        </TableCell>
                        <TableCell>{stock.item_name || "-"}</TableCell>
                        <TableCell>{stock.category || "-"}</TableCell>
                        <TableCell>{stock.warehouse_location || "-"}</TableCell>
                        <TableCell className="text-right">
                          {stock.quantity || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stock.purchase_price || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stock.selling_price || 0)}
                        </TableCell>
                        <TableCell>{stock.ppn_type || "-"}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stock.purchase_price_after_ppn || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(stock.selling_price_after_ppn || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.opening_stock || 0}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {stock.stock_in || 0}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {stock.stock_out || 0}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {stock.closing_stock || 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Stock Modal */}
      <Dialog open={isNewStockModalOpen} onOpenChange={setIsNewStockModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Stock</DialogTitle>
            <DialogDescription>
              Create a new stock entry
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newStock.date}
                  onChange={(e) => setNewStock({ ...newStock, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="requester">Requester</Label>
                <Input
                  id="requester"
                  value={requesterName}
                  readOnly
                  className="mt-1 bg-gray-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newStock.category}
                  onChange={(e) => setNewStock({ ...newStock, category: e.target.value })}
                  placeholder="Enter category"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="warehouse">Warehouse Location</Label>
                <Select
                  value={newStock.warehouse_location}
                  onValueChange={(value) => setNewStock({ ...newStock, warehouse_location: value })}
                >
                  <SelectTrigger id="warehouse" className="mt-1">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kebon Jeruk">Kebon Jeruk</SelectItem>
                    <SelectItem value="Sport Center">Sport Center</SelectItem>
                    <SelectItem value="Pool">Pool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                value={newStock.item_name}
                onChange={(e) => setNewStock({ ...newStock, item_name: e.target.value })}
                placeholder="Enter item name"
                className="mt-1"
              />
            </div>

            {/* 📷 Scanner Barcode */}
  <div className="mt-4">
  <Label className="text-sm font-medium">Scan Barcode (Opsional)</Label>

  {!isScanning ? (
    <Button
      variant="outline"
      className="mt-2"
      onClick={() => setIsScanning(true)}
    >
      <Camera className="w-4 h-4 mr-2" />
      Mulai Scan Barcode
    </Button>
  ) : (
    <>
      <CameraBarcodeScanner
        active={isScanning}
        onDetected={(code) => {
          console.log("✅ Barcode terdeteksi:", code);
          // misal auto fill data barang
          setFormData((prev) => ({ ...prev, barcode: code }));
          setIsScanning(false);
        }}
      />
      <Button
        variant="destructive"
        className="mt-2"
        onClick={() => setIsScanning(false)}
      >
        Stop Kamera
      </Button>
    </>
  )}
</div>


            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={newStock.quantity}
                onChange={(e) => setNewStock({ ...newStock, quantity: parseInt(e.target.value) || 0 })}
                placeholder="Enter quantity"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ppn_type">PPN</Label>
              <Select
                value={newStock.ppn_type}
                onValueChange={(value) => setNewStock({ ...newStock, ppn_type: value })}
              >
                <SelectTrigger id="ppn_type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non PPN">Non PPN</SelectItem>
                  <SelectItem value="PPN">PPN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStock.ppn_type === "PPN" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ppn_beli">PPN Beli (%)</Label>
                  <Input
                    id="ppn_beli"
                    type="number"
                    value={newStock.ppn_beli}
                    onChange={(e) => setNewStock({ ...newStock, ppn_beli: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter PPN Beli"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ppn_jual">PPN Jual (%)</Label>
                  <Input
                    id="ppn_jual"
                    type="number"
                    value={newStock.ppn_jual}
                    onChange={(e) => setNewStock({ ...newStock, ppn_jual: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter PPN Jual"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_price">Purchase Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={newStock.purchase_price}
                  onChange={(e) => setNewStock({ ...newStock, purchase_price: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter purchase price"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="selling_price">Selling Price</Label>
                <Input
                  id="selling_price"
                  type="number"
                  value={newStock.selling_price}
                  onChange={(e) => setNewStock({ ...newStock, selling_price: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter selling price"
                  className="mt-1"
                />
              </div>
            </div>

            {newStock.ppn_type === "PPN" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_price_after_ppn">Purchase Price After PPN</Label>
                  <Input
                    id="purchase_price_after_ppn"
                    type="number"
                    value={purchasePriceAfterPpn.toFixed(2)}
                    readOnly
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="selling_price_after_ppn">Selling Price After PPN</Label>
                  <Input
                    id="selling_price_after_ppn"
                    type="number"
                    value={sellingPriceAfterPpn.toFixed(2)}
                    readOnly
                    className="mt-1 bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewStockModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewStock}
              disabled={isCreating || !newStock.category || !newStock.warehouse_location || !newStock.item_name}
            >
              {isCreating ? "Creating..." : "Create New Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StocksManagement;