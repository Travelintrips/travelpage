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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  Car,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
  Upload,
  X,
  Tag,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import MaintenanceDialog from "./MaintenanceDialog";
import { Badge } from "@/components/ui/badge";

interface VehicleType {
  id: number;
  name: string;
  created_at?: string;
}

interface CarData {
  id: string;
  created_at: string;
  model: string;
  make: string;
  year: number;
  license_plate: string | null;
  color: string | null;
  status: string | null;
  daily_rate: number | null;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  category: string | null;
  seats: number | null;
  image_url: string | null;
  stnk_url: string | null;
  stnk_expiry: string | null;
  tax_expiry: string | null;
  is_active: boolean;
  vehicle_type_id?: number | null;
  vehicle_type_name?: string;
  type?: string;
}

const CarsManagement = () => {
  const [cars, setCars] = useState<CarData[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  
  // FIXED: Better loading state initialization
  const [loading, setLoading] = useState(false);
  
  const { userRole, isAuthenticated, isSessionReady, isLoading: authLoading } = useAuth();
  
  // ✅ Add KPI states
  const [kpiData, setKpiData] = useState({
    totalCars: 0,
    availableCars: 0,
    rentedCars: 0,
    maintenanceCars: 0,
    inactiveCars: 0,
    stnkExpired: 0,
    taxExpired: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  // ✅ FIXED: Add filtering states with better logic
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [filteredVehicles, setFilteredVehicles] = useState<CarData[]>([]);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const vehicleListRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("All");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const saved = localStorage.getItem('carsManagement_selectedCategory');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<
    number | null
  >(() => {
    const saved = localStorage.getItem('carsManagement_selectedVehicleTypeId');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(() => {
    const saved = localStorage.getItem('carsManagement_isEditDialogOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<CarData | null>(() => {
    const saved = localStorage.getItem('carsManagement_selectedCar');
    return saved ? JSON.parse(saved) : null;
  });

  // Vehicle Type Management States
  const [isVehicleTypeDialogOpen, setIsVehicleTypeDialogOpen] = useState(false);
  const [isAddVehicleTypeDialogOpen, setIsAddVehicleTypeDialogOpen] =
    useState(false);
  const [isEditVehicleTypeDialogOpen, setIsEditVehicleTypeDialogOpen] =
    useState(false);
  const [isDeleteVehicleTypeDialogOpen, setIsDeleteVehicleTypeDialogOpen] =
    useState(false);
  const [selectedVehicleType, setSelectedVehicleType] =
    useState<VehicleType | null>(null);
  const [vehicleTypeFormData, setVehicleTypeFormData] = useState({
    name: "",
  });
  
  // Maintenance Dialog State
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('carsManagement_formData');
    return saved ? JSON.parse(saved) : {
      model: "",
      make: "",
      year: "",
      license_plate: "",
      color: "",
      status: "available",
      daily_rate: "",
      mileage: "",
      fuel_type: "",
      transmission: "",
      category: "",
      seats: "",
      image_url: "",
      stnk_url: "",
      stnk_expiry: "",
      tax_expiry: "",
      is_active: true,
      vehicle_type_id: "",
    };
  });

  const [uploadLoading, setUploadLoading] = useState({
    image: false,
    stnk: false,
  });

  // Add ref to track if fetch is in progress
  const [isFetching, setIsFetching] = useState(false);
  const dataLoadedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown between fetches

  // ✅ FIXED: Fetch data when auth is ready and authenticated with proper caching
  useEffect(() => {
    if (isAuthenticated && isSessionReady && !authLoading) {
      console.log('[CarsManagement] Auth ready, checking for cached data...');
      
      // ✅ Load cached data first untuk mencegah loading screen
      const cachedCars = sessionStorage.getItem('carsManagement_cachedCars');
      const cachedKpiData = sessionStorage.getItem('carsManagement_cachedKpiData');
      
      if (cachedCars && cachedKpiData) {
        try {
          const parsedCars = JSON.parse(cachedCars);
          const parsedKpiData = JSON.parse(cachedKpiData);
          
          if (parsedCars && parsedCars.length >= 0) {
            setCars(parsedCars);
            setKpiData(parsedKpiData);
            setKpiLoading(false);
            console.log('[CarsManagement] Loaded cached data, NO LOADING SCREEN');
            
            // Background refresh to get latest data
            setTimeout(() => {
              fetchCars(true);
              fetchKpiData(true);
            }, 100);
            return;
          }
        } catch (error) {
          console.warn('[CarsManagement] Failed to parse cached data:', error);
        }
      }

      // Fetch data if no cache or cache is empty
      console.log('[CarsManagement] No cached data, fetching fresh data...');
      fetchCars();
      fetchVehicleTypes();
      fetchKpiData();
    }
  }, [isAuthenticated, isSessionReady, authLoading]);

  // ✅ FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && isSessionReady && !authLoading) {
        console.log('[CarsManagement] Tab became visible, doing background refresh...');
        
        // Always do background refresh when tab becomes visible
        fetchCars(true); // Background refresh without loading spinner
        fetchKpiData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isSessionReady, authLoading]);

  // Save selected category to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('carsManagement_selectedCategory', JSON.stringify(selectedCategory));
  }, [selectedCategory]);

  // Save selected vehicle type to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('carsManagement_selectedVehicleTypeId', JSON.stringify(selectedVehicleTypeId));
  }, [selectedVehicleTypeId]);

  // Save edit dialog state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('carsManagement_isEditDialogOpen', JSON.stringify(isEditDialogOpen));
  }, [isEditDialogOpen]);

  // Save selected car to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('carsManagement_selectedCar', JSON.stringify(selectedCar));
  }, [selectedCar]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('carsManagement_formData', JSON.stringify(formData));
  }, [formData]);

  // ✅ Add realtime subscription for vehicles table changes
  useEffect(() => {
    const subscription = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicles' }, 
        () => {
          console.log('[CarsManagement] Vehicles table changed, refreshing KPI data...');
          fetchKpiData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_types")
        .select("*")
        .order("name");

      if (error) throw error;

      setVehicleTypes(data || []);
    } catch (error) {
      console.error("Error fetching vehicle types:", error);
    }
  };

  // FIXED: Modified fetchCars with proper loading state management and caching
  const fetchCars = async (isBackgroundRefresh = false) => {
    // Don't fetch if not authenticated or already fetching
    if (!isAuthenticated || !isSessionReady || authLoading || isFetching) {
      console.log('[CarsManagement] Skipping fetch - auth not ready or already fetching');
      return;
    }

    // Prevent duplicate fetches
    setIsFetching(true);

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && cars.length === 0) {
        console.log('[CarsManagement] Showing loading spinner for initial load');
        setLoading(true);
      } else {
        console.log('[CarsManagement] Background refresh, no loading spinner');
      }

      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `
          *,
          vehicle_types(id, name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map the data to match the expected CarData structure
      const mappedData =
        data?.map((car) => {
          // Extract vehicle type data if available
          const vehicleTypeData = car.vehicle_types as {
            id: number;
            name: string;
          } | null;

          return {
            id: car.id.toString(),
            created_at: car.created_at,
            model: car.model || "",
            make: car.make || "",
            year: car.year || new Date().getFullYear(),
            license_plate: car.license_plate,
            color: car.color,
            status: car.status,
            daily_rate: car.price,
            mileage: car.mileage,
            fuel_type: car.fuel_type,
            transmission: car.transmission,
            category: car.category || car.type,
            seats: car.seats,
            image_url: car.image || car.image_url,
            stnk_url: car.stnk_url,
            stnk_expiry: car.stnk_expiry,
            tax_expiry: car.tax_expiry,
            is_active: car.is_active !== false,
            vehicle_type_id: car.vehicle_type_id,
            vehicle_type_name: vehicleTypeData
              ? vehicleTypeData.name
              : undefined,
          };
        }) || [];

      setCars(mappedData);
      
      // Cache the data for future use
      sessionStorage.setItem('carsManagement_cachedCars', JSON.stringify(mappedData));
      
      console.log('[CarsManagement] Cars data fetch completed successfully');
    } catch (error) {
      console.error("Error fetching cars:", error);
      
      // Don't reset data to empty on error, just log the error
      console.warn("[CarsManagement] Keeping existing data due to fetch error");
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      setIsFetching(false);
    }
  };

  // ✅ Add KPI data fetch function with caching
  const fetchKpiData = async (isBackgroundRefresh = false) => {
    // Don't fetch if not authenticated or already fetching
    if (!isAuthenticated || !isSessionReady || authLoading) {
      console.log('[CarsManagement] Skipping KPI fetch - auth not ready');
      return;
    }

    try {
      // Only show loading spinner for initial load
      if (!isBackgroundRefresh && kpiData.totalCars === 0) {
        setKpiLoading(true);
      }

      const todayISO = new Date().toISOString().slice(0, 10);

      // Use Promise.all for parallel queries
      const [
        totalCarsResult,
        availableResult,
        rentedResult,
        maintenanceResult,
        inactiveResult,
        stnkExpiredResult,
        taxExpiredResult
      ] = await Promise.all([
        // Total Cars
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true }),
        
        // Available
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'available'),
        
        // Rented
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'rented'),
        
        // Maintenance
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'maintenance'),
        
        // Inactive
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .or('is_active.eq.false,is_active.is.null'),
        
        // STNK Expired
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .not('stnk_expiry', 'is', null)
          .lt('stnk_expiry', todayISO),
        
        // Tax Expired
        supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .not('tax_expiry', 'is', null)
          .lt('tax_expiry', todayISO)
      ]);

      // Check for errors
      if (totalCarsResult.error) throw totalCarsResult.error;
      if (availableResult.error) throw availableResult.error;
      if (rentedResult.error) throw rentedResult.error;
      if (maintenanceResult.error) throw maintenanceResult.error;
      if (inactiveResult.error) throw inactiveResult.error;
      if (stnkExpiredResult.error) throw stnkExpiredResult.error;
      if (taxExpiredResult.error) throw taxExpiredResult.error;

      const newKpiData = {
        totalCars: totalCarsResult.count || 0,
        availableCars: availableResult.count || 0,
        rentedCars: rentedResult.count || 0,
        maintenanceCars: maintenanceResult.count || 0,
        inactiveCars: inactiveResult.count || 0,
        stnkExpired: stnkExpiredResult.count || 0,
        taxExpired: taxExpiredResult.count || 0,
      };

      setKpiData(newKpiData);
      
      // Cache the KPI data
      sessionStorage.setItem('carsManagement_cachedKpiData', JSON.stringify(newKpiData));

      console.log('[CarsManagement] KPI Data fetch completed successfully');

    } catch (error) {
      console.error("Error fetching KPI data:", error);
      
      // Don't reset data on error, just log the error
      console.warn("[CarsManagement] Keeping existing KPI data due to fetch error");
    } finally {
      setKpiLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "vehicle_type_id") {
      const selected = vehicleTypes.find((v) => v.id === Number(value));
      setFormData({
        ...formData,
        [name]: value,
        category: selected?.name || "", // ✅ simpan ke category/type
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleAddCar = async () => {
    try {
      console.log("Adding car with data:", formData);

      // Validate required fields
      if (!formData.make || !formData.model) {
        alert("Make and Model are required fields");
        return;
      }

      // Convert numeric fields and clean daily_rate
      const cleanDailyRate = formData.daily_rate
        ? Number(String(formData.daily_rate).replace(/[^0-9]/g, ''))
        : 0;

      const vehicleData = {
        make: formData.make,
        model: formData.model,
        year: formData.year
          ? parseInt(formData.year)
          : new Date().getFullYear(),
        license_plate: formData.license_plate,
        color: formData.color,
        status: formData.status || "available",
        price: cleanDailyRate,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        category: formData.category,
        seats: formData.seats ? parseInt(formData.seats) : 4,
        image: formData.image_url,
        stnk_url: formData.stnk_url,
        stnk_expiry: formData.stnk_expiry,
        tax_expiry: formData.tax_expiry,
        available: formData.is_active,
        vehicle_type_id: formData.vehicle_type_id
          ? parseInt(formData.vehicle_type_id)
          : null,
      };

      const { data, error } = await supabase
        .from("vehicles")
        .insert([vehicleData])
        .select();

      if (error) {
        console.error("Supabase error:", error);
        alert(`Error adding car: ${error.message}`);
        throw error;
      }

      console.log("Add car response:", data);

      if (data && data.length > 0) {
        // Map the new car to match CarData structure
        const newCar = {
          id: data[0].id.toString(),
          created_at: data[0].created_at,
          model: data[0].model || "",
          make: data[0].make || "",
          year: data[0].year || new Date().getFullYear(),
          license_plate: data[0].license_plate,
          color: data[0].color,
          status: data[0].status,
          daily_rate: data[0].price,
          mileage: data[0].mileage,
          fuel_type: data[0].fuel_type,
          transmission: data[0].transmission,
          category: data[0].category || data[0].type,
          seats: data[0].seats,
          image_url: data[0].image || data[0].image_url,
          stnk_url: data[0].stnk_url,
          stnk_expiry: data[0].stnk_expiry,
          tax_expiry: data[0].tax_expiry,
          is_active: data[0].available !== false,
          vehicle_type_id: data[0].vehicle_type_id,
          vehicle_type_name: vehicleTypes.find(
            (vt) => vt.id === data[0].vehicle_type_id,
          )?.name,
        };

        setCars([newCar, ...cars]);
        alert("Car added successfully!");
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error adding car:", error);
      alert(`Failed to add car: ${error.message}`);
    }
  };

  const handleEditCar = async () => {
    if (!selectedCar) return;

    try {
      // Convert numeric fields and clean daily_rate
      const cleanDailyRate = formData.daily_rate
        ? Number(String(formData.daily_rate).replace(/[^0-9]/g, ''))
        : null;

      const updatePayload = {
        make: formData.make,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        license_plate: formData.license_plate,
        color: formData.color,
        status: formData.status,
        price: cleanDailyRate,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        fuel_type: formData.fuel_type,
        transmission: formData.transmission,
        category: formData.category,
        seats: formData.seats ? parseInt(formData.seats) : null,
        image: formData.image_url,
        stnk_url: formData.stnk_url,
        stnk_expiry: formData.stnk_expiry,
        tax_expiry: formData.tax_expiry,
        available: formData.is_active,
        vehicle_type_id: formData.vehicle_type_id
          ? parseInt(formData.vehicle_type_id)
          : null,
      };

      const { data, error } = await supabase
        .from("vehicles")
        .update(updatePayload)
        .eq("id", selectedCar.id)
        .select("id, price")
        .single();

      if (error) throw error;

      // Sync state list with updated data
      if (data) {
        const updatedCars = cars.map((car) =>
          car.id === selectedCar.id 
            ? { ...car, daily_rate: data.price }
            : car
        );
        setCars(updatedCars);
      }

      setIsEditDialogOpen(false);
      setSelectedCar(null);
      resetForm();
    } catch (error) {
      console.error("Error updating car:", error);
    }
  };

  const handleDeleteCar = async () => {
    if (!selectedCar) return;

    if (userRole !== "Super Admin") {
      alert("Only Super Admin can delete cars");
      return;
    }

    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", selectedCar.id);

      if (error) throw error;

      const filteredCars = cars.filter((car) => car.id !== selectedCar.id);

      setCars(filteredCars);
      setIsDeleteDialogOpen(false);
      setSelectedCar(null);
    } catch (error) {
      console.error("Error deleting car:", error);
    }
  };

  const openEditDialog = (car: CarData) => {
    const matchedType = vehicleTypes.find((v) => v.id === car.vehicle_type_id);

    setSelectedCar(car);
    setFormData({
      model: car.model,
      make: car.make,
      year: car.year?.toString() || "",
      license_plate: car.license_plate || "",
      color: car.color || "",
      status: car.status || "available",
      daily_rate: car.daily_rate?.toString() || "",
      mileage: car.mileage?.toString() || "",
      fuel_type: car.fuel_type || "",
      transmission: car.transmission || "",
      category: car.category || "",
      seats: car.seats?.toString() || "",
      image_url: car.image_url || "",
      stnk_url: car.stnk_url || "",
      stnk_expiry: car.stnk_expiry || "",
      tax_expiry: car.tax_expiry || "",
      is_active: car.is_active !== false,
      vehicle_type_id: car.vehicle_type_id?.toString() || "",
    });

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (car: CarData) => {
    setSelectedCar(car);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    const defaultFormData = {
      model: "",
      make: "",
      year: "",
      license_plate: "",
      color: "",
      status: "available",
      daily_rate: "",
      mileage: "",
      fuel_type: "",
      transmission: "",
      category: "",
      seats: "",
      image_url: "",
      stnk_url: "",
      stnk_expiry: "",
      tax_expiry: "",
      is_active: true,
      vehicle_type_id: "",
    };
    setFormData(defaultFormData);
    // Clear localStorage when resetting form
    localStorage.removeItem('carsManagement_formData');
    localStorage.removeItem('carsManagement_selectedCar');
    localStorage.removeItem('carsManagement_isEditDialogOpen');
  };

  // ✅ FIXED: Update filtered cars logic to work with card filter and new filters
  const getDisplayedCars = () => {
    let carsToFilter = cars;

    // Apply search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      carsToFilter = carsToFilter.filter(
        (car) =>
          car.model.toLowerCase().includes(query) ||
          car.make.toLowerCase().includes(query) ||
          car.license_plate?.toLowerCase().includes(query) ||
          car.color?.toLowerCase().includes(query)
      );
    }

    // Apply make filter
    if (makeFilter !== "All") {
      carsToFilter = carsToFilter.filter((car) => car.make === makeFilter);
    }

    // Apply vehicle type filter
    if (vehicleTypeFilter !== "All") {
      carsToFilter = carsToFilter.filter((car) => car.vehicle_type_name === vehicleTypeFilter);
    }

    // Apply status filter
    if (statusFilter !== "All") {
      carsToFilter = carsToFilter.filter((car) => {
        if (statusFilter === "Available") return car.status === "available" && car.is_active;
        if (statusFilter === "In Active") return !car.is_active;
        if (statusFilter === "Maintenance") return car.status === "maintenance";
        return false;
      });
    }

    // Apply existing category filter if active
    if (selectedCategory !== null) {
      carsToFilter = carsToFilter.filter((car) => car.category === selectedCategory);
    }

    // Apply existing vehicle type ID filter if active
    if (selectedVehicleTypeId !== null) {
      carsToFilter = carsToFilter.filter((car) => car.vehicle_type_id === selectedVehicleTypeId);
    }

    // Apply card filter if active
    if (isFilterActive && filteredVehicles.length >= 0) {
      return filteredVehicles.filter(
        (car) =>
          (car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
            car.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            car.color?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return carsToFilter;
  };

  const displayedCars = getDisplayedCars();

  // Get unique values for filter options
  const uniqueMakes = [...new Set(cars.map(car => car.make).filter(Boolean))];
  const uniqueVehicleTypes = [...new Set(cars.map(car => car.vehicle_type_name).filter(Boolean))];

  // Pagination calculations
  const totalPages = Math.ceil(displayedCars.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentCars = displayedCars.slice(startIndex, endIndex);

  // Group cars by model
  const groupedCars = currentCars.reduce<Record<string, CarData[]>>(
    (acc, car) => {
      const model = car.model;
      if (!acc[model]) {
        acc[model] = [];
      }
      acc[model].push(car);
      return acc;
    },
    {},
  );

  // Sort models alphabetically
  const sortedModels = Object.keys(groupedCars).sort();

  const categories = [
    "Sedan",
    "SUV",
    "Truck",
    "Luxury",
    "Hatchback",
    "MPV",
    "Convertible",
    "Coupe",
    "Van",
    "Minivan",
  ];
  const uniqueCategories = Array.from(
    new Set(cars.map((car) => car.category).filter(Boolean)),
  );

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "image" | "stnk",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Set loading state for specific file type
      setUploadLoading((prev) => ({ ...prev, [fileType]: true }));

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${fileType}_${Date.now()}.${fileExt}`;
      const filePath = `cars/${fileType}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("cars")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("cars")
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

  const handleToggleActive = async (car: CarData) => {
    try {
      const newStatus = !car.is_active;
      
      // Prepare update payload
      const updatePayload: { available?: boolean; is_active?: boolean; status?: string } = {
        available: newStatus,  // Update 'available' field (used in vehicles table)
        is_active: newStatus,  // Also update 'is_active' for consistency
      };
      
      // If suspending (newStatus = false), set status to "suspended"
      // If activating (newStatus = true), set status to "available"
      if (!newStatus) {
        updatePayload.status = "suspended";
      } else {
        updatePayload.status = "available";
      }
      
      console.log('Updating vehicle:', car.id, 'with payload:', updatePayload);
      
      const { data, error } = await supabase
        .from("vehicles")
        .update(updatePayload)
        .eq("id", car.id)
        .select();

      if (error) {
        console.error('Error updating vehicle:', error);
        throw error;
      }

      console.log('Vehicle updated successfully:', data);

      // Update local state
      const updatedCars = cars.map((c) =>
        c.id === car.id 
          ? { 
              ...c, 
              is_active: newStatus,
              status: updatePayload.status 
            } 
          : c
      );
      setCars(updatedCars);
      
      // Refresh KPI data to reflect changes
      fetchKpiData(true);
    } catch (error) {
      console.error("Error toggling car active status:", error);
      alert(`Failed to update car status: ${error.message}`);
    }
  };

  const FileUploadField = ({
    label,
    id,
    fileType,
    accept = "image/*",
  }: {
    label: string;
    id: string;
    fileType: "image" | "stnk";
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

  // Vehicle Type Management Functions
  const handleVehicleTypeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setVehicleTypeFormData({
      ...vehicleTypeFormData,
      [name]: value,
    });
  };

  const handleAddVehicleType = async () => {
    try {
      if (!vehicleTypeFormData.name.trim()) {
        alert("Vehicle type name is required");
        return;
      }

      const { data, error } = await supabase
        .from("vehicle_types")
        .insert([{ name: vehicleTypeFormData.name.trim() }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setVehicleTypes([...vehicleTypes, data[0]]);
        setIsAddVehicleTypeDialogOpen(false);
        setVehicleTypeFormData({ name: "" });
      }
    } catch (error) {
      console.error("Error adding vehicle type:", error);
      alert(`Failed to add vehicle type: ${error.message}`);
    }
  };

  const handleEditVehicleType = async () => {
    try {
      if (!selectedVehicleType) return;
      if (!vehicleTypeFormData.name.trim()) {
        alert("Vehicle type name is required");
        return;
      }

      const { data, error } = await supabase
        .from("vehicle_types")
        .update({ name: vehicleTypeFormData.name.trim() })
        .eq("id", selectedVehicleType.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setVehicleTypes(
          vehicleTypes.map((vt) =>
            vt.id === selectedVehicleType.id ? data[0] : vt,
          ),
        );
        setIsEditVehicleTypeDialogOpen(false);
        setSelectedVehicleType(null);
        setVehicleTypeFormData({ name: "" });
      }
    } catch (error) {
      console.error("Error updating vehicle type:", error);
      alert(`Failed to update vehicle type: ${error.message}`);
    }
  };

  const handleDeleteVehicleType = async () => {
    try {
      if (!selectedVehicleType) return;

      if (userRole !== "Super Admin") {
        alert("Only Super Admin can delete vehicle types");
        return;
      }

      // Check if any cars are using this vehicle type
      const { data: carsWithType, error: checkError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("vehicle_type_id", selectedVehicleType.id);

      if (checkError) throw checkError;

      if (carsWithType && carsWithType.length > 0) {
        alert(
          `Cannot delete this vehicle type because it is used by ${carsWithType.length} car(s). Please reassign those cars to another type first.`,
        );
        return;
      }

      const { error } = await supabase
        .from("vehicle_types")
        .delete()
        .eq("id", selectedVehicleType.id);

      if (error) throw error;

      setVehicleTypes(
        vehicleTypes.filter((vt) => vt.id !== selectedVehicleType.id),
      );
      setIsDeleteVehicleTypeDialogOpen(false);
      setSelectedVehicleType(null);
    } catch (error) {
      console.error("Error deleting vehicle type:", error);
      alert(`Failed to delete vehicle type: ${error.message}`);
    }
  };

  const openEditVehicleTypeDialog = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setVehicleTypeFormData({ name: vehicleType.name });
    setIsEditVehicleTypeDialogOpen(true);
  };

  const openDeleteVehicleTypeDialog = (vehicleType: VehicleType) => {
    setSelectedVehicleType(vehicleType);
    setIsDeleteVehicleTypeDialogOpen(true);
  };

  // ✅ FIXED: Function to clear filter
  const clearFilter = () => {
    console.log('[CarsManagement] Clearing card filter');
    setCardFilter(null);
    setIsFilterActive(false);
    setFilteredVehicles([]);
  };

  // ✅ FIXED: Function to get filter display name
  const getFilterDisplayName = (filterType: string) => {
    switch (filterType) {
      case "available": return "Available Cars";
      case "rented": return "Rented Cars";
      case "maintenance": return "Maintenance Cars";
      case "inactive": return "Inactive Cars";
      case "stnk_expired": return "STNK Expired";
      case "tax_expired": return "Tax Expired";
      default: return filterType;
    }
  };

  // ✅ FIXED: Improved function to handle card click and filter vehicles
  const handleCardClick = async (filterType: string) => {
    try {
      console.log(`[CarsManagement] Filtering by: ${filterType}`);
      setCardFilter(filterType);
      setIsFilterActive(true);
      
      let query = supabase.from("vehicles").select(`
        *,
        vehicle_types(id, name)
      `);
      
      const today = new Date().toISOString().split('T')[0];
      
      // Apply card filter
      switch (filterType) {
        case "available":
          query = query.eq("status", "available").eq("is_active", true);
          break;
        case "rented":
          query = query.eq("status", "rented");
          break;
        case "maintenance":
          query = query.eq("status", "maintenance");
          break;
        case "inactive":
          query = query.eq("is_active", false);
          break;
        case "stnk_expired":
          query = query.not("stnk_expiry", "is", null).lt("stnk_expiry", today);
          break;
        case "tax_expired":
          query = query.not("tax_expiry", "is", null).lt("tax_expiry", today);
          break;
        default:
          // No additional filter for total
          break;
      }
      
      // Apply existing category filter if active
      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }
      
      // Apply existing vehicle type filter if active
      if (selectedVehicleTypeId) {
        query = query.eq("vehicle_type_id", selectedVehicleTypeId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error filtering vehicles:", error);
        throw error;
      }
      
      // Map the data to match CarData structure
      const mappedData = data?.map((car) => {
        const vehicleTypeData = car.vehicle_types as {
          id: number;
          name: string;
        } | null;

        return {
          id: car.id.toString(),
          created_at: car.created_at,
          model: car.model || "",
          make: car.make || "",
          year: car.year || new Date().getFullYear(),
          license_plate: car.license_plate,
          color: car.color,
          status: car.status,
          daily_rate: car.price,
          mileage: car.mileage,
          fuel_type: car.fuel_type,
          transmission: car.transmission,
          category: car.category || car.type,
          seats: car.seats,
          image_url: car.image || car.image_url,
          stnk_url: car.stnk_url,
          stnk_expiry: car.stnk_expiry,
          tax_expiry: car.tax_expiry,
          is_active: car.is_active !== false,
          vehicle_type_id: car.vehicle_type_id,
          vehicle_type_name: vehicleTypeData?.name,
        };
      }) || [];
      
      console.log(`[CarsManagement] Filtered ${mappedData.length} vehicles for ${filterType}`);
      setFilteredVehicles(mappedData);
      
      // Scroll to vehicle list section with smooth animation
      setTimeout(() => {
        vehicleListRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
      
    } catch (error) {
      console.error("Error filtering vehicles:", error);
      setIsFilterActive(false);
      setCardFilter(null);
    }
  };

  return (
    <div className="space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Car Management</h1>
        <div className="flex gap-2">
        {userRole !=="Staff" && (
          <>
          <Button
            variant="outline"
            onClick={() => setIsMaintenanceDialogOpen(true)}
            className="flex items-center"
          >
            <Wrench className="h-4 w-4 mr-2" /> Manage Maintenance
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsVehicleTypeDialogOpen(true)}
            className="flex items-center"
          >
            <Tag className="h-4 w-4 mr-2" /> Manage Vehicle Types
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Car
          </Button>
          </>
        )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-muted/30 p-2 rounded-lg flex gap-2 overflow-x-auto">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className="whitespace-nowrap"
          >
            All Categories
          </Button>
          {uniqueCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="bg-muted/30 p-2 rounded-lg flex gap-2 overflow-x-auto">
          <Button
            variant={selectedVehicleTypeId === null ? "default" : "outline"}
            onClick={() => setSelectedVehicleTypeId(null)}
            className="whitespace-nowrap"
          >
            All Vehicle Types
          </Button>
          {vehicleTypes.map((type) => (
            <Button
              key={type.id}
              variant={
                selectedVehicleTypeId === type.id ? "default" : "outline"
              }
              onClick={() => setSelectedVehicleTypeId(type.id)}
              className="whitespace-nowrap"
            >
              {type.name}
            </Button>
          ))}
        </div>
      </div>

      {/* ✅ FIXED: Clickable KPI Cards - First Row - Status KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          onClick={() => handleCardClick("available")} 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-green-300"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-700">Available Cars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.availableCars
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>
        
        <Card 
          onClick={() => handleCardClick("rented")} 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-blue-300"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-700">Rented Cars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.rentedCars
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>
        
        <Card 
          onClick={() => handleCardClick("maintenance")} 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-yellow-300"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-yellow-700">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.maintenanceCars
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>
        
        <Card 
          onClick={() => handleCardClick("inactive")} 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-gray-300"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-700">Inactive Cars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.inactiveCars
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ FIXED: Second Row - Additional KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Cars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.totalCars
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All vehicles</p>
          </CardContent>
        </Card>
        
        <Card 
          onClick={() => handleCardClick("stnk_expired")} 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-red-300"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-600">STNK Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.stnkExpired
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>
        
        <Card 
          onClick={() => handleCardClick("tax_expired")} 
          className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-red-300"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-600">Tax Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {kpiLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                kpiData.taxExpired
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ FIXED: Filter Status Badge */}
      {isFilterActive && cardFilter && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <Badge variant="secondary" className="text-sm font-medium">
              Filter: {getFilterDisplayName(cardFilter)}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilter}
              className="h-7 px-3 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Vehicle List Section with ref for scrolling */}
      <div ref={vehicleListRef} className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  Vehicle List {isFilterActive && `(${displayedCars.length} filtered)`}
                </CardTitle>
                <CardDescription>Manage your car fleet</CardDescription>
              </div>
            </div>
            
            {/* Enhanced Filters Section */}
            <div className="flex flex-col gap-4 mt-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by make, model, or license plate..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="min-w-[150px]">
                  <Label htmlFor="make-filter" className="text-sm font-medium mb-2 block">
                    By Make
                  </Label>
                  <Select value={makeFilter} onValueChange={setMakeFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All Makes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Makes</SelectItem>
                      {uniqueMakes.map((make) => (
                        <SelectItem key={make} value={make}>
                          {make}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[150px]">
                  <Label htmlFor="type-filter" className="text-sm font-medium mb-2 block">
                    Vehicle Type
                  </Label>
                  <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Types</SelectItem>
                      {uniqueVehicleTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[150px]">
                  <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">
                    Vehicle Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Active">In Active</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchCars(true)}
                    disabled={loading}
                    className="h-10 w-10"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>

            {searchTerm && (
              <div className="mt-2 text-sm text-muted-foreground">
                Search results for:{" "}
                <span className="font-medium">"{searchTerm}"</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading cars...</span>
              </div>
            ) : displayedCars.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isFilterActive ? (
                  <div>
                    <p>No vehicles found for the selected filter.</p>
                    <Button 
                      variant="outline" 
                      onClick={clearFilter}
                      className="mt-2"
                    >
                      Clear Filter
                    </Button>
                  </div>
                ) : (
                  "No vehicles found."
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {sortedModels.map((model) => (
                  <div
                    key={model}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-muted p-3 font-medium flex justify-between items-center">
                      <div className="flex items-center">
                        <Car className="h-5 w-5 mr-2 text-primary" />
                        <span>
                          {model} ({groupedCars[model].length})
                        </span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Car</TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>License Plate</TableHead>
                          <TableHead>Vehicle Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>STNK Expiry</TableHead>
                          <TableHead>Tax Expiry</TableHead>
                          <TableHead>Daily Rate</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedCars[model].map((car) => (
                          <TableRow
                            key={car.id}
                            className={
                              car.is_active === false ? "opacity-60" : ""
                            }
                          >
                            <TableCell>
                              {car.image_url ? (
                                <img
                                  src={car.image_url}
                                  alt={`${car.make} ${car.model}`}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                  <Car className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{car.make}</div>
                            </TableCell>
                            <TableCell>{car.year}</TableCell>
                            <TableCell>{car.license_plate}</TableCell>
                            <TableCell>
                              {car.vehicle_type_name || car.category || "-"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${car.status === "available" || !car.status ? "bg-green-100 text-green-800" : car.status === "rented" || car.status === "booked" || car.status === "onride" ? "bg-blue-100 text-blue-800" : car.status === "maintenance" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                              >
                                {car.status || "available"}
                              </span>
                            </TableCell>
                            <TableCell>{car.stnk_expiry || "-"}</TableCell>
                            <TableCell>{car.tax_expiry || "-"}</TableCell>
                            <TableCell>
                              {car.daily_rate
                                ? `Rp ${Number(car.daily_rate).toLocaleString("id-ID")}`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                            {userRole !=="Staff" && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditDialog(car)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={
                                    car.is_active === false
                                      ? "default"
                                      : "outline"
                                  }
                                  size="icon"
                                  className={
                                    car.is_active === false
                                      ? "bg-amber-500 hover:bg-amber-600"
                                      : "bg-slate-200 hover:bg-slate-300"
                                  }
                                  onClick={() => handleToggleActive(car)}
                                  title={
                                    car.is_active === false
                                      ? "Activate"
                                      : "Suspend"
                                  }
                                >
                                  {car.is_active === false ? (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                    >
                                      <path d="M5 12h14" />
                                    </svg>
                                  ) : (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                    >
                                      <path d="M5 12h14" />
                                    </svg>
                                  )}
                                </Button>
                                {userRole === "Super Admin" && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => openDeleteDialog(car)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {/* Pagination */}
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min(startIndex + 1, displayedCars.length)} to{" "}
                {Math.min(endIndex, displayedCars.length)} of{" "}
                {displayedCars.length} entries
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page:
                </Label>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-10"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Maintenance Dialog */}
      <MaintenanceDialog
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
      />

      {/* Add Car Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Car</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new car to the fleet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="make" className="text-right">
                Make
              </Label>
              <Input
                id="make"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Input
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Year
              </Label>
              <Input
                id="year"
                name="year"
                type="number"
                value={formData.year}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license_plate" className="text-right">
                License Plate
              </Label>
              <Input
                id="license_plate"
                name="license_plate"
                value={formData.license_plate}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <Input
                id="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daily_rate" className="text-right">
                Daily Rate
              </Label>
              <Input
                id="daily_rate"
                name="daily_rate"
                type="number"
                value={formData.daily_rate}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Enter daily rate (numbers only)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mileage" className="text-right">
                Mileage
              </Label>
              <Input
                id="mileage"
                name="mileage"
                type="number"
                value={formData.mileage}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fuel_type" className="text-right">
                Fuel Type
              </Label>
              <Input
                id="fuel_type"
                name="fuel_type"
                value={formData.fuel_type}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transmission" className="text-right">
                Transmission
              </Label>
              <Input
                id="transmission"
                name="transmission"
                value={formData.transmission}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vehicle_type_id" className="text-right">
                Vehicle Type
              </Label>
              <select
                id="vehicle_type_id"
                name="vehicle_type_id"
                value={formData.vehicle_type_id}
                onChange={handleSelectChange}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a vehicle type</option>
                {vehicleTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="seats" className="text-right">
                Seats
              </Label>
              <Input
                id="seats"
                name="seats"
                type="number"
                value={formData.seats}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <FileUploadField
              label="Car Image"
              id="image_url"
              fileType="image"
            />
            <FileUploadField label="STNK Image" id="stnk_url" fileType="stnk" />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stnk_expiry" className="text-right">
                STNK Expiry
              </Label>
              <Input
                id="stnk_expiry"
                name="stnk_expiry"
                type="date"
                value={formData.stnk_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax_expiry" className="text-right">
                Tax Expiry
              </Label>
              <Input
                id="tax_expiry"
                name="tax_expiry"
                type="date"
                value={formData.tax_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_active" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active === true}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {formData.is_active
                    ? "Car is active and available for rental"
                    : "Car is suspended and not available for rental"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCar}>Add Car</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Car Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Car</DialogTitle>
            <DialogDescription>Update the car's information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-make" className="text-right">
                Make
              </Label>
              <Input
                id="edit-make"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-model" className="text-right">
                Model
              </Label>
              <Input
                id="edit-model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-year" className="text-right">
                Year
              </Label>
              <Input
                id="edit-year"
                name="year"
                type="number"
                value={formData.year}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-license_plate" className="text-right">
                License Plate
              </Label>
              <Input
                id="edit-license_plate"
                name="license_plate"
                value={formData.license_plate}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-color" className="text-right">
                Color
              </Label>
              <Input
                id="edit-color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Status
              </Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-daily_rate" className="text-right">
                Price
              </Label>
              <Input
                id="edit-daily_rate"
                name="daily_rate"
                type="number"
                value={formData.daily_rate}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Enter daily rate (numbers only)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mileage" className="text-right">
                Mileage
              </Label>
              <Input
                id="edit-mileage"
                name="mileage"
                type="number"
                value={formData.mileage}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-fuel_type" className="text-right">
                Fuel Type
              </Label>
              <Input
                id="edit-fuel_type"
                name="fuel_type"
                value={formData.fuel_type}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-transmission" className="text-right">
                Transmission
              </Label>
              <Input
                id="edit-transmission"
                name="transmission"
                value={formData.transmission}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                Category
              </Label>
              <Input
                id="edit-category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-vehicle_type_id" className="text-right">
                Vehicle Type
              </Label>
              <select
                id="edit-vehicle_type_id"
                name="vehicle_type_id"
                value={formData.vehicle_type_id}
                onChange={handleSelectChange}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a vehicle type</option>
                {vehicleTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-seats" className="text-right">
                Seats
              </Label>
              <Input
                id="edit-seats"
                name="seats"
                type="number"
                value={formData.seats}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <FileUploadField
              label="Car Image"
              id="edit-image_url"
              fileType="image"
            />
            <FileUploadField
              label="STNK Image"
              id="edit-stnk_url"
              fileType="stnk"
            />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-tax_expiry" className="text-right">
                Tax Expiry
              </Label>
              <Input
                id="edit-tax_expiry"
                name="tax_expiry"
                type="date"
                value={formData.tax_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-is_active" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  name="is_active"
                  checked={formData.is_active === true}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {formData.is_active
                    ? "Car is active and available for rental"
                    : "Car is suspended and not available for rental"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedCar(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCar}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Car Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the car
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vehicle Types Management Dialog */}
      <Dialog
        open={isVehicleTypeDialogOpen}
        onOpenChange={setIsVehicleTypeDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Vehicle Types</DialogTitle>
            <DialogDescription>
              Add, edit, or delete vehicle types that can be assigned to cars.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Vehicle Types</h3>
              <Button onClick={() => setIsAddVehicleTypeDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Type
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4">
                      No vehicle types found. Add your first one!
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicleTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>{type.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditVehicleTypeDialog(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {userRole === "Super Admin" && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => openDeleteVehicleTypeDialog(type)}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVehicleTypeDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Type Dialog */}
      <Dialog
        open={isAddVehicleTypeDialogOpen}
        onOpenChange={setIsAddVehicleTypeDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vehicle Type</DialogTitle>
            <DialogDescription>
              Create a new vehicle type that can be assigned to cars.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type-name" className="text-right">
                Name
              </Label>
              <Input
                id="type-name"
                name="name"
                value={vehicleTypeFormData.name}
                onChange={handleVehicleTypeInputChange}
                className="col-span-3"
                placeholder="e.g., SUV, Sedan, Truck"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddVehicleTypeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddVehicleType}>Add Type</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Type Dialog */}
      <Dialog
        open={isEditVehicleTypeDialogOpen}
        onOpenChange={setIsEditVehicleTypeDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vehicle Type</DialogTitle>
            <DialogDescription>Update the vehicle type name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-type-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-type-name"
                name="name"
                value={vehicleTypeFormData.name}
                onChange={handleVehicleTypeInputChange}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditVehicleTypeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditVehicleType}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vehicle Type Dialog */}
      <AlertDialog
        open={isDeleteVehicleTypeDialogOpen}
        onOpenChange={setIsDeleteVehicleTypeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              vehicle type. Note that you cannot delete a type that is currently
              assigned to any cars.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsDeleteVehicleTypeDialogOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicleType}
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

export default CarsManagement;