import React, { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import {
  User,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
  Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";

interface Customer {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  selfie_url: string | null;
  ktp_paspor_url: string | null;
}

const CustomerManagement = () => {
  const { userRole, isAuthenticated, isSessionReady, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(() => {
    // ✅ HANYA loading true jika tidak ada cached data
    const cachedData = sessionStorage.getItem('customerManagement_cachedData');
    return !cachedData;
  });
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Persist dialog states to prevent loss on tab switch
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(() => {
    return sessionStorage.getItem('customerManagement_addDialogOpen') === 'true';
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(() => {
    return sessionStorage.getItem('customerManagement_editDialogOpen') === 'true';
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(() => {
    return sessionStorage.getItem('customerManagement_deleteDialogOpen') === 'true';
  });
  
  // Persist selected customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    const stored = sessionStorage.getItem('customerManagement_selectedCustomer');
    return stored ? JSON.parse(stored) : null;
  });
  
  // Persist form data
  const [formData, setFormData] = useState(() => {
    const stored = sessionStorage.getItem('customerManagement_formData');
    return stored ? JSON.parse(stored) : {
      full_name: "",
      email: "",
      phone_number: "",
      address: "",
      selfie_url: "",
      ktp_paspor_url: "",
    };
  });
  
  const [uploadLoading, setUploadLoading] = useState({
    selfie: false,
    ktp_paspor: false,
  });

  // FIXED: Fetch data when auth is ready and authenticated
  useEffect(() => {
    if (isAuthenticated && isSessionReady && !authLoading) {
      console.log('[CustomerManagement] Auth ready, fetching customer data...');
      
      // ✅ Load cached data first untuk mencegah loading screen
      const cachedData = sessionStorage.getItem('customerManagement_cachedData');
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          setCustomers(parsedData);
          setLoading(false);
          console.log('[CustomerManagement] Loaded cached data, NO LOADING SCREEN');
          
          // Background refresh to get latest data
          setTimeout(() => fetchCustomers(true), 100);
          return;
        } catch (error) {
          console.warn('[CustomerManagement] Failed to parse cached data:', error);
        }
      }

      // Fetch data if no cache
      fetchCustomers();
    } else if (!authLoading && !isAuthenticated) {
      // Not authenticated, clear loading state but don't reset data
      setLoading(false);
    }
  }, [isAuthenticated, isSessionReady, authLoading]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && isSessionReady && !authLoading) {
        console.log('[CustomerManagement] Tab became visible, refetching customer data...');
        
        // Always do background refresh when tab becomes visible
        fetchCustomers(true); // Background refresh without loading spinner
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isSessionReady, authLoading]);

  // Persist dialog states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('customerManagement_addDialogOpen', isAddDialogOpen.toString());
  }, [isAddDialogOpen]);

  useEffect(() => {
    sessionStorage.setItem('customerManagement_editDialogOpen', isEditDialogOpen.toString());
  }, [isEditDialogOpen]);

  useEffect(() => {
    sessionStorage.setItem('customerManagement_deleteDialogOpen', isDeleteDialogOpen.toString());
  }, [isDeleteDialogOpen]);

  useEffect(() => {
    sessionStorage.setItem('customerManagement_selectedCustomer', JSON.stringify(selectedCustomer));
  }, [selectedCustomer]);

  useEffect(() => {
    sessionStorage.setItem('customerManagement_formData', JSON.stringify(formData));
  }, [formData]);

  // Cleanup sessionStorage on component unmount
  useEffect(() => {
    return () => {
      // Only clear dialog states if no dialogs are open
      if (!isAddDialogOpen && !isEditDialogOpen && !isDeleteDialogOpen) {
        clearDialogStates();
      }
    };
  }, []);

  // FIXED: Modified fetchCustomers with proper loading state management
  const fetchCustomers = async (isBackgroundRefresh = false) => {
    // Don't fetch if not authenticated
    if (!isAuthenticated || !isSessionReady || authLoading) {
      console.log('[CustomerManagement] Skipping fetch - auth not ready');
      return;
    }

    try {
      // Only show loading spinner for initial load, not background refresh
      if (!isBackgroundRefresh && customers.length === 0) {
        setLoading(true);
      } else if (isBackgroundRefresh) {
        setBackgroundRefreshing(true);
      }

      console.log('[CustomerManagement] Starting customer data fetch...');

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
      
      // Cache the data for future use
      sessionStorage.setItem('customerManagement_cachedData', JSON.stringify(data || []));
      
      console.log('[CustomerManagement] Customer data fetch completed successfully');
    } catch (error) {
      console.error("[CustomerManagement] Error fetching customers:", error);
      
      // Don't reset data to empty on error, just log the error
      console.warn("[CustomerManagement] Keeping existing data due to fetch error");
    } finally {
      // CRITICAL: Always reset loading states
      setLoading(false);
      setBackgroundRefreshing(false);
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
    fileType: "selfie" | "ktp_paspor",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Set loading state for specific file type
      setUploadLoading((prev) => ({ ...prev, [fileType]: true }));

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${fileType}_${Date.now()}.${fileExt}`;
      const filePath = `customers/${fileType}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("customers")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("customers")
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

  const handleAddCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([formData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newCustomers = [data[0], ...customers];
        setCustomers(newCustomers);
        // Update cache with new data
        sessionStorage.setItem('customerManagement_cachedData', JSON.stringify(newCustomers));
      }

      setIsAddDialogOpen(false);
      resetFormData();
      clearDialogStates();
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  const resetFormData = () => {
    const emptyFormData = {
      full_name: "",
      email: "",
      phone_number: "",
      address: "",
      selfie_url: "",
      ktp_paspor_url: "",
    };
    setFormData(emptyFormData);
    sessionStorage.setItem('customerManagement_formData', JSON.stringify(emptyFormData));
  };

  const clearDialogStates = () => {
    sessionStorage.removeItem('customerManagement_addDialogOpen');
    sessionStorage.removeItem('customerManagement_editDialogOpen');
    sessionStorage.removeItem('customerManagement_deleteDialogOpen');
    sessionStorage.removeItem('customerManagement_selectedCustomer');
    sessionStorage.removeItem('customerManagement_formData');
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      // Update customers table
      const { data, error } = await supabase
        .from("customers")
        .update(formData)
        .eq("id", selectedCustomer.id)
        .select("id, user_id, full_name") // ambil user_id untuk sync
        .single();

      if (error) throw error;

      // Pastikan ada user_id di customers
      if (data?.user_id) {
        const { error: userError } = await supabase
          .from("users")
          .update({ full_name: formData.full_name })
          .eq("id", data.user_id);

        if (userError) throw userError;
      }

      // Update state local customers
      const updatedCustomers = customers.map((customer) =>
        customer.id === selectedCustomer.id ? { ...customer, ...formData } : customer
      );
      setCustomers(updatedCustomers);
      
      // Update cache with new data
      sessionStorage.setItem('customerManagement_cachedData', JSON.stringify(updatedCustomers));

      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
      resetFormData();
      clearDialogStates();
    } catch (error) {
      console.error("Error updating customer:", error);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      const filteredCustomers = customers.filter(
        (customer) => customer.id !== selectedCustomer.id,
      );

      setCustomers(filteredCustomers);
      // Update cache with new data
      sessionStorage.setItem('customerManagement_cachedData', JSON.stringify(filteredCustomers));
      
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
      clearDialogStates();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      full_name: customer.full_name ?? "",
      email: customer.email ?? "",
      phone_number: customer.phone_number ?? "",
      address: customer.address ?? "",
      selfie_url: customer.selfie_url ?? "",
      ktp_paspor_url: customer.ktp_paspor_url ?? "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const filteredCustomers = customers.filter((customer) => {
    const fullName = customer.full_name?.toLowerCase() ?? "";
    const email = customer.email?.toLowerCase() ?? "";
    const phone = customer.phone_number ?? "";
    const address = customer.address?.toLowerCase() ?? "";
    const search = searchTerm.toLowerCase();

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      phone.includes(searchTerm) ||
      address.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        {userRole !== "Staff" && userRole !== "Staff Traffic" && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Manage your customer database</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading customers...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.full_name}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone_number}</TableCell>
                      <TableCell>{customer.address}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {customer.selfie_url && (
                            <a
                              href={customer.selfie_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Selfie"
                            >
                              <img
                                src={customer.selfie_url}
                                alt="Selfie"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            </a>
                          )}
                          {customer.ktp_paspor_url && (
                            <a
                              href={customer.ktp_paspor_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="KTP/Paspor"
                            >
                              <img
                                src={customer.ktp_paspor_url}
                                alt="KTP/Paspor"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {userRole !== "Staff" && userRole !== "Staff Traffic" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => openDeleteDialog(customer)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
          <Button variant="outline" onClick={() => fetchCustomers()}>
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          resetFormData();
          clearDialogStates();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new customer to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="full_name" className="text-right">
                Name
              </Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone_number" className="text-right">
                Phone
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="selfie_url" className="text-right">
                Selfie
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="selfie_url"
                  name="selfie_url"
                  value={formData.selfie_url}
                  onChange={handleInputChange}
                  className="flex-1"
                  placeholder="Enter selfie URL or upload"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    id="selfie-upload"
                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    onChange={(e) => handleFileUpload(e, "selfie")}
                    disabled={uploadLoading.selfie}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploadLoading.selfie}
                  >
                    {uploadLoading.selfie ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.selfie_url && (
                  <a
                    href={formData.selfie_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2"
                  >
                    <Button type="button" variant="ghost" size="icon">
                      <img
                        src={formData.selfie_url}
                        alt="Selfie"
                        className="h-8 w-8 object-cover rounded-full"
                      />
                    </Button>
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ktp_paspor_url" className="text-right">
                KTP/Paspor
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="ktp_paspor_url"
                  name="ktp_paspor_url"
                  value={formData.ktp_paspor_url}
                  onChange={handleInputChange}
                  className="flex-1"
                  placeholder="Enter KTP/Paspor URL or upload"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    id="ktp-paspor-upload"
                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    onChange={(e) => handleFileUpload(e, "ktp_paspor")}
                    disabled={uploadLoading.ktp_paspor}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploadLoading.ktp_paspor}
                  >
                    {uploadLoading.ktp_paspor ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.ktp_paspor_url && (
                  <a
                    href={formData.ktp_paspor_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2"
                  >
                    <Button type="button" variant="ghost" size="icon">
                      <img
                        src={formData.ktp_paspor_url}
                        alt="KTP/Paspor"
                        className="h-8 w-8 object-cover rounded"
                      />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetFormData();
              clearDialogStates();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer}>Add Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setSelectedCustomer(null);
          resetFormData();
          clearDialogStates();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                name="full_name"
                value={formData.full_name}
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
              <Label htmlFor="edit-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-address" className="text-right">
                Address
              </Label>
              <Input
                id="edit-address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-selfie_url" className="text-right">
                Selfie
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="edit-selfie_url"
                  name="selfie_url"
                  value={formData.selfie_url}
                  onChange={handleInputChange}
                  className="flex-1"
                  placeholder="Enter selfie URL or upload"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    id="edit-selfie-upload"
                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    onChange={(e) => handleFileUpload(e, "selfie")}
                    disabled={uploadLoading.selfie}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploadLoading.selfie}
                  >
                    {uploadLoading.selfie ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.selfie_url && (
                  <a
                    href={formData.selfie_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2"
                  >
                    <Button type="button" variant="ghost" size="icon">
                      <img
                        src={formData.selfie_url}
                        alt="Selfie"
                        className="h-8 w-8 object-cover rounded-full"
                      />
                    </Button>
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-ktp_paspor_url" className="text-right">
                KTP/Paspor
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="edit-ktp_paspor_url"
                  name="ktp_paspor_url"
                  value={formData.ktp_paspor_url}
                  onChange={handleInputChange}
                  className="flex-1"
                  placeholder="Enter KTP/Paspor URL or upload"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    id="edit-ktp-paspor-upload"
                    className="absolute inset-0 opacity-0 w-full cursor-pointer"
                    onChange={(e) => handleFileUpload(e, "ktp_paspor")}
                    disabled={uploadLoading.ktp_paspor}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploadLoading.ktp_paspor}
                  >
                    {uploadLoading.ktp_paspor ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.ktp_paspor_url && (
                  <a
                    href={formData.ktp_paspor_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2"
                  >
                    <Button type="button" variant="ghost" size="icon">
                      <img
                        src={formData.ktp_paspor_url}
                        alt="KTP/Paspor"
                        className="h-8 w-8 object-cover rounded"
                      />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedCustomer(null);
                resetFormData();
                clearDialogStates();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCustomer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setSelectedCustomer(null);
            clearDialogStates();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              customer and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedCustomer(null);
              clearDialogStates();
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
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

export default CustomerManagement;