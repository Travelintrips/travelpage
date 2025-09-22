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
  total_credit: number;
  vehicle_type: string;
  vehicle_name: string;
  license_plate: string;
  status?: string;
  saldo_driver_now?: number; // Add driver balance
  saldo_agent_now?: number;  // Add agent balance
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
  const [serviceTypeOptions, setServiceTypeOptions] = useState<ServiceTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Get current month's first and last day as default
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    nama: "all", // Use 'all' instead of empty string
    serviceType: "all", // Use 'all' instead of empty string
    globalSearch: "", // Global search field
  });
  const [namaOptions, setNamaOptions] = useState<Array<{label: string, value: string}>>([]);
  const [loadingNamaOptions, setLoadingNamaOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // Add pagination state
  const [pageSize, setPageSize] = useState(10); // Add page size state

  const [sortConfig, setSortConfig] = useState<{
    key: keyof JournalEntry;
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'desc'
  });

  // Fetch service type options dynamically from vw_journal_entries
  const fetchServiceTypeOptions = async () => {
    try {
      console.log('[Reports] Fetching service type options from data...');
      
      // First try to fetch from the view
      let { data, error } = await supabase
        .from('vw_journal_entries')
        .select('service_type')
        .not('service_type', 'is', null)
        .neq('service_type', '')
        .order('service_type');

      // If view doesn't exist, try alternative sources
      if (error && error.message.includes('relation "vw_journal_entries" does not exist')) {
        console.log('[Reports] View not found for service types, trying bookings table...');
        
        // Try to get service types from bookings or other tables
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('service_type')
          .not('service_type', 'is', null)
          .neq('service_type', '')
          .order('service_type');
          
        if (bookingsError) {
          console.warn('Bookings query failed, using default service types:', bookingsError);
          // Use default options if query fails
          setServiceTypeOptions([
            { label: "All Service Types", value: "all" },
            { label: "Car Rental", value: "Car Rental" },
            { label: "Airport Transfer", value: "Airport Transfer" },
            { label: "Baggage Handling", value: "Baggage Handling" },
            { label: "Passenger Handling", value: "Passenger Handling" },
            { label: "Booking Driver", value: "Booking Driver" }
          ]);
          return;
        }
        
        data = bookingsData;
        error = null;
      } else if (error) {
        throw error;
      }

      // Get distinct service types and create options
      const distinctServiceTypes = [...new Set(data?.map(item => item.service_type?.trim()).filter(Boolean))].sort();
      
      const options = [
        { label: "All Service Types", value: "all" },
        ...distinctServiceTypes.map(type => ({ label: type, value: type }))
      ];
      
      setServiceTypeOptions(options);
      console.log('[Reports] Service type options loaded:', options.length, options);
      
    } catch (error) {
      console.error('Error fetching service type options:', error);
      // Use default options on error
      setServiceTypeOptions([
        { label: "All Service Types", value: "all" },
        { label: "Car Rental", value: "Car Rental" },
        { label: "Airport Transfer", value: "Airport Transfer" },
        { label: "Baggage Handling", value: "Baggage Handling" },
        { label: "Passenger Handling", value: "Passenger Handling" },
        { label: "Booking Driver", value: "Booking Driver" }
      ]);
    }
  };

  // Fetch journal entries from the view
  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      console.log('[Reports] Fetching journal entries...');
      
      // First try to fetch from the view
      let { data, error } = await supabase
        .from('vw_journal_entries')
        .select('*, saldo_driver_now, saldo_agent_now'); // Explicitly select balance columns

      // If view doesn't exist, try to fetch from journal_entries table
      if (error && error.message.includes('relation "vw_journal_entries" does not exist')) {
        console.log('[Reports] View not found, trying journal_entries table...');
        
        const { data: journalData, error: journalError } = await supabase
          .from('journal_entries')
          .select('*');
          
        if (journalError && journalError.message.includes('relation "journal_entries" does not exist')) {
          console.log('[Reports] journal_entries table not found, creating from bookings...');
          
          // Create journal entries from bookings and payments
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              *,
              users!inner(full_name, email),
              vehicles(name, type, license_plate),
              payments(amount, payment_method, status)
            `);
            
          if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
            throw bookingsError;
          }
          
          // Transform bookings data to journal entries format
          const transformedData = (bookingsData || []).map((booking: any) => ({
            nama: booking.users?.full_name || 'Unknown',
            date: booking.created_at || booking.start_date,
            description: `Booking #${booking.id} - ${booking.status}`,
            service_type: 'Car Rental', // Default service type
            total_debit: booking.total_amount || 0,
            total_credit: 0, // Default credit
            vehicle_type: booking.vehicles?.type || 'Unknown',
            vehicle_name: booking.vehicles?.name || 'Unknown',
            license_plate: booking.vehicles?.license_plate || 'Unknown',
            status: booking.status,
            saldo_driver_now: 0, // Default driver balance
            saldo_agent_now: 0   // Default agent balance
          }));
          
          data = transformedData;
          error = null;
        } else if (journalError) {
          throw journalError;
        } else {
          data = journalData;
        }
      } else if (error) {
        throw error;
      }

      let filteredData = data || [];

      // Apply date filters
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filteredData = filteredData.filter(entry => new Date(entry.date) >= startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        filteredData = filteredData.filter(entry => new Date(entry.date) <= endDate);
      }

      // Apply nama filter - modified logic
      if (filters.nama && filters.nama !== 'all') {
        filteredData = filteredData.filter(entry => 
          (entry.nama || '').toLowerCase().includes(filters.nama.toLowerCase())
        );
      }

      // Apply service type filter - modified logic
      if (filters.serviceType && filters.serviceType !== 'all') {
        filteredData = filteredData.filter(entry => 
          (entry.service_type || '').toLowerCase() === filters.serviceType.toLowerCase()
        );
      }

      // Apply global search filter - only when global_search is not empty
      if (filters.globalSearch && filters.globalSearch.trim() !== '') {
        const searchTerm = filters.globalSearch.toLowerCase();
        filteredData = filteredData.filter(entry => {
          return (
            (entry.nama || '').toLowerCase().includes(searchTerm) ||
            (entry.description || '').toLowerCase().includes(searchTerm) ||
            (entry.service_type || '').toLowerCase().includes(searchTerm) ||
            (entry.status || '').toLowerCase().includes(searchTerm) ||
            (entry.vehicle_name || '').toLowerCase().includes(searchTerm) ||
            (entry.vehicle_type || '').toLowerCase().includes(searchTerm) ||
            (entry.license_plate || '').toLowerCase().includes(searchTerm) ||
            (entry.date || '').toString().toLowerCase().includes(searchTerm) ||
            (entry.total_debit || '').toString().toLowerCase().includes(searchTerm) ||
            (entry.total_credit || '').toString().toLowerCase().includes(searchTerm) ||
            (entry.saldo_driver_now || '').toString().toLowerCase().includes(searchTerm) ||
            (entry.saldo_agent_now || '').toString().toLowerCase().includes(searchTerm)
          );
        });
      }

      console.log('[Reports] Fetched entries:', filteredData?.length || 0);
      setJournalEntries(filteredData);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: "Failed to load journal entries. Please check if the data exists.",
      });
      // Set empty array to prevent infinite loading
      setJournalEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting - simplified since filtering is now done in fetchJournalEntries
  const applyFilters = () => {
    let filtered = [...journalEntries];

    // Apply sorting only (filtering is done in fetchJournalEntries)
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

  // Export to CSV with all filtered data and additional balance columns
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = [
        'Nama',
        'Date',
        'Description',
        'Service Type',
        'Total Debit',
        'Total Credit',
        'Saldo Driver Now', // Add driver balance column
        'Saldo Agent Now',  // Add agent balance column
        'Vehicle Type',
        'Vehicle Name',
        'License Plate',
        'Status'
      ];

      const csvContent = [
        headers.join(','),
        ...journalEntries.map(entry => [
          `"${entry.nama}"`,
          entry.date,
          `"${entry.description}"`,
          `"${entry.service_type}"`,
          entry.total_debit,
          entry.total_credit || 0,
          entry.saldo_driver_now || 0, // Include driver balance
          entry.saldo_agent_now || 0,  // Include agent balance
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
      startDate: "",
      endDate: "",
      nama: "all", // Reset to 'all'
      serviceType: "all", // Reset to 'all'
      globalSearch: "", // Reset global search
    });
    setCurrentPage(0); // Reset pagination
  };

  // Fetch nama options for the select dropdown
  const fetchNamaOptions = async () => {
    try {
      setLoadingNamaOptions(true);
      
      // First try to fetch from the view
      let { data, error } = await supabase
        .from('vw_journal_entries')
        .select('nama')
        .not('nama', 'is', null)
        .neq('nama', '')
        .order('nama');

      // If view doesn't exist, try alternative sources
      if (error && error.message.includes('relation "vw_journal_entries" does not exist')) {
        console.log('[Reports] View not found for nama options, trying users table...');
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('full_name')
          .not('full_name', 'is', null)
          .neq('full_name', '')
          .order('full_name');
          
        if (usersError) {
          throw usersError;
        }
        
        // Transform users data to nama format
        data = usersData?.map(user => ({ nama: user.full_name })) || [];
        error = null;
      } else if (error) {
        throw error;
      }

      // Get distinct names and create options
      const distinctNames = [...new Set(data?.map(item => item.nama))].filter(name => name && name.trim() !== '');
      const options = [
        { label: 'All Names', value: 'all' }, // Send 'all' instead of empty string
        ...distinctNames.map(nama => ({ label: nama, value: nama }))
      ];

      setNamaOptions(options);
      console.log('[Reports] Nama options loaded:', options.length);
    } catch (error) {
      console.error('Error fetching nama options:', error);
      // Set default options on error
      setNamaOptions([
        { label: 'All Names', value: 'all' }
      ]);
      toast({
        variant: "destructive",
        title: "Error fetching names",
        description: "Failed to load name options",
      });
    } finally {
      setLoadingNamaOptions(false);
    }
  };

  // Fetch nama options on component mount
  useEffect(() => {
    fetchNamaOptions();
  }, []);

  useEffect(() => {
    fetchServiceTypeOptions();
    fetchNamaOptions();
    fetchJournalEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, sortConfig, journalEntries]);

  // Run query when inputs change (deps: start_date, end_date, nama, service_type, global_search, table.pageIndex, table.pageSize)
  useEffect(() => {
    fetchJournalEntries();
  }, [filters.startDate, filters.endDate, filters.nama, filters.serviceType, filters.globalSearch, currentPage, pageSize]);

  // Reset page index when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filters.startDate, filters.endDate, filters.nama, filters.serviceType, filters.globalSearch]);

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
                <div className="space-y-4 mb-6">
                  {/* Global Search */}
                  <div>
                    <Label htmlFor="globalSearch">Global Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="globalSearch"
                        type="text"
                        placeholder="Search across all fields (nama, description, service type, status, vehicle, license plate, date, amounts, balances...)"
                        value={filters.globalSearch}
                        onChange={(e) => setFilters(prev => ({ ...prev, globalSearch: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {/* Other Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, startDate: e.target.value }));
                          setCurrentPage(0); // Reset page when filter changes
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nama">Nama</Label>
                      <Select
                        value={filters.nama}
                        onValueChange={(value) => {
                          setFilters(prev => ({ ...prev, nama: value }));
                          setCurrentPage(0); // Reset page when filter changes
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingNamaOptions ? "Loading..." : "Select name"} />
                        </SelectTrigger>
                        <SelectContent>
                          {namaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="serviceType">Service Type</Label>
                      <Select
                        value={filters.serviceType}
                        onValueChange={(value) => {
                          setFilters(prev => ({ ...prev, serviceType: value }));
                          setCurrentPage(0); // Reset page when filter changes
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All service types" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {journalEntries.length} of {journalEntries.length} entries
                  </div>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>

                {/* Summary - Updated to include balance columns */}
                {journalEntries.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {journalEntries.length}
                        </div>
                        <div className="text-sm text-gray-600">Total Entries</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            journalEntries.reduce((sum, entry) => sum + (entry.total_debit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Debit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            journalEntries.reduce((sum, entry) => sum + (entry.total_credit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Credit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(
                            journalEntries.reduce((sum, entry) => sum + (entry.total_debit || 0) - (entry.total_credit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Net Amount</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(
                            journalEntries.reduce((sum, entry) => sum + (entry.saldo_driver_now || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Driver Balance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {formatCurrency(
                            journalEntries.reduce((sum, entry) => sum + (entry.saldo_agent_now || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Agent Balance</div>
                      </div>
                    </div>
                  </div>
                )}

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
                          <th 
                            className="px-4 py-3 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('total_credit')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Total Credit
                              {sortConfig.key === 'total_credit' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('saldo_driver_now')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Saldo Driver Now
                              {sortConfig.key === 'saldo_driver_now' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('saldo_agent_now')}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Saldo Agent Now
                              {sortConfig.key === 'saldo_agent_now' && (
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
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                Loading journal entries...
                              </div>
                            </td>
                          </tr>
                        ) : journalEntries.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                              No journal entries found matching your criteria
                            </td>
                          </tr>
                        ) : (
                          journalEntries.map((entry, index) => (
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
                                {formatCurrency(entry.total_debit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-blue-600">
                                {formatCurrency(entry.total_credit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-600">
                                {formatCurrency(entry.saldo_driver_now || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-purple-600">
                                {formatCurrency(entry.saldo_agent_now || 0)}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;