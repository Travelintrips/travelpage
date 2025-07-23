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

interface Customer {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  selfie_url: string | null;
  ktp_paspor_url: string | null;
}

const CustomerManagement = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    full_name: "",
    email: "",
    phone: "",
    address: "",
    selfie_url: "",
    ktp_paspor_url: "",
  });
  const [uploadLoading, setUploadLoading] = useState({
    selfie: false,
    ktp_paspor: false,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      ...(name === "name" ? { full_name: value } : {}),
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
      // Ensure full_name is set to name if not provided
      const customerData = {
        ...formData,
        full_name: formData.full_name || formData.name,
      };

      const { data, error } = await supabase
        .from("customers")
        .insert([customerData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomers([data[0], ...customers]);
      }

      setIsAddDialogOpen(false);
      resetFormData();
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      full_name: "",
      email: "",
      phone: "",
      address: "",
      selfie_url: "",
      ktp_paspor_url: "",
    });
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const { data, error } = await supabase
        .from("customers")
        .update(formData)
        .eq("id", selectedCustomer.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const updatedCustomers = customers.map((customer) =>
          customer.id === selectedCustomer.id ? data[0] : customer,
        );
        setCustomers(updatedCustomers);
      } else {
        // Fallback to local update if no data returned
        const updatedCustomers = customers.map((customer) =>
          customer.id === selectedCustomer.id
            ? { ...customer, ...formData }
            : customer,
        );
        setCustomers(updatedCustomers);
      }

      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
      resetFormData();
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
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      full_name: customer.name, // Set full_name to match name initially
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      selfie_url: customer.selfie_url || "",
      ktp_paspor_url: customer.ktp_paspor_url || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (customer.phone || "").includes(searchTerm) ||
      (customer.address?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
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
                        {customer.name}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
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
          <Button variant="outline" onClick={fetchCustomers}>
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new customer to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
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
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer}>Add Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
              <Label htmlFor="edit-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone"
                name="phone"
                value={formData.phone}
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
              onClick={() => setIsEditDialogOpen(false)}
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
        onOpenChange={setIsDeleteDialogOpen}
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
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
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
