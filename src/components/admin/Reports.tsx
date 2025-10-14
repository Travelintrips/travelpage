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
  const [dsCOA, setDsCOA] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGL, setLoadingGL] = useState(false);
  const [loadingTB, setLoadingTB] = useState(false);
  const [loadingCOA, setLoadingCOA] = useState(false);
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

  const [showGL, setShowGL] = useState(true);

  // State for filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    nama: '',
    serviceType: '',
    globalSearch: ''
  });

  // State for General Ledger filters
  const [gl, setGl] = useState({
    startDate: '',
    endDate: '',
    q: '',
    nameFilter: '',
    serviceTypeFilter: ''
  });

  // State for GL dropdown options
  const [glNameOptions, setGlNameOptions] = useState<Array<{label: string, value: string}>>([]);
  const [glServiceTypeOptions, setGlServiceTypeOptions] = useState<Array<{label: string, value: string}>>([]);
  const [loadingGlOptions, setLoadingGlOptions] = useState(false);

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
      setLoadingJournal(true);
      console.log('[Reports] Fetching journal entries from public.vw_journal_entries with filters:', filters);
      
      // Build query with filters - select specific columns as requested
      let query = supabase
        .from('vw_journal_entries')
        .select(`
          date,
          nama,
          description,
          service_type,
          total_debit,
          total_credit,
          saldo_awal,
          saldo_akhir,
          model,
          vehicle_type,
          license_plate
        `);

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      // Apply nama filter
      if (filters.nama && filters.nama.trim() !== '' && filters.nama !== 'all') {
        query = query.ilike('nama', `%${filters.nama}%`);
      }

      // Apply service type filter - FIXED
      if (filters.serviceType && filters.serviceType !== '' && filters.serviceType !== 'all') {
        query = query.eq('service_type', filters.serviceType);
      }

      // Apply global search filter
      if (filters.globalSearch && filters.globalSearch.trim() !== '') {
        const searchTerm = filters.globalSearch.toLowerCase();
        // Use OR conditions for global search across all requested columns
        query = query.or(`nama.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,service_type.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,vehicle_type.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%`);
      }

      // Order by date descending
      query = query.order('date', { ascending: false });

      const { data, error } = await query;

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

  // Apply filters and sorting - simplified since filtering is now done server-side
  const applyFilters = () => {
    let filtered = [...journalEntries];

    // Apply sorting only (filtering is done server-side in fetchJournalEntries)
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

  // Export to CSV with all filtered data and requested columns
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = [
        'Date',
        'Nama',
        'Description',
        'Service Type',
        'Total Debit',
        'Total Credit',
        'Saldo Awal',
        'Saldo Akhir',
        'Model',
        'Vehicle Type',
        'License Plate'
      ];

      const csvContent = [
        headers.join(','),
        ...journalEntries.map(entry => [
          entry.date,
          `"${entry.nama || ''}"`,
          `"${entry.description || ''}"`,
          `"${entry.service_type || ''}"`,
          entry.total_debit || 0,
          entry.total_credit || 0,
          entry.saldo_awal || 0,
          entry.saldo_akhir || 0,
          `"${entry.model || ''}"`,
          `"${entry.vehicle_type || ''}"`,
          `"${entry.license_plate || ''}"`
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

  // Fetch GL Name and Service Type options
  const fetchGlFilterOptions = async () => {
    try {
      setLoadingGlOptions(true);
      
      // Fetch distinct names
      const { data: nameData, error: nameError } = await supabase
        .from('vw_general_ledger')
        .select('name')
        .not('name', 'is', null)
        .neq('name', '')
        .order('name');

      if (nameError) throw nameError;

      const distinctNames = [...new Set(nameData?.map(item => item.name))].filter(Boolean);
      const nameOptions = [
        { label: 'All Names', value: 'all' },
        ...distinctNames.map(name => ({ label: name, value: name }))
      ];
      setGlNameOptions(nameOptions);

      // Fetch distinct service types
      const { data: serviceData, error: serviceError } = await supabase
        .from('vw_general_ledger')
        .select('service_type')
        .not('service_type', 'is', null)
        .neq('service_type', '')
        .order('service_type');

      if (serviceError) throw serviceError;

      const distinctServiceTypes = [...new Set(serviceData?.map(item => item.service_type))].filter(Boolean);
      const serviceOptions = [
        { label: 'All Service Types', value: 'all' },
        ...distinctServiceTypes.map(type => ({ label: type, value: type }))
      ];
      setGlServiceTypeOptions(serviceOptions);

      console.log('[Reports] GL filter options loaded:', nameOptions.length, serviceOptions.length);
    } catch (error) {
      console.error('Error fetching GL filter options:', error);
      setGlNameOptions([{ label: 'All Names', value: 'all' }]);
      setGlServiceTypeOptions([{ label: 'All Service Types', value: 'all' }]);
    } finally {
      setLoadingGlOptions(false);
    }
  };

  // Fetch General Ledger data with filters using specific query format
  const fetchGeneralLedger = async () => {
    try {
      setLoadingGL(true);
      console.log('[Reports] Fetching general ledger with filters:', gl);
      
      // Build query with specific WHERE conditions - select needed columns including name and service_type
      let query = supabase
        .from('vw_general_ledger')
        .select('date, name, service_type, description, debit, credit');

      // Apply date filters if provided
      if (gl.startDate) {
        query = query.gte('date', gl.startDate);
      }
      if (gl.endDate) {
        query = query.lte('date', gl.endDate);
      }

      // Apply name filter
      if (gl.nameFilter && gl.nameFilter !== 'all') {
        query = query.eq('name', gl.nameFilter);
      }

      // Apply service type filter
      if (gl.serviceTypeFilter && gl.serviceTypeFilter !== 'all') {
        query = query.eq('service_type', gl.serviceTypeFilter);
      }

      // Apply global search filter ONLY if search query is not empty
      if (gl.q && gl.q.trim() !== '') {
        const searchTerm = gl.q.trim();
        // Search in description, name, and service_type columns
        query = query.or(`description.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,service_type.ilike.%${searchTerm}%`);
      }
      // If search is empty, no additional filter is applied - all data will be shown

      // Order by date descending
      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setDsGL(data || []);
      console.log('[Reports] Fetched general ledger entries:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching general ledger:', error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: "Failed to load general ledger data.",
      });
      setDsGL([]);
    } finally {
      setLoadingGL(false);
    }
  };

  // Fetch Trial Balance data from trial_balance_view
  const fetchTrialBalance = async () => {
    if (!supabase) return;
    
    setLoadingTB(true);
    try {
      console.log('[Reports] Fetching trial balance from trial_balance_view');

      // Query directly from trial_balance_view table - select only needed columns
      let query = supabase
        .from('trial_balance_view')
        .select('account_name, debit, credit');

      // Apply date filters if provided
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }

      // Order by account name
      query = query.order('account_name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching from trial_balance_view:', error);
        throw error;
      }

      console.log('[Reports] Fetched trial balance entries from trial_balance_view:', data?.length || 0);
      setDsTB(data || []);
    } catch (error) {
      console.error('Error fetching trial balance from trial_balance_view:', error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: "Failed to load trial balance data from trial_balance_view.",
      });
      setDsTB([]);
    } finally {
      setLoadingTB(false);
    }
  };

  // Fetch Chart of Accounts data from vw_chart_of_accounts
  const fetchChartOfAccounts = async () => {
    try {
      setLoadingCOA(true);
      console.log('[Reports] Fetching chart of accounts from public.vw_chart_of_accounts');

      // Query directly from vw_chart_of_accounts table - select specific columns
      let query = supabase
        .from('vw_chart_of_accounts')
        .select('account_code, account_name, account_type, debit_total, credit_total');

      // Order by account code or name
      query = query.order('account_code', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching from vw_chart_of_accounts:', error);
        throw error;
      }

      console.log('[Reports] Fetched chart of accounts entries from vw_chart_of_accounts:', data?.length || 0);
      setDsCOA(data || []);
    } catch (error) {
      console.error('Error fetching chart of accounts from vw_chart_of_accounts:', error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: "Failed to load chart of accounts data from vw_chart_of_accounts.",
      });
      setDsCOA([]);
    } finally {
      setLoadingCOA(false);
    }
  };

  // Fetch nama options on component mount
  useEffect(() => {
    fetchNamaOptions();
    fetchServiceTypeOptions();
    fetchJournalEntries();
  }, []);

  // Run query when inputs change (deps: start_date, end_date, nama, service_type, global_search, table.pageIndex, table.pageSize)
  useEffect(() => {
    fetchJournalEntries();
  }, [filters.startDate, filters.endDate, filters.nama, filters.serviceType, filters.globalSearch, currentPage, pageSize]);

  // Reset page index when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [filters.startDate, filters.endDate, filters.nama, filters.serviceType, filters.globalSearch]);

  // Auto-fetch when showJournal becomes true
  useEffect(() => {
    if (showJournal) {
      fetchJournalEntries();
    }
  }, [showJournal]);

  // Auto-refetch when GL filters change
  useEffect(() => {
    if (showGL) {
      fetchGeneralLedger();
    }
  }, [showGL, gl.startDate, gl.endDate, gl.q, gl.nameFilter, gl.serviceTypeFilter]);

  // Auto-fetch General Ledger on component mount
  useEffect(() => {
    fetchGeneralLedger();
    fetchChartOfAccounts();
    fetchGlFilterOptions();
  }, []);

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
         {/*  <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="general-ledger">General Ledger</TabsTrigger>
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          </TabsList>*/}

      {/*    <TabsContent value="journal-entries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Journal Entries1</span>
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
              </CardHeader>*/}

         {/*     <CardContent className="space-y-6"> */}
                {/* Journal Entries Date Filters */}
             {/*   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
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
                    </div>*/}

                    {/* Journal Entries Table */}
              {/*      <div className="border rounded-lg overflow-hidden">
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
          </TabsContent> */}

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
                {/* General Ledger Section */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">General Ledger</h3>
                      <Button
                        onClick={fetchGeneralLedger}
                        disabled={loadingGL}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingGL ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>

                    {/* GL Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor="gl-start-date">Start Date</Label>
                        <Input
                          id="gl-start-date"
                          type="date"
                          value={gl.startDate}
                          onChange={(e) => setGl(prev => ({ ...prev, startDate: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gl-end-date">End Date</Label>
                        <Input
                          id="gl-end-date"
                          type="date"
                          value={gl.endDate}
                          onChange={(e) => setGl(prev => ({ ...prev, endDate: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gl-name-filter">Name</Label>
                        <Select
                          value={gl.nameFilter || 'all'}
                          onValueChange={(value) => setGl(prev => ({ ...prev, nameFilter: value === 'all' ? '' : value }))}
                        >
                          <SelectTrigger id="gl-name-filter" className="mt-1">
                            <SelectValue placeholder={loadingGlOptions ? "Loading..." : "All Names"} />
                          </SelectTrigger>
                          <SelectContent>
                            {glNameOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="gl-service-type-filter">Service Type</Label>
                        <Select
                          value={gl.serviceTypeFilter || 'all'}
                          onValueChange={(value) => setGl(prev => ({ ...prev, serviceTypeFilter: value === 'all' ? '' : value }))}
                        >
                          <SelectTrigger id="gl-service-type-filter" className="mt-1">
                            <SelectValue placeholder={loadingGlOptions ? "Loading..." : "All Service Types"} />
                          </SelectTrigger>
                          <SelectContent>
                            {glServiceTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="gl-search">Search</Label>
                        <Input
                          id="gl-search"
                          type="text"
                          placeholder="Search name, service type, description..."
                          value={gl.q}
                          onChange={(e) => setGl(prev => ({ ...prev, q: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
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
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Name</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Service Type</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Description</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-900">Debit</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-900">Credit</th>
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
                                {!gl.startDate || !gl.endDate 
                                  ? "Please select both start and end dates to view general ledger data"
                                  : "No general ledger entries found for the selected criteria"
                                }
                              </td>
                            </tr>
                          ) : (
                            dsGL.map((entry, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-900">
                                  {new Date(entry.date).toLocaleDateString('id-ID')}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {entry.name || '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="text-xs">
                                    {entry.service_type || '-'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-gray-900">
                                  {entry.description || '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">
                                  {formatCurrency(entry.debit || 0)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-blue-600">
                                  {formatCurrency(entry.credit || 0)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            dsTB.reduce((sum, entry) => sum + (entry.debit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Debit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            dsTB.reduce((sum, entry) => sum + (entry.credit || 0), 0)
                          )}
                        </div>
                        <div className="text-sm text-gray-600">Total Credit</div>
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loadingTB ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                              <div className="flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                Loading trial balance...
                              </div>
                            </td>
                          </tr>
                        ) : dsTB.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
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
                                {formatCurrency(entry.debit || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-blue-600">
                                {formatCurrency(entry.credit || 0)}
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
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
                <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
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

                    {/* Totals Container - Only visible when Nama is selected */}
                    {filters.nama && filters.nama !== 'all' && (
                      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Totals for {filters.nama}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                            <div className="text-sm text-gray-600 mb-1">Total Debit</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(
                                (journalEntries || []).reduce((a, r) => a + Number(r.total_debit || r.debit || 0), 0)
                              )}
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                            <div className="text-sm text-gray-600 mb-1">Total Credit</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(
                                (journalEntries || []).reduce((a, r) => a + Number(r.total_credit || r.credit || 0), 0)
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                                onClick={() => handleSort('saldo_awal')}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Saldo Awal
                                  {sortConfig.key === 'saldo_awal' && (
                                    <span className="text-xs">
                                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th 
                                className="px-4 py-3 text-right font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('saldo_akhir')}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Saldo Akhir
                                  {sortConfig.key === 'saldo_akhir' && (
                                    <span className="text-xs">
                                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">
                                Model
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">
                                Vehicle Type
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-900">
                                License Plate
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {loading || loadingJournal ? (
                              <tr>
                                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                  <div className="flex items-center justify-center">
                                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                    Loading journal entries...
                                  </div>
                                </td>
                              </tr>
                            ) : journalEntries.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                                  No journal entries found matching your criteria
                                </td>
                              </tr>
                            ) : (
                              journalEntries.map((entry, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-600">
                                    {formatDate(entry.date)}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {entry.nama || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                                    {entry.description || '-'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className="text-xs">
                                      {entry.service_type || '-'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-green-600">
                                    {formatCurrency(entry.total_debit || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-blue-600">
                                    {formatCurrency(entry.total_credit || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-purple-600">
                                    {formatCurrency(entry.saldo_awal || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-orange-600">
                                    {formatCurrency(entry.saldo_akhir || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {entry.model || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {entry.vehicle_type || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                                    {entry.license_plate || '-'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {/* Footer Row with Totals */}
                          {!loading && !loadingJournal && journalEntries.length > 0 && (
                            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                              <tr>
                                <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">
                                  TOTAL:
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-green-700 text-base">
                                  {formatCurrency(
                                    (journalEntries || []).reduce((a, r) => a + Number(r.total_debit || 0), 0)
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">
                                  {formatCurrency(
                                    (journalEntries || []).reduce((a, r) => a + Number(r.total_credit || 0), 0)
                                  )}
                                </td>
                                <td colSpan={5}></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chart-of-accounts" className="space-y-6">
                <div id="chart-of-accounts">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Chart of Accounts</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchChartOfAccounts}
                            disabled={loadingCOA}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingCOA ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          Showing {dsCOA.length} chart of accounts entries
                        </div>
                      </div>

                      {/* Chart of Accounts Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Account Code</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Account Name</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Account Type</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Debit Total</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Credit Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {loadingCOA ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center">
                                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                      Loading chart of accounts...
                                    </div>
                                  </td>
                                </tr>
                              ) : dsCOA.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    No chart of accounts entries found
                                  </td>
                                </tr>
                              ) : (
                                dsCOA.map((entry, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                                      {entry.account_code}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {entry.account_name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                      <Badge variant="outline" className="text-xs">
                                        {entry.account_type}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                      {formatCurrency(entry.debit_total || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                      {formatCurrency(entry.credit_total || 0)}
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
                      {/* General Ledger Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="gl-start-date">Start Date</Label>
                          <Input
                            id="gl-start-date"
                            type="date"
                            value={gl.startDate}
                            onChange={(e) => setGl(prev => ({ ...prev, startDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="gl-end-date">End Date</Label>
                          <Input
                            id="gl-end-date"
                            type="date"
                            value={gl.endDate}
                            onChange={(e) => setGl(prev => ({ ...prev, endDate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="gl-name-filter">Name</Label>
                          <Select
                            value={gl.nameFilter || 'all'}
                            onValueChange={(value) => setGl(prev => ({ ...prev, nameFilter: value === 'all' ? '' : value }))}
                          >
                            <SelectTrigger id="gl-name-filter" className="mt-1">
                              <SelectValue placeholder={loadingGlOptions ? "Loading..." : "All Names"} />
                            </SelectTrigger>
                            <SelectContent>
                              {glNameOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="gl-service-type-filter">Service Type</Label>
                          <Select
                            value={gl.serviceTypeFilter || 'all'}
                            onValueChange={(value) => setGl(prev => ({ ...prev, serviceTypeFilter: value === 'all' ? '' : value }))}
                          >
                            <SelectTrigger id="gl-service-type-filter" className="mt-1">
                              <SelectValue placeholder={loadingGlOptions ? "Loading..." : "All Service Types"} />
                            </SelectTrigger>
                            <SelectContent>
                              {glServiceTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="gl-search">Search</Label>
                          <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              id="gl-search"
                              type="text"
                              placeholder="Search description..."
                              value={gl.q}
                              onChange={(e) => setGl(prev => ({ ...prev, q: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

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
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Service Type</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-900">Description</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Debit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-900">Credit</th>
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
                                    {!gl.startDate || !gl.endDate 
                                      ? "Please select both start and end dates to view general ledger data"
                                      : "No general ledger entries found for the selected criteria"
                                    }
                                  </td>
                                </tr>
                              ) : (
                                dsGL.map((entry, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900">
                                      {new Date(entry.date).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {entry.name || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge variant="outline" className="text-xs">
                                        {entry.service_type || '-'}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">
                                      {entry.description || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                      {formatCurrency(entry.debit || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                      {formatCurrency(entry.credit || 0)}
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
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {loadingTB ? (
                                <tr>
                                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center">
                                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                                      Loading trial balance...
                                    </div>
                                  </td>
                                </tr>
                              ) : dsTB.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
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
                                      {formatCurrency(entry.debit || 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                                      {formatCurrency(entry.credit || 0)}
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