import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Search, Filter, Calendar, RefreshCw, Eye, EyeOff } from "lucide-react";
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
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [dsGL, setDsGL] = useState<any[]>([]);
  const [dsTB, setDsTB] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGL, setLoadingGL] = useState(false);
  const [loadingTB, setLoadingTB] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [showJournal, setShowJournal] = useState(true);
  const [activeTab, setActiveTab] = useState("journal-entries");
  const [serviceTypeOptions, setServiceTypeOptions] = useState<ServiceTypeOption[]>([]);
  const [loadingJournal, setLoadingJournal] = useState(false);

  // Get current month's first and last day as default
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // State for filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    nama: '',
    serviceType: '',
    globalSearch: ''
  });

  // State for General Ledger filters
  const [glFilters, setGlFilters] = useState({
    startDate: '',
    endDate: ''
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

  // Fetch journal entries from the view - no filters
  const fetchJournalEntries = async () => {
    try {
      setLoadingJournal(true);
      console.log('[Reports] Fetching journal entries from public.vw_journal_entries...');
      
      // Simple query without any filters
      const { data, error } = await supabase
        .from('vw_journal_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching from vw_journal_entries:', error);
        throw error;
      }

      console.log('[Reports] Fetched entries from vw_journal_entries:', data?.length || 0);
      setJournalEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries from vw_journal_entries:', error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: "Failed to load journal entries from vw_journal_entries view.",
      });
      setJournalEntries([]);
    } finally {
      setLoadingJournal(false);
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
      startDate: '',
      endDate: '',
      nama: '',
      serviceType: '',
      globalSearch: ''
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

  // Fetch General Ledger data
  const fetchGeneralLedger = async () => {
    if (!supabase) return;
    
    setLoadingGL(true);
    try {
      // Convert date format from YYYY-MM-DD to DD/MM/YYYY for the query
      const formatDateForQuery = (dateStr: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const startDateFormatted = formatDateForQuery(glFilters.startDate || filters.startDate);
      const endDateFormatted = formatDateForQuery(glFilters.endDate || filters.endDate);

      // Query directly from public.vw_general_ledger view with custom date filtering
      let query = supabase
        .from('vw_general_ledger')
        .select('date, description, debit, credit');

      // Apply date filters using to_date function if dates are provided
      if (startDateFormatted && endDateFormatted) {
        // Use RPC function for complex date filtering with to_date
        const { data, error } = await supabase.rpc('get_general_ledger_by_date_range', {
          start_date_str: startDateFormatted,
          end_date_str: endDateFormatted
        });

        if (error) {
          // Fallback to simple date comparison if RPC doesn't exist
          console.log('RPC function not found, using simple date filtering');
          
          // Convert back to ISO format for simple comparison
          const startDateISO = glFilters.startDate || filters.startDate;
          const endDateISO = glFilters.endDate || filters.endDate;
          
          const { data: fallbackData, error: fallbackError } = await query
            .gte('date', startDateISO)
            .lte('date', endDateISO)
            .order('date', { ascending: true })
            .order('description', { ascending: true });

          if (fallbackError) {
            throw fallbackError;
          }

          setDsGL(fallbackData || []);
          console.log('General Ledger data fetched (fallback):', fallbackData?.length || 0, 'entries');
        } else {
          setDsGL(data || []);
          console.log('General Ledger data fetched (RPC):', data?.length || 0, 'entries');
        }
      } else if (startDateFormatted) {
        // Single start date filter
        const startDateISO = glFilters.startDate || filters.startDate;
        const { data, error } = await query
          .gte('date', startDateISO)
          .order('date', { ascending: true })
          .order('description', { ascending: true });

        if (error) throw error;
        setDsGL(data || []);
      } else if (endDateFormatted) {
        // Single end date filter
        const endDateISO = glFilters.endDate || filters.endDate;
        const { data, error } = await query
          .lte('date', endDateISO)
          .order('date', { ascending: true })
          .order('description', { ascending: true });

        if (error) throw error;
        setDsGL(data || []);
      } else {
        // No date filters - get all data
        const { data, error } = await query
          .order('date', { ascending: true })
          .order('description', { ascending: true });

        if (error) throw error;
        setDsGL(data || []);
      }

    } catch (error) {
      console.error('Error fetching general ledger:', error);
      toast({
        title: "Error",
        description: "Failed to fetch general ledger data",
        variant: "destructive",
      });
    } finally {
      setLoadingGL(false);
    }
  };

  // Fetch Trial Balance data
  const fetchTrialBalance = async () => {
    if (!supabase) return;
    
    setLoadingTB(true);
    try {
      // Convert date format from YYYY-MM-DD to DD/MM/YYYY for the query
      const formatDateForQuery = (dateStr: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const startDateFormatted = formatDateForQuery(filters.startDate);
      const endDateFormatted = formatDateForQuery(filters.endDate);

      // Query from public.trial_balance_view with date filtering using to_date function
      let query = supabase
        .from('trial_balance_view')
        .select('*');

      // Apply date filters using to_date function if dates are provided
      if (startDateFormatted && endDateFormatted) {
        // Use RPC function for complex date filtering with to_date
        const { data, error } = await supabase.rpc('get_trial_balance_by_date_range', {
          start_date_str: startDateFormatted,
          end_date_str: endDateFormatted
        });

        if (error) {
          // Fallback to simple date comparison if RPC doesn't exist
          console.log('RPC function not found, using simple date filtering for trial balance');
          
          // Convert back to ISO format for simple comparison
          const startDateISO = filters.startDate;
          const endDateISO = filters.endDate;
          
          const { data: fallbackData, error: fallbackError } = await query
            .gte('period_start', startDateISO)
            .lte('period_end', endDateISO)
            .order('account_name', { ascending: true });

          if (fallbackError) {
            throw fallbackError;
          }

          setDsTB(fallbackData || []);
          console.log('Trial Balance data fetched (fallback):', fallbackData?.length || 0, 'entries');
        } else {
          setDsTB(data || []);
          console.log('Trial Balance data fetched (RPC):', data?.length || 0, 'entries');
        }
      } else if (startDateFormatted) {
        // Single start date filter
        const startDateISO = filters.startDate;
        const { data, error } = await query
          .gte('period_start', startDateISO)
          .order('account_name', { ascending: true });

        if (error) throw error;
        setDsTB(data || []);
      } else if (endDateFormatted) {
        // Single end date filter
        const endDateISO = filters.endDate;
        const { data, error } = await query
          .lte('period_end', endDateISO)
          .order('account_name', { ascending: true });

        if (error) throw error;
        setDsTB(data || []);
      } else {
        // No date filters - get all data
        const { data, error } = await query
          .order('account_name', { ascending: true });

        if (error) throw error;
        setDsTB(data || []);
      }

    } catch (error) {
      console.error('Error fetching trial balance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch trial balance data",
        variant: "destructive",
      });
    } finally {
      setLoadingTB(false);
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

  // Refetch data when filters change and tab is active
  useEffect(() => {
    if (activeTab === 'journal-entries' && showJournal) {
      fetchJournalEntries();
    } else if (activeTab === 'general-ledger' && showJournal) {
      fetchGeneralLedger();
    } else if (activeTab === 'trial-balance' && showJournal) {
      fetchTrialBalance();
    }
    
    // Also refetch General Ledger and Trial Balance data when filters change (for the main section)
    fetchGeneralLedger();
    fetchTrialBalance();
  }, [filters.startDate, filters.endDate, filters.nama, filters.serviceType, activeTab, showJournal]);

  // Auto-refetch when filters change
  useEffect(() => {
    if (showJournal) {
      fetchJournalEntries();
    }
  }, [filters.startDate, filters.endDate, filters.nama, filters.serviceType, showJournal]);

  // Auto-fetch when showJournal becomes true
  useEffect(() => {
    if (showJournal) {
      fetchJournalEntries();
    }
  }, [showJournal]);

  const handleKPIClick = (kpiType: string) => {
    setSelectedKPI(kpiType);
    
    if (kpiType === 'journal-entries') {
      setShowJournal(true);
      
      // Refetch journal entries data
      fetchJournalEntries();
      
      // Scroll to journal entries section after a short delay to ensure DOM is updated
      setTimeout(() => {
        const journalSection = document.getElementById('journal-entries');
        if (journalSection) {
          journalSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    }
  };

  const resetKPISelection = () => {
    setSelectedKPI(null);
    setShowJournal(false);
  };

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
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
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
                      onClick={() => setShowJournal(!showJournal)}
                    >
                      {showJournal ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showJournal ? 'Hide' : 'Show'} Journal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchJournalEntries}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Apply/Refresh
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Journal Entries Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
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
                    <Label htmlFor="nama">Customer Name</Label>
                    <Input
                      id="nama"
                      type="text"
                      placeholder="Enter customer name"
                      value={filters.nama}
                      onChange={(e) => setFilters(prev => ({ ...prev, nama: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="serviceType">Service Type</Label>
                    <Select
                      value={filters.serviceType}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, serviceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        <SelectItem value="baggage">Baggage</SelectItem>
                        <SelectItem value="handling">Handling</SelectItem>
                        <SelectItem value="airport_transfer">Airport Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={fetchJournalEntries}
                      disabled={loading}
                      className="w-full"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Apply
                    </Button>
                  </div>
                </div>

                {showJournal && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Showing {journalEntries.length} journal entries
                      </div>
                    </div>

                    {/* Journal Entries Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">Account1</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">Description</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-900">Debit</th>
                              <th className="px-4 py-3 text-right font-medium text-gray-900">Credit</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">Reference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {loading || loadingJournal ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                  <div className="flex items-center justify-center">
                                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                    Loading journal entries...
                                  </div>
                                </td>
                              </tr>
                            ) : journalEntries.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                  No journal entries found for the selected filters
                                </td>
                              </tr>
                            ) : (
                              journalEntries.map((entry, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-900">
                                    {new Date(entry.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {entry.account_name}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {entry.description}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                                    {entry.debit_amount ? formatCurrency(entry.debit_amount) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                                    {entry.credit_amount ? formatCurrency(entry.credit_amount) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {entry.reference_number || '-'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general-ledger" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>General Ledger</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchGeneralLedger}
                      disabled={loadingGL}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingGL ? 'animate-spin' : ''}`} />
                      Apply/Refresh
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* General Ledger Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="glStartDate">Start Date</Label>
                    <Input
                      id="glStartDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="glEndDate">End Date</Label>
                    <Input
                      id="glEndDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={fetchGeneralLedger}
                      disabled={loadingGL}
                      className="w-full"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingGL ? 'animate-spin' : ''}`} />
                      Apply
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {dsGL.length} general ledger entries
                  </div>
                </div>

                {/* General Ledger Summary */}
                {dsGL.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            dsGL.reduce((sum, entry) => sum + (entry.total_debit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Debit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            dsGL.reduce((sum, entry) => sum + (entry.total_credit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Credit</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* General Ledger Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Account Name</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-900">Total Debit</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-900">Total Credit</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-900">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loadingGL ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                Loading general ledger...
                              </div>
                            </td>
                          </tr>
                        ) : dsGL.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              {!filters.startDate || !filters.endDate 
                                ? "Please select both start and end dates to view general ledger data"
                                : "No general ledger entries found for the selected date range"
                              }
                            </td>
                          </tr>
                        ) : (
                          dsGL.map((entry, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {entry.account_name}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                {formatCurrency(entry.total_debit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-blue-600">
                                {formatCurrency(entry.total_credit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-600">
                                {formatCurrency(entry.balance || 0)}
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

          <TabsContent value="trial-balance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Trial Balance</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchTrialBalance}
                      disabled={loadingTB}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingTB ? 'animate-spin' : ''}`} />
                      Apply/Refresh
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Trial Balance Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="tbStartDate">Start Date</Label>
                    <Input
                      id="tbStartDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tbEndDate">End Date</Label>
                    <Input
                      id="tbEndDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={fetchTrialBalance}
                      disabled={loadingTB}
                      className="w-full"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingTB ? 'animate-spin' : ''}`} />
                      Apply
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {dsTB.length} trial balance entries
                  </div>
                </div>

                {/* Trial Balance Summary */}
                {dsTB.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            dsTB.reduce((sum, entry) => sum + (entry.total_debit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Debit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            dsTB.reduce((sum, entry) => sum + (entry.total_credit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Credit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(
                            dsTB.reduce((sum, entry) => sum + (entry.total_debit || 0) - (entry.total_credit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Net Balance</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Balance Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">Account Name</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-900">Debit</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-900">Credit</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-900">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loadingTB ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                Loading trial balance...
                              </div>
                            </td>
                          </tr>
                        ) : dsTB.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              {!filters.startDate || !filters.endDate 
                                ? "Please select both start and end dates to view trial balance data"
                                : "No trial balance entries found for the selected date range"
                              }
                            </td>
                          </tr>
                        ) : (
                          dsTB.map((entry, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {entry.account_name}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                {formatCurrency(entry.total_debit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-blue-600">
                                {formatCurrency(entry.total_credit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-green-600">
                                {formatCurrency(entry.balance || 0)}
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

        {/* Journal Entries Table - Only show when showJournal is true */}
        {showJournal && (
          <div id="journal-entries">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
                <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
                <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
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
                            {loading || loadingJournal ? (
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

              <TabsContent value="general-ledger" className="space-y-6">
                <div id="general-ledger">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>General Ledger</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchGeneralLedger}
                            disabled={loadingGL}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingGL ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Showing {dsGL.length} general ledger entries
                        </div>
                      </div>

                      {/* General Ledger Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Account</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Description</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Debit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Credit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {loadingGL ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center">
                                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                      Loading general ledger...
                                    </div>
                                  </td>
                                </tr>
                              ) : dsGL.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    No general ledger entries found
                                  </td>
                                </tr>
                              ) : (
                                dsGL.map((entry, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-600">
                                      {formatDate(entry.date)}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {entry.account_name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                      {entry.description}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                      {formatCurrency(entry.debit || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                      {formatCurrency(entry.credit || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                      {formatCurrency(entry.balance || 0)}
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
                </div>
              </TabsContent>

              <TabsContent value="trial-balance" className="space-y-6">
                <div id="trial-balance">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Trial Balance</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchTrialBalance}
                            disabled={loadingTB}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingTB ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Showing {dsTB.length} trial balance entries
                        </div>
                      </div>

                      {/* Trial Balance Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Account Name</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Debit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Credit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {loadingTB ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center">
                                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                      Loading trial balance...
                                    </div>
                                  </td>
                                </tr>
                              ) : dsTB.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                    No trial balance entries found
                                  </td>
                                </tr>
                              ) : (
                                dsTB.map((entry, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {entry.account_name}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                      {formatCurrency(entry.total_debit || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                      {formatCurrency(entry.total_credit || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                      {formatCurrency(entry.balance || 0)}
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
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Message when no KPI is selected or non-journal KPI is selected */}
        {!selectedKPI && journalEntries.length > 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">
              Click on any KPI card above to view details
            </div>
            <div className="text-gray-400 text-sm">
              Select "Journal Entries" to view the detailed table
            </div>
          </div>
        )}

        {selectedKPI && selectedKPI !== 'journal-entries' && (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8">
                <div className="text-gray-500 text-lg mb-2">
                  {selectedKPI === 'total-debit' && 'Total Debit Details'}
                  {selectedKPI === 'total-credit' && 'Total Credit Details'}
                  {selectedKPI === 'net-amount' && 'Net Amount Details'}
                  {selectedKPI === 'driver-balance' && 'Driver Balance Details'}
                  {selectedKPI === 'agent-balance' && 'Agent Balance Details'}
                </div>
                <div className="text-gray-400 text-sm mb-4">
                  Detailed analysis for this KPI will be available soon
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => handleKPIClick('journal-entries')}
                  className="mr-2"
                >
                  View Journal Entries
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetKPISelection}
                >
                  Clear Selection
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;