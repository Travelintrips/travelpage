import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Search, Filter, Calendar, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface JournalEntry {
  nama: string;
  date: string;
  description: string;
  service_type: string;
  total_debit: number;
  vehicle_type: string;
  vehicle_name: string;
  license_plate: string;
  status?: string;
}

interface ServiceTypeOption {
  label: string;
  value: string;
}

interface FilterOptions {
  dateFrom: string;
  dateTo: string;
  serviceType: string;
  status: string;
  search: string;
}

const Reports = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Get current month's first and last day as default
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [filters, setFilters] = useState<FilterOptions>({
    dateFrom: firstDayOfMonth.toISOString().split('T')[0],
    dateTo: lastDayOfMonth.toISOString().split('T')[0],
    serviceType: "all",
    status: "all",
    search: ""
  });

  const [sortConfig, setSortConfig] = useState<{
    key: keyof JournalEntry;
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'desc'
  });

  // Fetch journal entries from the view
  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      
      // Check if the view exists, if not we'll create mock data structure
      const { data, error } = await supabase
        .from('vw_journal_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.warn('Journal entries view not found, using mock data structure:', error);
        // Mock data structure for demonstration
        const mockData: JournalEntry[] = [
          {
            nama: "John Doe",
            date: "2024-01-15",
            description: "Airport transfer service",
            service_type: "Airport Transfer",
            total_debit: 250000,
            vehicle_type: "Sedan",
            vehicle_name: "Toyota Camry",
            license_plate: "B 1234 ABC",
            status: "Completed"
          },
          {
            nama: "Jane Smith",
            date: "2024-01-14",
            description: "Baggage handling service",
            service_type: "Baggage Service",
            total_debit: 150000,
            vehicle_type: "Van",
            vehicle_name: "Toyota Hiace",
            license_plate: "B 5678 DEF",
            status: "Pending"
          },
          {
            nama: "Bob Johnson",
            date: "2024-01-13",
            description: "Passenger handling assistance",
            service_type: "Handling Service",
            total_debit: 300000,
            vehicle_type: "SUV",
            vehicle_name: "Toyota Fortuner",
            license_plate: "B 9012 GHI",
            status: "Completed"
          }
        ];
        setJournalEntries(mockData);
        setFilteredEntries(mockData);
      } else {
        setJournalEntries(data || []);
        setFilteredEntries(data || []);
        console.log("Raw journal entries from Supabase:", data);
console.log("Total entries fetched:", data?.length);

      }
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch journal entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFilters = () => {
    let filtered = [...journalEntries];

    console.log("Before filtering:", journalEntries.length, journalEntries);
console.log("Filters:", filters);

    // Date range filter
if (filters.dateFrom) {
  const from = new Date(filters.dateFrom);
  filtered = filtered.filter(entry => new Date(entry.date) >= from);
}
if (filters.dateTo) {
  const to = new Date(filters.dateTo);
  filtered = filtered.filter(entry => new Date(entry.date) <= to);
}

    // Service type filter
    if (filters.serviceType && filters.serviceType !== "all") {
      filtered = filtered.filter(entry => 
        entry.service_type?.toLowerCase().includes(filters.serviceType.toLowerCase())
      );
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
  filtered = filtered.filter(entry =>
    (entry.status ?? "").toLowerCase().includes(filters.status.toLowerCase())
  );
}


    // Search filter
    if (filters.search) {
  const searchTerm = filters.search.toLowerCase();
  filtered = filtered.filter(entry =>
    (entry.description ?? "").toLowerCase().includes(searchTerm) ||
    (entry.nama ?? "").toLowerCase().includes(searchTerm) ||
    (entry.vehicle_name ?? "").toLowerCase().includes(searchTerm) ||
    (entry.license_plate ?? "").toLowerCase().includes(searchTerm)
  );
}


    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredEntries(filtered);
  };

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = [
        'Nama',
        'Date',
        'Description',
        'Service Type',
        'Total Debit',
        'Vehicle Type',
        'Vehicle Name',
        'License Plate',
        'Status'
      ];

      const csvContent = [
        headers.join(','),
        ...filteredEntries.map(entry => [
          `"${entry.nama}"`,
          entry.date,
          `"${entry.description}"`,
          `"${entry.service_type}"`,
          entry.total_debit,
          `"${entry.vehicle_type}"`,
          `"${entry.vehicle_name}"`,
          `"${entry.license_plate}"`,
          `"${entry.status || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `journal_entries_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Journal entries exported successfully",
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Error",
        description: "Failed to export journal entries",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Handle sort
  const handleSort = (key: keyof JournalEntry) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      dateFrom: firstDayOfMonth.toISOString().split('T')[0],
      dateTo: lastDayOfMonth.toISOString().split('T')[0],
      serviceType: "all",
      status: "all",
      search: ""
    });
  };

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, sortConfig, journalEntries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">
            Generate and export various reports for your business
          </p>
        </div>

        <Tabs defaultValue="journal-entries" className="w-full">
          <TabsList className="grid w-full grid-cols-1 lg:w-auto">
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="journal-entries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Journal Entries</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchJournalEntries}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={exportToCSV}
                      disabled={exporting || filteredEntries.length === 0}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      {exporting ? 'Exporting...' : 'Export CSV'}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom">Date From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateTo">Date To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Select
                      value={filters.serviceType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, serviceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        <SelectItem value="Airport Transfer">Airport Transfer</SelectItem>
                        <SelectItem value="Baggage Service">Baggage Service</SelectItem>
                        <SelectItem value="Handling Service">Handling Service</SelectItem>
                        <SelectItem value="Car Rental">Car Rental</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search description..."
                        className="pl-8"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {filteredEntries.length} of {journalEntries.length} entries
                  </div>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th 
                            className="px-4 py-3 text-left font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('nama')}
                          >
                            <div className="flex items-center gap-1">
                              Nama
                              {sortConfig.key === 'nama' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('date')}
                          >
                            <div className="flex items-center gap-1">
                              Date
                              {sortConfig.key === 'date' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">
                            Description
                          </th>
                          <th 
                            className="px-4 py-3 text-left font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('service_type')}
                          >
                            <div className="flex items-center gap-1">
                              Service Type
                              {sortConfig.key === 'service_type' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_debit')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Total Debit
                              {sortConfig.key === 'total_debit' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">
                            Vehicle
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">
                            License Plate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                Loading journal entries...
                              </div>
                            </td>
                          </tr>
                        ) : filteredEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              No journal entries found matching your criteria
                            </td>
                          </tr>
                        ) : (
                          filteredEntries.map((entry, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {entry.nama}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                {entry.description}
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="text-xs">
                                  {entry.service_type}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                {formatCurrency(entry.total_debit)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                <div className="flex flex-col">
                                  <span className="font-medium">{entry.vehicle_name}</span>
                                  <span className="text-xs text-gray-500">{entry.vehicle_type}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                                {entry.license_plate}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                {filteredEntries.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {filteredEntries.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Entries</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            filteredEntries.reduce((sum, entry) => sum + entry.total_debit, 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            filteredEntries.length > 0 
                              ? filteredEntries.reduce((sum, entry) => sum + entry.total_debit, 0) / filteredEntries.length
                              : 0
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Average Amount</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;