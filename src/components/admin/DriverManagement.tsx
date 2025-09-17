import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import {
  UserCog,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
  Upload,
  Camera,
  Users,
  UserCheck,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

interface Driver {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  license_number: string | null;
  license_expiry: string | null;
  account_status: string | null;
  selfie_url: string | null;
  sim_url: string | null;
  stnk_url: string | null;
  kk_url: string | null;
  stnk_expiry: string | null;
  family_phone_number: string | null;
  is_online: boolean | null;
  saldo: number | null;
}

interface DriverStats {
  total_drivers: number;
  active_drivers: number;
  online_drivers: number;
  minus_saldo_total: number;
  minus_balance_driver_count: number;
}

const DriverManagement = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // FIXED: Better loading state initialization
  const [loading, setLoading] = useState(false);
  
  const [driverStats, setDriverStats] = useState<DriverStats>({
    total_drivers: 0,
    active_drivers: 0,
    online_drivers: 0,
    minus_saldo_total: 0,
    minus_balance_driver_count: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  const { userRole, isAuthenticated, isSessionReady, isLoading: authLoading } = useAuth();
  
  // Add URL search params for filtering
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get('filter') || 'all';
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(() => {
    const saved = localStorage.getItem('driverManagement_isEditDialogOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(() => {
    const saved = localStorage.getItem('driverManagement_selectedDriver');
    return saved ? JSON.parse(saved) : null;
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('driverManagement_formData');
    return saved ? JSON.parse(saved) : {
      name: "",
      email: "",
      phone_number: "",
      license_number: "",
      license_expiry: "",
      account_status: "active",
      selfie_url: "",
      sim_url: "",
      stnk_url: "",
      kk_url: "",
      stnk_expiry: "",
      family_phone_number: "",
      role_id: null,
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadLoading, setUploadLoading] = useState({
    selfie: false,
    sim: false,
    stnk: false,
    kk: false,
  });

  // Add refs to prevent duplicate fetches and track initialization
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const isInitialized = useRef(false);
  const [isFetching, setIsFetching] = useState(false);

  // FIXED: Single useEffect to handle all initialization logic with caching
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      console.log('[DriverManagement] Already initialized, skipping...');
      return;
    }

    if (isAuthenticated && isSessionReady && !authLoading) {
      console.log('[DriverManagement] Auth ready, initializing component...');
      isInitialized.current = true;
      
      // Check for cached data first
      const cachedDrivers = sessionStorage.getItem('driverManagement_cachedDrivers');
      const cachedStats = sessionStorage.getItem('driverManagement_cachedStats');
      
      if (cachedDrivers && cachedStats) {
        try {
          const parsedDrivers = JSON.parse(cachedDrivers);
          const parsedStats = JSON.parse(cachedStats);
          
          if (parsedDrivers && parsedDrivers.length >= 0) {
            setDrivers(parsedDrivers);
            setDriverStats(parsedStats);
            setStatsLoading(false);
            console.log('[DriverManagement] Loaded cached data, NO LOADING SCREEN');
            
            // Background refresh to get latest data
            setTimeout(() => {
              fetchDrivers(true);
              fetchDriverStats(true);
            }, 100);
            return;
          }
        } catch (error) {
          console.warn('[DriverManagement] Failed to parse cached data:', error);
        }
      }

      // Fetch data if no cache or cache is empty
      console.log('[DriverManagement] No cached data, fetching fresh data...');
      fetchDrivers();
      fetchDriverStats();
    }
  }, [isAuthenticated, isSessionReady, authLoading]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && isSessionReady && !authLoading) {
        const now = Date.now();
        // Only refetch if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[DriverManagement] Tab became visible, doing background refresh...');
          fetchDrivers(true); // Background refresh without loading spinner
          fetchDriverStats(true);
        } else {
          console.log('[DriverManagement] Skipping refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isSessionReady, authLoading]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('driverManagement_isEditDialogOpen', JSON.stringify(isEditDialogOpen));
  }, [isEditDialogOpen]);

  useEffect(() => {
    localStorage.setItem('driverManagement_selectedDriver', JSON.stringify(selectedDriver));
  }, [selectedDriver]);

  useEffect(() => {
    localStorage.setItem('driverManagement_formData', JSON.stringify(formData));
  }, [formData]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // FIXED: Modified fetchDriverStats with caching and proper loading state management
  const fetchDriverStats = async (isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) {
      console.log('[DriverManagement] Stats fetch already in progress, skipping...');
      return;
    }

    // Don't fetch if not authenticated
    if (!isAuthenticated || !isSessionReady || authLoading) {
      console.log('[DriverManagement] Skipping stats fetch - auth not ready');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = Date.now();

    try {
      // Only show loading spinner for initial load
      if (!isBackgroundRefresh && driverStats.total_drivers === 0) {
        console.log('[DriverManagement] Showing loading spinner for stats initial load');
        setStatsLoading(true);
      } else {
        console.log('[DriverManagement] Background stats refresh, no loading spinner');
      }

      const { data, error } = await supabase.rpc('get_driver_kpis');
      
      if (error) {
        console.error("Error fetching driver stats:", error);
        throw error;
      }

      const newStats = data || {
        total_drivers: 0,
        active_drivers: 0,
        online_drivers: 0,
        minus_saldo_total: 0,
        minus_balance_driver_count: 0,
      };

      console.log("Driver stats:", newStats);
      setDriverStats(newStats);
      
      // ✅ Cache the stats data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('driverManagement_cachedStats', JSON.stringify(newStats));
        console.log('[DriverManagement] Stats data cached successfully');
      } catch (cacheError) {
        console.warn('[DriverManagement] Failed to cache stats data:', cacheError);
      }
      
      console.log('[DriverManagement] Driver stats fetch completed successfully');
    } catch (error) {
      console.error("Error fetching driver stats:", error);
      
      // Don't reset data on error, just log the error
      console.warn("[DriverManagement] Keeping existing stats data due to fetch error");
    } finally {
      // CRITICAL: Always reset loading states
      setStatsLoading(false);
      fetchInProgress.current = false;
    }
  };

  // FIXED: Modified fetchDrivers with caching and proper loading state management
  const fetchDrivers = async (isBackgroundRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) {
      console.log('[DriverManagement] Drivers fetch already in progress, skipping...');
      return;
    }

    // Don't fetch if not authenticated or already fetching
    if (!isAuthenticated || !isSessionReady || authLoading || isFetching) {
      console.log('[DriverManagement] Skipping fetch - auth not ready or already fetching');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = Date.now();
    setIsFetching(true);

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && drivers.length === 0) {
        console.log('[DriverManagement] Showing loading spinner for initial load');
        setLoading(true);
      } else {
        console.log('[DriverManagement] Background refresh, no loading spinner');
      }

      console.log("Fetching drivers...");

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching drivers:", error);
        throw error;
      }

      console.log("Fetched drivers:", data);
      const driversData = data || [];
      setDrivers(driversData);
      
      // ✅ Cache the drivers data untuk mencegah loading screen di navigasi berikutnya
      try {
        sessionStorage.setItem('driverManagement_cachedDrivers', JSON.stringify(driversData));
        console.log('[DriverManagement] Drivers data cached successfully');
      } catch (cacheError) {
        console.warn('[DriverManagement] Failed to cache drivers data:', cacheError);
      }
      
      console.log('[DriverManagement] Drivers data fetch completed successfully');
    } catch (error) {
      console.error("Error fetching drivers:", error);
      
      // Don't reset data to empty on error, just log the error
      console.warn("[DriverManagement] Keeping existing data due to fetch error");
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      setIsFetching(false);
      fetchInProgress.current = false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "selfie" | "sim" | "stnk" | "kk",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Set loading state for specific file type
      setUploadLoading((prev) => ({ ...prev, [fileType]: true }));

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${fileType}_${Date.now()}.${fileExt}`;
      const filePath = `drivers/${fileType}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("drivers")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("drivers")
        .getPublicUrl(filePath);

      // Update form data with the file URL
      setFormData({
        ...formData,
        [`${fileType}_url`]: urlData.publicUrl,
      });
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
    } finally {
      setUploadLoading((prev) => ({ ...prev, [fileType]: false }));
    }
  };

  // Utility: Convert empty strings to null for Supabase compatibility
  const cleanDateFields = (data: any) => {
    return {
      ...data,
      license_expiry: data.license_expiry === "" ? null : data.license_expiry,
      stnk_expiry: data.stnk_expiry === "" ? null : data.stnk_expiry,
    };
  };

  // FIXED: Enhanced filtering logic that combines search and KPI filter
  const getFilteredDrivers = () => {
    let filtered = drivers;

    // Apply KPI filter first
    switch (currentFilter) {
      case 'active':
        filtered = drivers.filter(driver => driver.account_status === 'active');
        break;
      case 'online':
        filtered = drivers.filter(driver => driver.is_online === true);
        break;
      case 'negativeBalance':
        filtered = drivers.filter(driver => (driver.saldo || 0) < 0);
        break;
      case 'all':
      default:
        filtered = drivers;
        break;
    }

    // Then apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (driver) =>
          driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (driver.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (driver.phone_number || "").includes(searchTerm) ||
          (driver.license_number?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ),
      );
    }

    return filtered;
  };

  const filteredDrivers = getFilteredDrivers();

  // FIXED: Handle KPI card clicks with proper URL management
  const handleKPICardClick = (filterType: string) => {
    if (currentFilter === filterType) {
      // If clicking the same filter, clear it
      setSearchParams({});
    } else {
      // Set new filter
      setSearchParams({ filter: filterType });
    }
  };

  // FIXED: Clear all filters
  const handleClearFilters = () => {
    setSearchParams({});
    setSearchTerm("");
  };

  const FileUploadField = ({ 
    label, 
    id, 
    fileType, 
    accept = "image/*" 
  }: { 
    label: string; 
    id: string; 
    fileType: "selfie" | "sim" | "stnk" | "kk"; 
    accept?: string; 
  }) => (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor={id} className="text-right">
        {label}
      </Label>
      <div className="col-span-3 flex items-center gap-2">
        <Input
          id={id}
          name={`${fileType}_url`}
          value={formData[`${fileType}_url` as keyof typeof formData] as string}
          onChange={handleInputChange}
          className="flex-1"
          placeholder={`Enter ${label} URL or upload`}
        />
        <div className="relative">
          <Input
            type="file"
            accept={accept}
            id={`${id}-upload`}
            className="absolute inset-0 opacity-0 w-full cursor-pointer"
            onChange={(e) => handleFileUpload(e, fileType)}
            disabled={uploadLoading[fileType]}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={uploadLoading[fileType]}
          >
            {uploadLoading[fileType] ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </div>
        {formData[`${fileType}_url` as keyof typeof formData] && (
          <a
            href={
              formData[`${fileType}_url` as keyof typeof formData] as string
            }
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            <Button type="button" variant="ghost" size="icon">
              <img
                src={
                  formData[`${fileType}_url` as keyof typeof formData] as string
                }
                alt={label}
                className="h-8 w-8 object-cover rounded"
              />
            </Button>
          </a>
        )}
      </div>
    </div>
  );

  const openEditDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name || "",
      email: driver.email || "",
      phone_number: driver.phone_number || "",
      license_number: driver.license_number || "",
      license_expiry: driver.license_expiry || "",
      account_status: driver.account_status || "active",
      selfie_url: driver.selfie_url || "",
      sim_url: driver.sim_url || "",
      stnk_url: driver.stnk_url || "",
      kk_url: driver.kk_url || "",
      stnk_expiry: driver.stnk_expiry || "",
      family_phone_number: driver.family_phone_number || "",
      role_id: null, // This would need to be fetched from the driver data if available
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDeleteDialogOpen(true);
  };

  const handleEditDriver = async () => {
    if (!selectedDriver) return;

    setIsSubmitting(true);
    try {
      const cleanedData = cleanDateFields(formData);
      
      const { error } = await supabase
        .from("drivers")
        .update({
          name: cleanedData.name,
          email: cleanedData.email,
          phone_number: cleanedData.phone_number,
          license_number: cleanedData.license_number,
          license_expiry: cleanedData.license_expiry,
          account_status: cleanedData.account_status,
          selfie_url: cleanedData.selfie_url,
          sim_url: cleanedData.sim_url,
          stnk_url: cleanedData.stnk_url,
          kk_url: cleanedData.kk_url,
          stnk_expiry: cleanedData.stnk_expiry,
          family_phone_number: cleanedData.family_phone_number,
        })
        .eq("id", selectedDriver.id);

      if (error) throw error;

      // Refresh the drivers list
      await fetchDrivers();
      
      // Close dialog and clear state
      setIsEditDialogOpen(false);
      setSelectedDriver(null);
      
      // Clear localStorage
      localStorage.removeItem('driverManagement_isEditDialogOpen');
      localStorage.removeItem('driverManagement_selectedDriver');
      localStorage.removeItem('driverManagement_formData');
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone_number: "",
        license_number: "",
        license_expiry: "",
        account_status: "active",
        selfie_url: "",
        sim_url: "",
        stnk_url: "",
        kk_url: "",
        stnk_expiry: "",
        family_phone_number: "",
        role_id: null,
      });

      console.log("Driver updated successfully");
    } catch (error) {
      console.error("Error updating driver:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;

    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", selectedDriver.id);

      if (error) throw error;

      // Refresh the drivers list
      await fetchDrivers();
      await fetchDriverStats();
      
      // Close dialog and clear state
      setIsDeleteDialogOpen(false);
      setSelectedDriver(null);

      console.log("Driver deleted successfully");
    } catch (error) {
      console.error("Error deleting driver:", error);
    }
  };

  useEffect(() => {
  const fetchDriverStats = async () => {
    setStatsLoading(true);

    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, account_status, is_online, saldo");

      if (error) throw error;

      const totalDrivers = data?.length ?? 0;
      const activeDrivers = data?.filter(d => d.account_status === "active").length ?? 0;
      const onlineDrivers = data?.filter(d => d.is_online === true).length ?? 0;

      // ✅ hitung saldo minus
      const minusBalances = data?.filter(d => (d.saldo ?? 0) < 0) ?? [];
      const minusSaldoTotal = minusBalances.reduce(
        (acc, curr) => acc + (curr.saldo ?? 0),
        0
      );
      const minusBalanceDriverCount = minusBalances.length;

      setDriverStats({
        total_drivers: totalDrivers,
        active_drivers: activeDrivers,
        online_drivers: onlineDrivers,
        minus_saldo_total: minusSaldoTotal,
        minus_balance_driver_count: minusBalanceDriverCount,
      });
    } catch (err) {
      console.error("Error fetching driver stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  fetchDriverStats();
}, []);




  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Driver Management</h1>
      </div>

      {/* FIXED: Driver Statistics Cards - All Clickable with Visual Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card 
          className={`bg-gradient-to-br from-slate-500 to-slate-600 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
            currentFilter === 'all' ? 'ring-4 ring-white ring-opacity-50 shadow-xl' : ''
          }`}
          onClick={() => handleKPICardClick('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
  {statsLoading ? (
    <Loader2 className="h-6 w-6 animate-spin" />
  ) : (
    driverStats.total_drivers
  )}
</div>

            <p className="text-xs text-slate-100">
              All registered drivers
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
            currentFilter === 'active' ? 'ring-4 ring-white ring-opacity-50 shadow-xl' : ''
          }`}
          onClick={() => handleKPICardClick('active')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Driver Active</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                driverStats.active_drivers
              )}
            </div>
            <p className="text-xs text-blue-100">
              Drivers with active account
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-gradient-to-br from-green-500 to-green-600 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
            currentFilter === 'online' ? 'ring-4 ring-white ring-opacity-50 shadow-xl' : ''
          }`}
          onClick={() => handleKPICardClick('online')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Driver Online</CardTitle>
            <UserCheck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
  {statsLoading ? (
    <Loader2 className="h-6 w-6 animate-spin" />
  ) : (
    driverStats.online_drivers
  )}
</div>
            <p className="text-xs text-green-100">
              Drivers currently online
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo Minus</CardTitle>
            <TrendingDown className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className={driverStats.minus_saldo_total < 0 ? "text-red-100" : "text-white"}>
                  {formatRupiah(driverStats.minus_saldo_total || 0)}
                </span>
              )}
            </div>
            <p className="text-xs text-red-100">
              Total negative balance
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-gradient-to-br from-orange-500 to-orange-600 text-white cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
            currentFilter === 'negativeBalance' ? 'ring-4 ring-white ring-opacity-50 shadow-xl' : ''
          }`}
          onClick={() => handleKPICardClick('negativeBalance')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers with Negative Balance</CardTitle>
            <TrendingDown className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                driverStats.minus_balance_driver_count
              )}
            </div>
            <p className="text-xs text-orange-100">
              Drivers with negative balance
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Drivers</CardTitle>
              <CardDescription>
                Manage your driver database
                {currentFilter !== 'all' && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Filtered by: {
                      currentFilter === 'active' ? 'Active Drivers' :
                      currentFilter === 'online' ? 'Online Drivers' :
                      currentFilter === 'negativeBalance' ? 'Negative Balance Drivers' :
                      'All Drivers'
                    })
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* FIXED: Clear Filters Button - Shows when any filter is active */}
              {(currentFilter !== 'all' || searchTerm) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Clear Filters
                </Button>
              )}
              
              {/* FIXED: Search Input - Works on filtered results */}
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drivers..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading drivers...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>SIM Number</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>STNK Expiry</TableHead>
                  <TableHead>Family Phone</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Driver Status</TableHead>
                  <TableHead>Is Online</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      {searchTerm || currentFilter !== 'all' ? 
                        "No drivers found matching the current filters" : 
                        "No drivers found"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.name}
                      </TableCell>
                      <TableCell>{driver.email}</TableCell>
                      <TableCell>{driver.phone_number}</TableCell>
                      <TableCell>{driver.license_number}</TableCell>
                      <TableCell>{driver.license_expiry}</TableCell>
                      <TableCell>{driver.stnk_expiry}</TableCell>
                      <TableCell>{driver.family_phone_number}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {driver.selfie_url && (
                            <a
                              href={driver.selfie_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Selfie"
                            >
                              <img
                                src={driver.selfie_url}
                                alt="Selfie"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            </a>
                          )}
                          {driver.sim_url && (
                            <a
                              href={driver.sim_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="SIM"
                            >
                              <img
                                src={driver.sim_url}
                                alt="SIM"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                          {driver.stnk_url && (
                            <a
                              href={driver.stnk_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="STNK"
                            >
                              <img
                                src={driver.stnk_url}
                                alt="STNK"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                          {driver.kk_url && (
                            <a
                              href={driver.kk_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="KK"
                            >
                              <img
                                src={driver.kk_url}
                                alt="KK"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${driver.account_status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {driver.account_status || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${driver.account_status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {driver.account_status || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${driver.is_online ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {driver.is_online ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${(driver.saldo || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatRupiah(driver.saldo || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(driver)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {userRole === "Super Admin" && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => openDeleteDialog(driver)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredDrivers.length} of {drivers.length} drivers
            {currentFilter !== 'all' && (
              <span className="text-blue-600 ml-1">
                (filtered by {
                  currentFilter === 'active' ? 'active status' :
                  currentFilter === 'online' ? 'online status' :
                  currentFilter === 'negativeBalance' ? 'negative balance' :
                  'all'
                })
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchDriverStats()}>
              Refresh Stats
            </Button>
            <Button variant="outline" onClick={() => fetchDrivers()}>
              Refresh
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* FIXED: Edit Driver Dialog - Keep existing functionality */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          // Clear localStorage when dialog is closed
          localStorage.removeItem('driverManagement_isEditDialogOpen');
          localStorage.removeItem('driverManagement_selectedDriver');
          localStorage.removeItem('driverManagement_formData');
          setSelectedDriver(null);
          setFormData({
            name: "",
            email: "",
            phone_number: "",
            license_number: "",
            license_expiry: "",
            account_status: "active",
            selfie_url: "",
            sim_url: "",
            stnk_url: "",
            kk_url: "",
            stnk_expiry: "",
            family_phone_number: "",
            role_id: null,
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update the driver's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Driver Role
              </Label>
              <select
                id="edit-role"
                name="role_id"
                value={formData.role_id?.toString() || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role_id: parseInt(e.target.value),
                  })
                }
                className="col-span-3 border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Pilih Role</option>
                <option value="2">Driver Mitra</option>
                <option value="3">Driver Perusahaan</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone_number" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-family_phone_number" className="text-right">
                Family Phone
              </Label>
              <Input
                id="edit-family_phone_number"
                name="family_phone_number"
                value={formData.family_phone_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-license_number" className="text-right">
                Sim Number
              </Label>
              <Input
                id="edit-license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-license_expiry" className="text-right">
                License Expiry
              </Label>
              <Input
                id="edit-license_expiry"
                name="license_expiry"
                type="date"
                value={formData.license_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stnk_expiry" className="text-right">
                STNK Expiry
              </Label>
              <Input
                id="edit-stnk_expiry"
                name="stnk_expiry"
                type="date"
                value={formData.stnk_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <FileUploadField
              label="Selfie"
              id="edit-selfie"
              fileType="selfie"
            />
            <FileUploadField label="SIM" id="edit-sim" fileType="sim" />
            <FileUploadField label="STNK" id="edit-stnk" fileType="stnk" />
            <FileUploadField
              label="Kartu Keluarga"
              id="edit-kk"
              fileType="kk"
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Account Status
              </Label>
              <Select
                name="status"
                value={formData.account_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, account_status: value })
                }
              >
                <SelectTrigger id="edit-status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                // Clear localStorage when canceling
                localStorage.removeItem('driverManagement_isEditDialogOpen');
                localStorage.removeItem('driverManagement_selectedDriver');
                localStorage.removeItem('driverManagement_formData');
                setSelectedDriver(null);
                setFormData({
                  name: "",
                  email: "",
                  phone_number: "",
                  license_number: "",
                  license_expiry: "",
                  account_status: "active",
                  selfie_url: "",
                  sim_url: "",
                  stnk_url: "",
                  kk_url: "",
                  stnk_expiry: "",
                  family_phone_number: "",
                  role_id: null,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditDriver}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FIXED: Delete Driver Dialog - Keep existing functionality */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              driver and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverManagement;